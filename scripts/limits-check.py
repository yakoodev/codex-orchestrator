#!/usr/bin/env python3
"""Codex/ChatGPT limits inspector for one or many CODEX_HOME directories.

Primary source (exact, real-time): codex app-server RPC method `account/rateLimits/read`.
Fallback sources:
- latest `codex.rate_limits` event from local sqlite logs;
- latest explicit "You've hit your usage limit" log row.
Optional:
- live probe via short `codex exec`.
"""

import argparse
import datetime as dt
import json
import os
import queue
import re
import subprocess
import sys
import threading
import time
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


def compute_reset_after_seconds(resets_at: Any, now_ts: int) -> Optional[int]:
    if resets_at is None:
        return None
    try:
        value = int(resets_at)
    except Exception:
        return None
    delta = value - now_ts
    if delta < 0:
        return 0
    return delta


def normalize_window(win: Any, now_ts: int) -> Dict[str, Any]:
    if not isinstance(win, dict):
        return {
            "used_percent": None,
            "window_minutes": None,
            "reset_at": None,
            "reset_after_seconds": None,
        }

    used_percent = win.get("usedPercent")
    if used_percent is None:
        used_percent = win.get("used_percent")

    window_minutes = win.get("windowDurationMins")
    if window_minutes is None:
        window_minutes = win.get("window_minutes")

    reset_at = win.get("resetsAt")
    if reset_at is None:
        reset_at = win.get("reset_at")

    reset_after_seconds = win.get("reset_after_seconds")
    if reset_after_seconds is None:
        reset_after_seconds = compute_reset_after_seconds(reset_at, now_ts)

    return {
        "used_percent": used_percent,
        "window_minutes": window_minutes,
        "reset_at": reset_at,
        "reset_after_seconds": reset_after_seconds,
    }


def normalize_snapshot(snapshot: Any, source: str, captured_at: Optional[str]) -> Optional[Dict[str, Any]]:
    if not isinstance(snapshot, dict):
        return None

    now_ts = int(time.time())
    plan_type = snapshot.get("planType")
    if plan_type is None:
        plan_type = snapshot.get("plan_type")

    result = {
        "source": source,
        "captured_at": captured_at,
        "plan_type": plan_type,
        "limit_id": snapshot.get("limitId", snapshot.get("limit_id")),
        "limit_name": snapshot.get("limitName", snapshot.get("limit_name")),
        "allowed": snapshot.get("allowed"),
        "limit_reached": snapshot.get("limit_reached", snapshot.get("limitReached")),
        "credits": snapshot.get("credits"),
        "primary": normalize_window(snapshot.get("primary"), now_ts),
        "secondary": normalize_window(snapshot.get("secondary"), now_ts),
    }
    return result


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
            "ORDER BY id DESC LIMIT 500"
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


def run_app_server_rate_limits(codex_home: str, timeout_sec: int) -> Dict[str, Any]:
    env = os.environ.copy()
    env["CODEX_HOME"] = codex_home

    cmd = ["codex", "app-server"]
    if os.name == "nt":
        cmd = ["cmd", "/c"] + cmd

    try:
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            universal_newlines=True,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError:
        return {
            "ok": False,
            "error": "codex command not found in PATH",
        }
    except Exception as exc:
        return {
            "ok": False,
            "error": f"Failed to start codex app-server: {exc}",
        }

    q = queue.Queue()  # type: queue.Queue

    def _reader(stream: Any, channel: str) -> None:
        try:
            while True:
                line = stream.readline()
                if not line:
                    break
                q.put((channel, line.rstrip("\r\n")))
        except Exception as exc:
            q.put((channel, f"reader_error:{exc}"))

    threads = [
        threading.Thread(target=_reader, args=(proc.stdout, "stdout")),
        threading.Thread(target=_reader, args=(proc.stderr, "stderr")),
    ]
    for th in threads:
        th.daemon = True
        th.start()

    requests = [
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {"clientInfo": {"name": "limits-check", "version": "1.0"}},
        },
        {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "account/rateLimits/read",
        },
    ]

    try:
        for item in requests:
            if proc.stdin is None:
                return {"ok": False, "error": "codex app-server stdin is unavailable"}
            proc.stdin.write(json.dumps(item, ensure_ascii=False) + "\n")
            proc.stdin.flush()
    except Exception as exc:
        try:
            proc.terminate()
        except Exception:
            pass
        return {"ok": False, "error": f"Failed to write request to app-server: {exc}"}

    response_obj = None
    stderr_lines: List[str] = []
    deadline = time.time() + max(5, timeout_sec)

    while time.time() < deadline:
        try:
            channel, line = q.get(timeout=0.25)
        except queue.Empty:
            continue

        if channel == "stderr":
            if line:
                stderr_lines.append(line)
            continue

        if not line:
            continue

        try:
            msg = json.loads(line)
        except Exception:
            continue

        if isinstance(msg, dict) and msg.get("id") == 2:
            response_obj = msg
            break

    try:
        proc.terminate()
        proc.wait(timeout=2)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass

    if response_obj is None:
        return {
            "ok": False,
            "error": "Timeout waiting for account/rateLimits/read response",
            "stderr": stderr_lines[:6],
        }

    if "error" in response_obj:
        return {
            "ok": False,
            "error": f"app-server returned error: {response_obj.get('error')}",
            "stderr": stderr_lines[:6],
        }

    result = response_obj.get("result")
    if not isinstance(result, dict):
        return {
            "ok": False,
            "error": "Unexpected account/rateLimits/read result shape",
            "stderr": stderr_lines[:6],
        }

    rate_limits = normalize_snapshot(
        result.get("rateLimits"),
        source="app_server_rpc",
        captured_at=utc_iso(int(time.time())),
    )
    if rate_limits is None:
        return {
            "ok": False,
            "error": "rateLimits is missing in app-server response",
            "stderr": stderr_lines[:6],
        }

    by_limit_id_raw = result.get("rateLimitsByLimitId")
    by_limit_id: Optional[Dict[str, Dict[str, Any]]] = None
    if isinstance(by_limit_id_raw, dict):
        by_limit_id = {}
        for key, snap in by_limit_id_raw.items():
            normalized = normalize_snapshot(
                snap,
                source="app_server_rpc",
                captured_at=rate_limits.get("captured_at"),
            )
            if normalized is not None:
                by_limit_id[key] = normalized

    return {
        "ok": True,
        "rate_limits": rate_limits,
        "rate_limits_by_limit_id": by_limit_id,
        "stderr": stderr_lines[:6],
    }


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


def inspect_home(
    codex_home: str,
    enable_probe: bool,
    probe_timeout: int,
    probe_cwd: str,
    rpc_timeout: int,
) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "codex_home": codex_home,
        "exists": os.path.isdir(codex_home),
        "auth_json_exists": os.path.isfile(os.path.join(codex_home, "auth.json")),
    }

    if not result["exists"]:
        result["error"] = "CODEX_HOME does not exist"
        return result

    # Primary path: exact real-time snapshot from codex app-server.
    rpc_result = run_app_server_rate_limits(codex_home, timeout_sec=rpc_timeout)
    result["app_server_rpc"] = rpc_result
    if rpc_result.get("ok"):
        result["rate_limits"] = rpc_result.get("rate_limits")
        if rpc_result.get("rate_limits_by_limit_id") is not None:
            result["rate_limits_by_limit_id"] = rpc_result.get("rate_limits_by_limit_id")

    sqlite_candidates = [
        os.path.join(codex_home, "logs_1.sqlite"),
        os.path.join(codex_home, "state_5.sqlite"),
    ]
    found_files = [path for path in sqlite_candidates if os.path.isfile(path)]
    result["sqlite_files"] = found_files

    latest_rate_event = None
    latest_usage_hit = None

    for sqlite_path in found_files:
        rate_event = find_latest_rate_limits_event(sqlite_path)
        if rate_event:
            if latest_rate_event is None or (
                (rate_event.get("log_id") or 0) > (latest_rate_event.get("log_id") or 0)
            ):
                latest_rate_event = rate_event

        usage_hit = find_latest_usage_limit_hit(sqlite_path)
        if usage_hit:
            if latest_usage_hit is None or (
                (usage_hit.get("log_id") or 0) > (latest_usage_hit.get("log_id") or 0)
            ):
                latest_usage_hit = usage_hit

    # Fallback: if RPC path failed, use latest local codex.rate_limits event if available.
    if "rate_limits" not in result and latest_rate_event:
        event = latest_rate_event["event"]
        normalized = normalize_snapshot(
            event.get("rate_limits"),
            source="sqlite_event_fallback",
            captured_at=latest_rate_event.get("timestamp"),
        )
        if normalized is not None:
            if normalized.get("plan_type") is None:
                normalized["plan_type"] = event.get("plan_type")
            result["rate_limits"] = normalized
            result["rate_limits"]["source_sqlite"] = latest_rate_event["sqlite_path"]
            result["rate_limits"]["source_log_id"] = latest_rate_event["log_id"]

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
    print("\n=== {} ===".format(home))
    if not result.get("exists"):
        print("status: ERROR (home not found)")
        return

    print("auth.json: {}".format("yes" if result.get("auth_json_exists") else "no"))

    rpc = result.get("app_server_rpc") or {}
    if rpc.get("ok"):
        print("app_server_rpc: OK (account/rateLimits/read)")
    else:
        print("app_server_rpc: FAIL ({})".format(rpc.get("error")))

    rate_limits = result.get("rate_limits")
    if rate_limits:
        primary = rate_limits.get("primary") or {}
        secondary = rate_limits.get("secondary") or {}
        print(
            "rate_limits: "
            "source={} plan={} limit_id={} captured_at={}".format(
                rate_limits.get("source"),
                rate_limits.get("plan_type"),
                rate_limits.get("limit_id"),
                rate_limits.get("captured_at"),
            )
        )
        print(
            "primary: used={}%, window={}m, reset_after={}s".format(
                primary.get("used_percent"),
                primary.get("window_minutes"),
                primary.get("reset_after_seconds"),
            )
        )
        print(
            "secondary: used={}%, window={}m, reset_after={}s".format(
                secondary.get("used_percent"),
                secondary.get("window_minutes"),
                secondary.get("reset_after_seconds"),
            )
        )
    else:
        print("rate_limits: unavailable")

    by_limit_id = result.get("rate_limits_by_limit_id")
    if isinstance(by_limit_id, dict) and by_limit_id:
        keys = sorted(by_limit_id.keys())
        print("rate_limits_by_limit_id: {}".format(", ".join(keys)))

    usage_hit = result.get("latest_usage_limit_hit")
    if usage_hit:
        print(
            "latest_usage_limit_hit: captured_at={} retry_hint={}".format(
                usage_hit.get("captured_at"),
                usage_hit.get("retry_hint"),
            )
        )
    else:
        print("latest_usage_limit_hit: not found")

    probe = result.get("live_probe")
    if probe:
        print(
            "live_probe: status={} exit_code={} summary={}".format(
                probe.get("status"),
                probe.get("exit_code"),
                probe.get("summary"),
            )
        )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inspect Codex/ChatGPT usage limits from CODEX_HOME via app-server RPC"
    )
    parser.add_argument(
        "--home",
        action="append",
        dest="homes",
        default=[],
        help="Path to CODEX_HOME (repeatable). If omitted, uses CODEX_HOME env or ~/.codex",
    )
    parser.add_argument(
        "--rpc-timeout",
        type=int,
        default=15,
        help="Timeout in seconds for app-server rate-limits RPC (default: 15)",
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
                rpc_timeout=max(5, args.rpc_timeout),
            )
        )

    if args.json:
        print(json.dumps({"items": all_results}, ensure_ascii=False, indent=2))
        return 0

    print("Codex limits check:")
    print("- primary source: app-server RPC account/rateLimits/read (exact snapshot)")
    print("- fallback source: sqlite codex.rate_limits event/logs")
    for item in all_results:
        render_human(item)

    return 0


if __name__ == "__main__":
    sys.exit(main())
