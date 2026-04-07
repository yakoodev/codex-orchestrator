import fs from "node:fs";
import path from "node:path";

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

    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }

  return result;
}

function fail(message, extra) {
  console.error(`[smoke] FAIL: ${message}`);
  if (extra !== undefined) {
    console.error(extra);
  }
  process.exit(1);
}

function ok(message) {
  process.stdout.write(`[smoke] OK: ${message}\n`);
}

async function requestJson(baseUrl, token, method, route, options = {}) {
  const { body, headers = {}, expected = [200] } = options;
  const reqHeaders = {
    ...headers
  };

  if (token && route.startsWith("/api/") && !reqHeaders["X-Admin-Token"]) {
    reqHeaders["X-Admin-Token"] = token;
  }

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: reqHeaders,
    body
  });

  let parsed = null;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    parsed = await response.json();
  } else {
    parsed = await response.text();
  }

  if (!expected.includes(response.status)) {
    fail(`${method} ${route} returned ${response.status}, expected one of: ${expected.join(", ")}`, parsed);
  }

  return { status: response.status, data: parsed };
}

async function main() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, ".env");
  const env = parseDotEnv(envPath);
  const runId = `${Date.now()}`;

  const adminToken = process.env.ADMIN_TOKEN ?? env.ADMIN_TOKEN;
  const port = process.env.PORT ?? env.PORT ?? "8080";
  const baseUrl = process.env.API_BASE_URL ?? `http://127.0.0.1:${port}`;

  if (!adminToken) {
    fail("ADMIN_TOKEN is required. Set it in shell or in .env");
  }

  ok(`using base URL ${baseUrl}`);

  await requestJson(baseUrl, null, "GET", "/health/live", { expected: [200] });
  ok("health/live");

  await requestJson(baseUrl, null, "GET", "/health/ready", { expected: [200] });
  ok("health/ready");

  await requestJson(baseUrl, null, "GET", "/api/tasks", { expected: [401] });
  ok("admin token guard");

  const task = await requestJson(baseUrl, adminToken, "POST", "/api/tasks", {
    expected: [201],
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Smoke task",
      description: "Created by smoke script",
      project_id: "smoke-project",
      repo_id: "smoke-repo",
      priority: 100
    })
  });
  const taskId = task.data.id;
  ok("create task");

  await requestJson(baseUrl, adminToken, "GET", "/api/tasks", { expected: [200] });
  ok("list tasks");

  const agentTemplate = await requestJson(baseUrl, adminToken, "POST", "/api/agents/templates", {
    expected: [201],
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "smoke-helper-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "Smoke helper",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    })
  });
  ok("create agent template");

  await requestJson(baseUrl, adminToken, "GET", "/api/delegation/capabilities", { expected: [200] });
  ok("delegation capabilities");

  const delegation = await requestJson(baseUrl, adminToken, "POST", "/api/delegation/dispatch", {
    expected: [202],
    headers: { "Content-Type": "application/json", "X-Trace-Id": "smoke-trace-delegation" },
    body: JSON.stringify({
      requester_task_id: taskId,
      requester_task_run_id: null,
      capability: "reviewer",
      target_selector: { role: "reviewer" },
      payload: { from: "smoke-script" },
      priority: 100
    })
  });
  const delegationId = delegation.data.id;
  if (delegation.data.status !== "completed") {
    fail("delegation should complete in smoke happy-path", delegation.data);
  }
  ok("dispatch delegation");

  await requestJson(baseUrl, adminToken, "GET", `/api/delegation/${delegationId}`, { expected: [200] });
  await requestJson(baseUrl, adminToken, "GET", `/api/delegation/${delegationId}/result`, { expected: [200] });
  ok("read delegation status/result");

  const timeoutDelegation = await requestJson(baseUrl, adminToken, "POST", "/api/delegation/dispatch", {
    expected: [202],
    headers: { "Content-Type": "application/json", "X-Trace-Id": "smoke-trace-delegation-timeout" },
    body: JSON.stringify({
      requester_task_id: taskId,
      requester_task_run_id: null,
      capability: "reviewer",
      target_selector: { role: "reviewer" },
      payload: { from: "smoke-script", simulate_timeout_attempts: 5 },
      priority: 100
    })
  });
  if (timeoutDelegation.data.status !== "failed") {
    fail("delegation timeout path must end with failed status", timeoutDelegation.data);
  }
  ok("delegation timeout-retry terminal failed path");

  const schedule = await requestJson(baseUrl, adminToken, "POST", "/api/schedules", {
    expected: [201],
    headers: { "Content-Type": "application/json", "X-Trace-Id": "smoke-trace-schedule" },
    body: JSON.stringify({
      name: "smoke-schedule",
      scope: "global",
      project_id: null,
      rule_ast: {
        conditions: [{ predicate: "time.cron", operator: "eq", value: "0 3 * * *" }]
      },
      overlap_policy: "one_active_skip",
      misfire_policy: "recompute_due_on_restart"
    })
  });
  const scheduleId = schedule.data.id;
  ok("create schedule");

  const firstScheduleTrigger = await requestJson(baseUrl, adminToken, "POST", `/api/schedules/${scheduleId}/trigger`, {
    expected: [202],
    headers: { "X-Trace-Id": "smoke-trace-schedule-run" }
  });
  const secondScheduleTrigger = await requestJson(baseUrl, adminToken, "POST", `/api/schedules/${scheduleId}/trigger`, {
    expected: [202],
    headers: { "X-Trace-Id": "smoke-trace-schedule-run" }
  });
  if (firstScheduleTrigger.data.id !== secondScheduleTrigger.data.id) {
    fail("schedule trigger should be idempotent for same trace id", {
      first: firstScheduleTrigger.data,
      second: secondScheduleTrigger.data
    });
  }

  const scheduleRuns = await requestJson(baseUrl, adminToken, "GET", `/api/schedules/${scheduleId}/runs`, {
    expected: [200]
  });
  if (!Array.isArray(scheduleRuns.data.items) || scheduleRuns.data.items.length !== 1) {
    fail("schedule idempotent trigger should not create duplicate runs", scheduleRuns.data);
  }
  ok("trigger and list schedule runs (idempotent)");

  const form = new FormData();
  const zipBlob = new Blob([Buffer.from([0x50, 0x4b, 0x03, 0x04])], { type: "application/zip" });
  form.append("label", "smoke-profile");
  form.append("file", zipBlob, "smoke-profile.zip");

  const upload = await requestJson(baseUrl, adminToken, "POST", "/api/auth-profiles/chatgpt/upload", {
    expected: [201],
    headers: { "X-Trace-Id": "smoke-trace-profile-upload" },
    body: form
  });
  const profileId = upload.data.id;
  ok("upload auth profile");

  await requestJson(baseUrl, adminToken, "POST", `/api/auth-profiles/chatgpt/${profileId}/activate`, {
    expected: [202],
    headers: { "X-Trace-Id": "smoke-trace-profile-activate" }
  });

  const switchEventsAfterActivate = await requestJson(
    baseUrl,
    adminToken,
    "GET",
    "/api/auth-profiles/chatgpt/switch-events",
    { expected: [200] }
  );
  const activateSwitchEvent = Array.isArray(switchEventsAfterActivate.data.items)
    ? switchEventsAfterActivate.data.items.find(
        (item) =>
          item.reason === "manual_activate" &&
          item.to_auth_profile_id === profileId &&
          item.status === "completed"
      )
    : null;
  if (!activateSwitchEvent) {
    fail("switch-events should contain manual_activate completion for uploaded profile", {
      profileId,
      response: switchEventsAfterActivate.data
    });
  }

  await requestJson(baseUrl, adminToken, "POST", `/api/auth-profiles/chatgpt/${profileId}/deactivate`, {
    expected: [202],
    headers: { "X-Trace-Id": "smoke-trace-profile-deactivate" }
  });

  const switchEventsAfterDeactivate = await requestJson(
    baseUrl,
    adminToken,
    "GET",
    "/api/auth-profiles/chatgpt/switch-events",
    { expected: [200] }
  );
  const deactivateSwitchEvent = Array.isArray(switchEventsAfterDeactivate.data.items)
    ? switchEventsAfterDeactivate.data.items.find(
        (item) =>
          item.reason === "manual_deactivate" &&
          item.from_auth_profile_id === profileId &&
          item.to_auth_profile_id === null &&
          item.status === "completed"
      )
    : null;
  if (!deactivateSwitchEvent) {
    fail("switch-events should contain manual_deactivate completion for uploaded profile", {
      profileId,
      response: switchEventsAfterDeactivate.data
    });
  }
  ok("activate/deactivate profile and validate switch-events");

  await requestJson(baseUrl, adminToken, "GET", "/api/custom-modules/switch_chatgpt_auth_on_limit", { expected: [200] });
  await requestJson(baseUrl, adminToken, "PATCH", "/api/custom-modules/switch_chatgpt_auth_on_limit", {
    expected: [200],
    headers: { "Content-Type": "application/json", "X-Trace-Id": "smoke-trace-module" },
    body: JSON.stringify({
      is_enabled: false,
      config_json: { threshold: 42 }
    })
  });
  await requestJson(baseUrl, adminToken, "GET", "/api/custom-modules/switch_chatgpt_auth_on_limit/executions", {
    expected: [200]
  });
  ok("custom module patch and executions");

  const pack = await requestJson(baseUrl, adminToken, "POST", "/api/packs", {
    expected: [201],
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pack_id: `smoke-pack-${runId}`,
      role: "developer",
      capabilities_json: { code: true },
      source_type: "git",
      source_ref: `https://example.com/smoke-pack-${runId}.git`,
      pinned_version: "v1.0.0",
      manifest_json: { name: `smoke-pack-${runId}` }
    })
  });
  const packId = pack.data.id;
  await requestJson(baseUrl, adminToken, "POST", `/api/packs/${packId}/materialize`, { expected: [202] });
  ok("pack register/materialize");

  await requestJson(baseUrl, adminToken, "GET", "/api/queue/held", { expected: [200] });
  await requestJson(baseUrl, adminToken, "POST", "/api/queue/held/release", { expected: [202] });
  ok("queue held endpoints");

  await requestJson(baseUrl, adminToken, "DELETE", `/api/agents/templates/${agentTemplate.data.id}`, {
    expected: [204]
  });
  await requestJson(baseUrl, adminToken, "DELETE", `/api/schedules/${scheduleId}`, { expected: [204] });

  ok("smoke scenario completed");
}

main().catch((error) => {
  if (error && typeof error === "object") {
    const cause = error.cause;
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "ECONNREFUSED") {
      fail("cannot connect to API. Start services first: `docker compose up -d`", error);
    }
  }
  fail("unexpected error", error);
});
