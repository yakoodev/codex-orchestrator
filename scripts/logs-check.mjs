import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }

  return result;
}

function parseArgs(argv) {
  const result = {};
  for (const item of argv) {
    if (!item.startsWith("--")) {
      continue;
    }

    const equalsIndex = item.indexOf("=");
    if (equalsIndex < 0) {
      result[item.slice(2)] = "true";
      continue;
    }

    const key = item.slice(2, equalsIndex);
    const value = item.slice(equalsIndex + 1);
    result[key] = value;
  }

  return result;
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function runCommand(cwd, file, args) {
  try {
    const output = execFileSync(file, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { ok: true, output: output.trim() };
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr
        : "";
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, output: (stderr || message).trim() };
  }
}

function printSection(title) {
  process.stdout.write(`\n=== ${title} ===\n`);
}

function printResult(label, result) {
  const status = result.ok ? "OK" : "FAIL";
  process.stdout.write(`[${status}] ${label}\n`);
  if (result.output) {
    process.stdout.write(`${result.output}\n`);
  }
}

async function requestJson(url, headers = {}) {
  try {
    const response = await fetch(url, { headers });
    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    let parsed = null;

    if (text) {
      if (contentType.includes("application/json")) {
        parsed = JSON.parse(text);
      } else {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      body: parsed
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

async function main() {
  const cwd = process.cwd();
  const env = parseDotEnv(path.resolve(cwd, ".env"));
  const args = parseArgs(process.argv.slice(2));

  const tailLines = toPositiveInt(args.tail, 80);
  const streamEventsCount = toPositiveInt(args.events, 10);
  const switchEventsCount = toPositiveInt(args.switch, 10);

  const adminToken = process.env.ADMIN_TOKEN ?? env.ADMIN_TOKEN ?? "";
  const busPort = process.env.BUS_PORT ?? env.BUS_PORT ?? "8080";
  const lokiPort = process.env.LOKI_PORT ?? env.LOKI_PORT ?? "3100";
  const streamKey = process.env.REDIS_STREAM_KEY ?? env.REDIS_STREAM_KEY ?? "orchestrator.events";
  const baseUrl = process.env.API_BASE_URL ?? `http://127.0.0.1:${busPort}`;

  process.stdout.write("[logs-check] Multiple log channels probe\n");
  process.stdout.write(`[logs-check] Base URL: ${baseUrl}\n`);
  process.stdout.write(`[logs-check] Redis stream key: ${streamKey}\n`);

  printSection("Method 1: API health + switch events");
  const live = await requestJson(`${baseUrl}/health/live`);
  printResult("GET /health/live", {
    ok: live.ok,
    output: `status=${live.status} body=${JSON.stringify(live.body)}`
  });

  const ready = await requestJson(`${baseUrl}/health/ready`);
  printResult("GET /health/ready", {
    ok: ready.ok,
    output: `status=${ready.status} body=${JSON.stringify(ready.body)}`
  });

  if (!adminToken) {
    printResult("GET /api/auth-profiles/chatgpt/switch-events", {
      ok: false,
      output: "ADMIN_TOKEN missing in environment/.env"
    });
  } else {
    const switchEvents = await requestJson(`${baseUrl}/api/auth-profiles/chatgpt/switch-events`, {
      "X-Admin-Token": adminToken
    });
    const switchItems = Array.isArray(switchEvents.body?.items) ? switchEvents.body.items : [];
    const latest = switchItems.slice(0, switchEventsCount).map((item) => ({
      id: item.id,
      reason: item.reason,
      status: item.status,
      started_at: item.started_at,
      ended_at: item.ended_at
    }));

    printResult("GET /api/auth-profiles/chatgpt/switch-events", {
      ok: switchEvents.ok,
      output: `status=${switchEvents.status} total=${switchItems.length} sample=${JSON.stringify(latest)}`
    });
  }

  printSection("Method 2: Container logs (bus)");
  const busLogs = runCommand(cwd, "docker", ["compose", "logs", "--tail", `${tailLines}`, "bus"]);
  printResult(`docker compose logs --tail ${tailLines} bus`, busLogs);

  printSection("Method 3: Redis Streams event log");
  const streamLen = runCommand(cwd, "docker", ["compose", "exec", "-T", "redis", "redis-cli", "XLEN", streamKey]);
  printResult(`redis-cli XLEN ${streamKey}`, streamLen);

  const streamEvents = runCommand(cwd, "docker", [
    "compose",
    "exec",
    "-T",
    "redis",
    "redis-cli",
    "XREVRANGE",
    streamKey,
    "+",
    "-",
    "COUNT",
    `${streamEventsCount}`
  ]);
  printResult(`redis-cli XREVRANGE ${streamKey} + - COUNT ${streamEventsCount}`, streamEvents);

  printSection("Method 4: Optional Loki readiness");
  const lokiReady = await requestJson(`http://127.0.0.1:${lokiPort}/ready`);
  printResult(`GET http://127.0.0.1:${lokiPort}/ready`, {
    ok: lokiReady.ok,
    output: `status=${lokiReady.status} body=${JSON.stringify(lokiReady.body)}`
  });

  process.stdout.write("\n[logs-check] Done.\n");
}

main().catch((error) => {
  process.stderr.write(`[logs-check] Unexpected failure: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
