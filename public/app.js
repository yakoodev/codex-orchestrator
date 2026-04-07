const TOKEN_KEY = "codex_orchestrator_admin_token";
const SWITCH_MODULE_KEY = "switch_chatgpt_auth_on_limit";
const MAX_LOG_LINES = 150;

const ui = {
  tokenForm: document.getElementById("token-form"),
  tokenInput: document.getElementById("admin-token"),
  tokenClear: document.getElementById("token-clear"),
  refreshAll: document.getElementById("refresh-all"),
  refreshHealth: document.getElementById("refresh-health"),
  liveStatus: document.getElementById("live-status"),
  readyStatus: document.getElementById("ready-status"),
  taskForm: document.getElementById("task-form"),
  refreshTasks: document.getElementById("refresh-tasks"),
  tasksBody: document.getElementById("tasks-body"),
  refreshHeld: document.getElementById("refresh-held"),
  releaseHeld: document.getElementById("release-held"),
  heldSummary: document.getElementById("held-summary"),
  heldList: document.getElementById("held-list"),
  uploadForm: document.getElementById("upload-form"),
  refreshProfiles: document.getElementById("refresh-profiles"),
  activeProfile: document.getElementById("active-profile"),
  profilesBody: document.getElementById("profiles-body"),
  refreshSwitchEvents: document.getElementById("refresh-switch-events"),
  switchEvents: document.getElementById("switch-events"),
  moduleForm: document.getElementById("module-form"),
  moduleEnabled: document.getElementById("module-enabled"),
  moduleConfig: document.getElementById("module-config"),
  refreshModule: document.getElementById("refresh-module"),
  refreshExecutions: document.getElementById("refresh-executions"),
  executionsList: document.getElementById("executions-list"),
  log: document.getElementById("activity-log")
};

function nowTime() {
  return new Date().toISOString().slice(11, 19);
}

function log(message, data) {
  const payload = data === undefined ? "" : ` ${JSON.stringify(data)}`;
  const line = `[${nowTime()}] ${message}${payload}`;
  const previous = ui.log.textContent ? ui.log.textContent.split("\n") : [];
  previous.push(line);
  ui.log.textContent = previous.slice(-MAX_LOG_LINES).join("\n");
  ui.log.scrollTop = ui.log.scrollHeight;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function markStatus(node, ok, text) {
  node.textContent = text;
  node.classList.remove("status-ok", "status-error", "status-unknown");
  if (ok === true) {
    node.classList.add("status-ok");
    return;
  }
  if (ok === false) {
    node.classList.add("status-error");
    return;
  }
  node.classList.add("status-unknown");
}

async function requestJson(route, options = {}) {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers ?? {});
  const token = getToken();

  if (route.startsWith("/api/")) {
    if (!token) {
      throw new Error("Set X-Admin-Token first.");
    }
    headers.set("X-Admin-Token", token);
  }

  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const response = await fetch(route, { method, headers, body });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : `HTTP ${response.status}`;
    const error = new Error(String(message));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function renderTasks(items) {
  if (!Array.isArray(items) || items.length === 0) {
    ui.tasksBody.innerHTML = '<tr><td colspan="4" class="muted">No tasks yet.</td></tr>';
    return;
  }

  ui.tasksBody.innerHTML = items
    .map(
      (item) => `
      <tr>
        <td><code>${escapeHtml(item.id)}</code></td>
        <td>${escapeHtml(item.title)}</td>
        <td><span class="pill">${escapeHtml(item.status)}</span></td>
        <td>${escapeHtml(item.priority)}</td>
      </tr>
    `
    )
    .join("");
}

function renderHeld(items) {
  if (!Array.isArray(items) || items.length === 0) {
    ui.heldSummary.textContent = "No tasks in WAITING_LIMIT.";
    ui.heldList.innerHTML = "";
    return;
  }

  ui.heldSummary.textContent = `${items.length} task(s) are currently held by guard policy.`;
  ui.heldList.innerHTML = items
    .map(
      (item) =>
        `<li><code>${escapeHtml(item.id)}</code> ${escapeHtml(item.title)} <span class="pill">${escapeHtml(item.status)}</span></li>`
    )
    .join("");
}

function renderProfiles(items) {
  if (!Array.isArray(items) || items.length === 0) {
    ui.profilesBody.innerHTML = '<tr><td colspan="4" class="muted">No profiles uploaded.</td></tr>';
    return;
  }

  ui.profilesBody.innerHTML = items
    .map((item) => {
      const state = item.is_active ? '<span class="pill pill-active">active</span>' : '<span class="pill">inactive</span>';
      return `
        <tr>
          <td><code>${escapeHtml(item.id)}</code></td>
          <td>${escapeHtml(item.label)}</td>
          <td>${state}</td>
          <td class="actions">
            <button type="button" data-action="activate" data-id="${escapeHtml(item.id)}">Activate</button>
            <button type="button" data-action="deactivate" data-id="${escapeHtml(item.id)}" class="ghost">Deactivate</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSwitchEvents(items) {
  if (!Array.isArray(items) || items.length === 0) {
    ui.switchEvents.innerHTML = "<li class='muted'>No switch events yet.</li>";
    return;
  }

  ui.switchEvents.innerHTML = items
    .slice(0, 20)
    .map((eventItem) => {
      const from = eventItem.from_auth_profile_id ?? "none";
      const to = eventItem.to_auth_profile_id ?? "none";
      return `<li><span class="pill">${escapeHtml(eventItem.status)}</span> ${escapeHtml(
        eventItem.reason
      )} (${escapeHtml(from)} -> ${escapeHtml(to)})</li>`;
    })
    .join("");
}

function renderExecutions(items) {
  if (!Array.isArray(items) || items.length === 0) {
    ui.executionsList.innerHTML = "<li class='muted'>No module executions yet.</li>";
    return;
  }

  ui.executionsList.innerHTML = items
    .slice(0, 10)
    .map(
      (item) =>
        `<li><span class="pill">${escapeHtml(item.status)}</span> ${escapeHtml(item.event_type)} trace=<code>${escapeHtml(
          item.trace_id
        )}</code></li>`
    )
    .join("");
}

async function refreshHealth() {
  try {
    await requestJson("/health/live");
    markStatus(ui.liveStatus, true, "200 OK");
  } catch (error) {
    markStatus(ui.liveStatus, false, "failed");
    log("health/live failed", { message: error.message });
  }

  try {
    await requestJson("/health/ready");
    markStatus(ui.readyStatus, true, "200 OK");
  } catch (error) {
    markStatus(ui.readyStatus, false, "not ready");
    log("health/ready failed", { message: error.message });
  }
}

async function refreshTasks() {
  const response = await requestJson("/api/tasks");
  renderTasks(response.items);
}

async function refreshHeld() {
  const response = await requestJson("/api/queue/held");
  renderHeld(response.items);
}

async function refreshProfiles() {
  const [profiles, active] = await Promise.all([
    requestJson("/api/auth-profiles/chatgpt"),
    requestJson("/api/auth-profiles/chatgpt/active")
  ]);
  renderProfiles(profiles.items);
  const label = active.profile ? `${active.profile.label} (${active.profile.id})` : "none";
  ui.activeProfile.textContent = `Active profile: ${label}`;
}

async function refreshSwitchEvents() {
  const response = await requestJson("/api/auth-profiles/chatgpt/switch-events");
  renderSwitchEvents(response.items);
}

async function refreshModule() {
  const response = await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}`);
  ui.moduleEnabled.checked = Boolean(response.is_enabled);
  ui.moduleConfig.value = JSON.stringify(response.config_json ?? {}, null, 2);
}

async function refreshExecutions() {
  const response = await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}/executions`);
  renderExecutions(response.items);
}

async function refreshProtectedPanels() {
  const token = getToken();
  if (!token) {
    log("Protected panels skipped: set X-Admin-Token to continue.");
    return;
  }

  await Promise.all([
    refreshTasks(),
    refreshHeld(),
    refreshProfiles(),
    refreshSwitchEvents(),
    refreshModule(),
    refreshExecutions()
  ]);
}

async function refreshAll() {
  await refreshHealth();
  await refreshProtectedPanels();
  log("Refresh complete.");
}

function installHandlers() {
  ui.tokenInput.value = getToken();

  ui.tokenForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = ui.tokenInput.value.trim();
    if (!token) {
      log("Token is empty. Nothing saved.");
      return;
    }
    setToken(token);
    log("Admin token saved.");
    await refreshAll();
  });

  ui.tokenClear.addEventListener("click", () => {
    clearToken();
    ui.tokenInput.value = "";
    log("Admin token cleared.");
  });

  ui.refreshAll.addEventListener("click", async () => {
    try {
      await refreshAll();
    } catch (error) {
      log("refresh-all failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshHealth.addEventListener("click", async () => {
    await refreshHealth();
    log("Health refreshed.");
  });

  ui.refreshTasks.addEventListener("click", async () => {
    try {
      await refreshTasks();
      log("Tasks refreshed.");
    } catch (error) {
      log("tasks refresh failed", { message: error.message, payload: error.payload });
    }
  });

  ui.taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(ui.taskForm);
    const payload = {
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      project_id: String(form.get("project_id") ?? "").trim(),
      repo_id: String(form.get("repo_id") ?? "").trim(),
      priority: 100
    };

    try {
      const created = await requestJson("/api/tasks", { method: "POST", json: payload });
      log("Task created", { id: created.id, status: created.status });
      ui.taskForm.reset();
      await Promise.all([refreshTasks(), refreshHeld()]);
    } catch (error) {
      log("task create failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshHeld.addEventListener("click", async () => {
    try {
      await refreshHeld();
      log("Held queue refreshed.");
    } catch (error) {
      log("held queue refresh failed", { message: error.message, payload: error.payload });
    }
  });

  ui.releaseHeld.addEventListener("click", async () => {
    try {
      await requestJson("/api/queue/held/release", { method: "POST" });
      log("Held queue released.");
      await Promise.all([refreshHeld(), refreshTasks(), refreshSwitchEvents()]);
    } catch (error) {
      log("held queue release failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshProfiles.addEventListener("click", async () => {
    try {
      await Promise.all([refreshProfiles(), refreshSwitchEvents()]);
      log("Profiles refreshed.");
    } catch (error) {
      log("profiles refresh failed", { message: error.message, payload: error.payload });
    }
  });

  ui.uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(ui.uploadForm);
    const label = String(form.get("label") ?? "").trim();
    const fileInput = document.getElementById("profile-file");
    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

    if (!label || !file) {
      log("Upload requires label and ZIP file.");
      return;
    }

    const body = new FormData();
    body.append("label", label);
    body.append("file", file);

    try {
      const response = await requestJson("/api/auth-profiles/chatgpt/upload", {
        method: "POST",
        body
      });
      log("Profile uploaded", { id: response.id, checksum_sha256: response.checksum_sha256 });
      ui.uploadForm.reset();
      await refreshProfiles();
    } catch (error) {
      log("profile upload failed", { message: error.message, payload: error.payload });
    }
  });

  ui.profilesBody.addEventListener("click", async (event) => {
    const target = event.target.closest("button[data-action]");
    if (!target) {
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) {
      return;
    }

    const route =
      action === "activate"
        ? `/api/auth-profiles/chatgpt/${id}/activate`
        : `/api/auth-profiles/chatgpt/${id}/deactivate`;

    try {
      const response = await requestJson(route, { method: "POST" });
      log(`Profile ${action} accepted`, { id, accepted: response.accepted });
      await Promise.all([refreshProfiles(), refreshHeld(), refreshSwitchEvents(), refreshTasks()]);
    } catch (error) {
      log(`profile ${action} failed`, { message: error.message, payload: error.payload });
    }
  });

  ui.refreshSwitchEvents.addEventListener("click", async () => {
    try {
      await refreshSwitchEvents();
      log("Switch events refreshed.");
    } catch (error) {
      log("switch-events refresh failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshModule.addEventListener("click", async () => {
    try {
      await refreshModule();
      log("Module config refreshed.");
    } catch (error) {
      log("module refresh failed", { message: error.message, payload: error.payload });
    }
  });

  ui.moduleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    let configJson = {};
    try {
      configJson = JSON.parse(ui.moduleConfig.value || "{}");
    } catch {
      log("module patch failed: config_json must be valid JSON.");
      return;
    }

    try {
      const response = await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}`, {
        method: "PATCH",
        json: {
          is_enabled: ui.moduleEnabled.checked,
          config_json: configJson
        }
      });
      log("Module config patched", {
        module_key: response.module_key,
        is_enabled: response.is_enabled
      });
      await Promise.all([refreshModule(), refreshExecutions()]);
    } catch (error) {
      log("module patch failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshExecutions.addEventListener("click", async () => {
    try {
      await refreshExecutions();
      log("Module executions refreshed.");
    } catch (error) {
      log("module executions refresh failed", { message: error.message, payload: error.payload });
    }
  });
}

installHandlers();
void refreshAll().catch((error) => {
  log("initial refresh failed", { message: error.message, payload: error.payload });
});
