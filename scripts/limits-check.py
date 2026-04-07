#!/usr/bin/env python3
"""Best-effort ChatGPT/Codex limits inspector for one or many CODEX_HOME directories.

Sources:
1) Latest codex.rate_limits message from local sqlite logs (if present).
2) Latest explicit "You've hit your usage limit" message from sqlite logs.
3) Optional live probe (short codex exec) to detect immediate hard-limit state.
"""

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
from typing import Any, Dict, List, Optional, Tuple

try:
    import sqlite3
except Exception as exc:  # pragma: no cover
    print("sqlite3 is required:", exc, file=sys.stderr)
    sys.exit(2)


RATE_LIMITS_ANCHOR = '{"type":"codex.rate_limits"'
USAGE_LIMIT_PHRASE = "You've hit your usage limit"


def utc_iso(ts: Any) -> Optional[str]:
    try:
        return dt.datetime.utcfromtimestamp(int(ts)).isoformat() + "Z"
    except Exception:
        return None


def extract_json_object(text: str, anchor: str) -> Optional[Dict[str, Any]]:
    start = text.find(anchor)
    if start < 0:
        return None

    candidate = text[start:]
    depth = 0
    in_string = False
    escape = False
    begun = False

    for i, ch in enumerate(candidate):
        if not begun:
            if ch == "{":
                begun = True
                depth = 1
            continue

        if escape:
            escape = False
            continue

        if ch == "\\":
            escape = True
            continue

        if ch == '"':
            in_string = not in_string
            continue

        if in_string:
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                raw = candidate[: i + 1]
                try:
                    parsed = json.loads(raw)
                except Exception:
                    return None
                if isinstance(parsed, dict):
                    return parsed
                return None

    return None


def get_logs_body_column(conn: sqlite3.Connection) -> Optional[str]:
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='logs'")
    if cur.fetchone() is None:
        return None

    cur.execute("PRAGMA table_info(logs)")
    cols = [row[1] for row in cur.fetchall()]
    if "feedback_log_body" in cols:
        return "feedback_log_body"
    if "message" in cols:
        return "message"
    return None


def find_latest_rate_limits_event(sqlite_path: str) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(sqlite_path)
    try:
        body_col = get_logs_body_column(conn)
        if not body_col:
            return None

        cur = conn.cursor()
        query = (
            "SELECT id, ts, target, {body} "
            "FROM logs "
            "WHERE {body} LIKE '%codex.rate_limits%' "
            "ORDER BY id DESC LIMIT 300"
        ).format(body=body_col)
        cur.execute(query)

        for log_id, ts, target, body in cur.fetchall():
            if not isinstance(body, str):
                continue
            parsed = extract_json_object(body, RATE_LIMITS_ANCHOR)
            if parsed is None:
                continue
            return {
                "sqlite_path": sqlite_path,
                "log_id": log_id,
                "timestamp": utc_iso(ts),
                "target": target,
                "event": parsed,
            }
        return None
    finally:
        conn.close()


def find_latest_usage_limit_hit(sqlite_path: str) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(sqlite_path)
    try:
        body_col = get_logs_body_column(conn)
        if not body_col:
            return None

        cur = conn.cursor()
        query = (
            "SELECT id, ts, target, {body} "
            "FROM logs "
            "WHERE {body} LIKE ? "
            "ORDER BY id DESC LIMIT 1"
        ).format(body=body_col)
        cur.execute(query, ("%" + USAGE_LIMIT_PHRASE + "%",))
        row = cur.fetchone()
        if row is None:
            return None

        log_id, ts, target, body = row
        message = body if isinstance(body, str) else ""
        retry_match = re.search(r"try again at (.+?)\.", message, flags=re.IGNORECASE)
        return {
            "sqlite_path": sqlite_path,
            "log_id": log_id,
            "timestamp": utc_iso(ts),
            "target": target,
            "retry_hint": retry_match.group(1) if retry_match else None,
            "message": message[:500],
        }
    finally:
        conn.close()


def run_live_probe(codex_home: str, cwd: str, timeout_sec: int) -> Dict[str, Any]:
    env = os.environ.copy()
    env["CODEX_HOME"] = codex_home
    cmd = [
        "codex",
        "exec",
        "Ответь одним словом: OK",
        "--json",
        "--skip-git-repo-check",
        "-C",
        cwd,
        "-s",
        "workspace-write",
        "-c",
        'approval_policy="never"',
    ]
    if os.name == "nt":
        cmd = ["cmd", "/c"] + cmd

    try:
        completed = subprocess.run(
            cmd,
            env=env,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_sec,
            check=False,
            universal_newlines=True,
            encoding="utf-8",
            errors="replace",
        )
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "exit_code": None,
            "summary": f"Probe timeout after {timeout_sec}s",
        }
    except FileNotFoundError:
        return {
            "status": "error",
            "exit_code": None,
            "summary": "codex command not found in PATH",
        }

    merged = "\n".join([completed.stdout or "", completed.stderr or ""])
    merged_lower = merged.lower()

    if USAGE_LIMIT_PHRASE.lower() in merged_lower:
        status = "hard_limited"
        summary = "Live probe returned usage limit error"
    elif completed.returncode == 0 and '"type":"turn.completed"' in merged:
        status = "ok"
        summary = "Live probe completed successfully"
    elif completed.returncode == 0:
        status = "ok_partial"
        summary = "Probe exited 0 but turn.completed event not detected"
    else:
        status = "error"
        summary = f"Probe failed with exit code {completed.returncode}"

    return {
        "status": status,
        "exit_code": completed.returncode,
        "summary": summary,
    }


def inspect_home(codex_home: str, enable_probe: bool, probe_timeout: int, probe_cwd: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "codex_home": codex_home,
        "exists": os.path.isdir(codex_home),
        "auth_json_exists": os.path.isfile(os.path.join(codex_home, "auth.json")),
    }

    if not result["exists"]:
        result["error"] = "CODEX_HOME does not exist"
        return result

    sqlite_candidates = [
        os.path.join(codex_home, "logs_1.sqlite"),
        os.path.join(codex_home, "state_5.sqlite"),
    ]

    found_files = [path for path in sqlite_candidates if os.path.isfile(path)]
    result["sqlite_files"] = found_files

    latest_rate = None
    latest_usage_hit = None

    for sqlite_path in found_files:
        rate_event = find_latest_rate_limits_event(sqlite_path)
        if rate_event:
            if latest_rate is None or (
                (rate_event.get("log_id") or 0) > (latest_rate.get("log_id") or 0)
            ):
                latest_rate = rate_event

        usage_hit = find_latest_usage_limit_hit(sqlite_path)
        if usage_hit:
            if latest_usage_hit is None or (
                (usage_hit.get("log_id") or 0) > (latest_usage_hit.get("log_id") or 0)
            ):
                latest_usage_hit = usage_hit

    if latest_rate:
        event = latest_rate["event"]
        rate_limits = event.get("rate_limits") or {}
        primary = rate_limits.get("primary") or {}
        secondary = rate_limits.get("secondary") or {}
        result["rate_limits"] = {
            "source_sqlite": latest_rate["sqlite_path"],
            "source_log_id": latest_rate["log_id"],
            "captured_at": latest_rate["timestamp"],
            "plan_type": event.get("plan_type"),
            "allowed": rate_limits.get("allowed"),
            "limit_reached": rate_limits.get("limit_reached"),
            "primary": {
                "used_percent": primary.get("used_percent"),
                "window_minutes": primary.get("window_minutes"),
                "reset_after_seconds": primary.get("reset_after_seconds"),
                "reset_at": primary.get("reset_at"),
            },
            "secondary": {
                "used_percent": secondary.get("used_percent"),
                "window_minutes": secondary.get("window_minutes"),
                "reset_after_seconds": secondary.get("reset_after_seconds"),
                "reset_at": secondary.get("reset_at"),
            },
        }

    if latest_usage_hit:
        result["latest_usage_limit_hit"] = {
            "source_sqlite": latest_usage_hit["sqlite_path"],
            "source_log_id": latest_usage_hit["log_id"],
            "captured_at": latest_usage_hit["timestamp"],
            "retry_hint": latest_usage_hit["retry_hint"],
            "message": latest_usage_hit["message"],
        }

    if enable_probe:
        result["live_probe"] = run_live_probe(codex_home, probe_cwd, probe_timeout)

    return result


def render_human(result: Dict[str, Any]) -> None:
    home = result.get("codex_home")
    print(f"\n=== {home} ===")
    if not result.get("exists"):
        print("status: ERROR (home not found)")
        return

    print(f"auth.json: {'yes' if result.get('auth_json_exists') else 'no'}")

    rate_limits = result.get("rate_limits")
    if rate_limits:
        primary = rate_limits.get("primary") or {}
        secondary = rate_limits.get("secondary") or {}
        print(
            "rate_limits: "
            f"plan={rate_limits.get('plan_type')} "
            f"allowed={rate_limits.get('allowed')} "
            f"limit_reached={rate_limits.get('limit_reached')} "
            f"captured_at={rate_limits.get('captured_at')}"
        )
        print(
            "primary: "
            f"used={primary.get('used_percent')}% "
            f"window={primary.get('window_minutes')}m "
            f"reset_after={primary.get('reset_after_seconds')}s"
        )
        print(
            "secondary: "
            f"used={secondary.get('used_percent')}% "
            f"window={secondary.get('window_minutes')}m "
            f"reset_after={secondary.get('reset_after_seconds')}s"
        )
    else:
        print("rate_limits: not found in local sqlite logs")

    usage_hit = result.get("latest_usage_limit_hit")
    if usage_hit:
        print(
            "latest_usage_limit_hit: "
            f"captured_at={usage_hit.get('captured_at')} "
            f"retry_hint={usage_hit.get('retry_hint')}"
        )
    else:
        print("latest_usage_limit_hit: not found")

    probe = result.get("live_probe")
    if probe:
        print(
            "live_probe: "
            f"status={probe.get('status')} "
            f"exit_code={probe.get('exit_code')} "
            f"summary={probe.get('summary')}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect Codex/ChatGPT usage limits from CODEX_HOME sqlite logs")
    parser.add_argument(
        "--home",
        action="append",
        dest="homes",
        default=[],
        help="Path to CODEX_HOME (repeatable). If omitted, uses CODEX_HOME env or ~/.codex",
    )
    parser.add_argument(
        "--probe",
        action="store_true",
        help="Run live codex exec probe for each home",
    )
    parser.add_argument(
        "--probe-timeout",
        type=int,
        default=90,
        help="Timeout in seconds for each live probe (default: 90)",
    )
    parser.add_argument(
        "--probe-cwd",
        default=os.getcwd(),
        help="Working directory for live probe (default: current directory)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON result",
    )

    args = parser.parse_args()

    homes: List[str] = list(args.homes)
    if not homes:
        env_home = os.environ.get("CODEX_HOME")
        if env_home:
            homes.append(env_home)
        else:
            homes.append(os.path.join(os.path.expanduser("~"), ".codex"))

    all_results = []
    for home in homes:
        all_results.append(
            inspect_home(
                codex_home=os.path.abspath(home),
                enable_probe=args.probe,
                probe_timeout=max(10, args.probe_timeout),
                probe_cwd=os.path.abspath(args.probe_cwd),
            )
        )

    if args.json:
        print(json.dumps({"items": all_results}, ensure_ascii=False, indent=2))
        return 0

    print("Codex limits check (best-effort):")
    print("- source: local sqlite logs + optional live probe")
    print("- note: exact current percentages exist only when codex.rate_limits event is present")
    for item in all_results:
        render_human(item)

    return 0


if __name__ == "__main__":
    sys.exit(main())
