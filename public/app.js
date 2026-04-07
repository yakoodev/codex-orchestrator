const TOKEN_KEY = "codex_orchestrator_admin_token";
const LANG_KEY = "codex_orchestrator_lang";
const SWITCH_MODULE_KEY = "switch_chatgpt_auth_on_limit";
const MAX_LOG_LINES = 150;

const I18N = {
  ru: {
    title_doc: "Codex Orchestrator Admin UI",
    eyebrow: "Control Plane",
    title: "Панель управления Codex Orchestrator",
    subtitle:
      "Операционный интерфейс: health, задачи, переключение auth-профилей, удержанная очередь и конфиг модуля.",
    language_label: "Язык",
    connection_title: "Подключение",
    token_placeholder: "вставь токен",
    save_token: "Сохранить токен",
    clear_token: "Очистить",
    token_hint: "Токен хранится в localStorage браузера и отправляется только для /api/* запросов.",
    stats_tasks: "Задачи",
    stats_held: "Удержанные",
    stats_profiles: "Профили",
    stats_events: "Switch events",
    health_title: "Health",
    refresh: "Обновить",
    tasks_title: "Задачи",
    task_title_label: "Заголовок",
    task_description_label: "Описание",
    task_project_label: "Project ID",
    task_repo_label: "Repo ID",
    create_task: "Создать задачу",
    table_title: "Заголовок",
    table_status: "Статус",
    table_priority: "Приоритет",
    held_title: "Удержанная очередь",
    release: "Освободить",
    profiles_title: "Auth-профили",
    profile_label_label: "Метка",
    profile_zip_label: "ZIP файл",
    upload_profile: "Загрузить профиль",
    table_label: "Метка",
    table_state: "Состояние",
    table_actions: "Действия",
    events_title: "История переключений",
    module_title: "Кастомный модуль",
    executions: "Исполнения",
    module_enabled_label: "switch_chatgpt_auth_on_limit включен",
    patch_module: "Обновить модуль",
    activity_title: "Журнал действий",
    refresh_all: "Обновить всё",
    status_unknown: "неизвестно",
    status_failed: "ошибка",
    status_not_ready: "не готов",
    status_ok: "200 OK",
    no_tasks: "Задач пока нет.",
    no_held: "Нет задач в WAITING_LIMIT.",
    no_profiles: "Профили ещё не загружены.",
    no_switch_events: "Событий переключения пока нет.",
    no_executions: "Исполнений модуля пока нет.",
    held_summary_count: "{count} задач(а/и) удержано guard-политикой.",
    active_profile_none: "Активный профиль: не выбран",
    active_profile_value: "Активный профиль: {label} ({id})",
    profile_state_active: "активен",
    profile_state_inactive: "неактивен",
    action_activate: "Активировать",
    action_deactivate: "Деактивировать",
    last_refresh_prefix: "Последнее обновление",
    log_protected_skipped: "Пропущены защищенные панели: сначала укажи X-Admin-Token.",
    log_refresh_complete: "Обновление завершено.",
    log_token_empty: "Токен пустой. Сохранение пропущено.",
    log_token_saved: "Админ-токен сохранен.",
    log_token_cleared: "Админ-токен удален.",
    log_health_refreshed: "Health обновлен.",
    log_tasks_refreshed: "Задачи обновлены.",
    log_task_created: "Задача создана",
    log_held_refreshed: "Удержанная очередь обновлена.",
    log_held_released: "Удержанная очередь освобождена.",
    log_profiles_refreshed: "Профили обновлены.",
    log_upload_requirements: "Для upload нужны label и ZIP файл.",
    log_profile_uploaded: "Профиль загружен",
    log_profile_action_accepted: "Операция по профилю принята",
    log_events_refreshed: "Switch events обновлены.",
    log_module_refreshed: "Конфиг модуля обновлен.",
    log_module_json_invalid: "Не удалось применить модуль: config_json должен быть валидным JSON.",
    log_module_patched: "Конфиг модуля обновлен",
    log_executions_refreshed: "История исполнений обновлена.",
    log_initial_refresh_failed: "Начальная загрузка UI завершилась ошибкой",
    error_failed: "ошибка",
    error_request_failed: "Ошибка запроса"
  },
  en: {
    title_doc: "Codex Orchestrator Admin UI",
    eyebrow: "Control Plane",
    title: "Codex Orchestrator Control Panel",
    subtitle:
      "Operational interface for health, tasks, auth-profile switching, held queue, and custom module settings.",
    language_label: "Language",
    connection_title: "Connection",
    token_placeholder: "paste token",
    save_token: "Save token",
    clear_token: "Clear",
    token_hint: "Token is stored in browser localStorage and sent only for /api/* requests.",
    stats_tasks: "Tasks",
    stats_held: "Held Queue",
    stats_profiles: "Profiles",
    stats_events: "Switch Events",
    health_title: "Health",
    refresh: "Refresh",
    tasks_title: "Tasks",
    task_title_label: "Title",
    task_description_label: "Description",
    task_project_label: "Project ID",
    task_repo_label: "Repo ID",
    create_task: "Create task",
    table_title: "Title",
    table_status: "Status",
    table_priority: "Priority",
    held_title: "Held Queue",
    release: "Release",
    profiles_title: "Auth Profiles",
    profile_label_label: "Label",
    profile_zip_label: "ZIP file",
    upload_profile: "Upload profile",
    table_label: "Label",
    table_state: "State",
    table_actions: "Actions",
    events_title: "Switch Events",
    module_title: "Custom Module",
    executions: "Executions",
    module_enabled_label: "switch_chatgpt_auth_on_limit enabled",
    patch_module: "Patch module",
    activity_title: "Activity Log",
    refresh_all: "Refresh all",
    status_unknown: "unknown",
    status_failed: "failed",
    status_not_ready: "not ready",
    status_ok: "200 OK",
    no_tasks: "No tasks yet.",
    no_held: "No tasks in WAITING_LIMIT.",
    no_profiles: "No profiles uploaded yet.",
    no_switch_events: "No switch events yet.",
    no_executions: "No module executions yet.",
    held_summary_count: "{count} task(s) are currently held by guard policy.",
    active_profile_none: "Active profile: none",
    active_profile_value: "Active profile: {label} ({id})",
    profile_state_active: "active",
    profile_state_inactive: "inactive",
    action_activate: "Activate",
    action_deactivate: "Deactivate",
    last_refresh_prefix: "Last refresh",
    log_protected_skipped: "Protected panels skipped: set X-Admin-Token first.",
    log_refresh_complete: "Refresh complete.",
    log_token_empty: "Token is empty. Nothing saved.",
    log_token_saved: "Admin token saved.",
    log_token_cleared: "Admin token cleared.",
    log_health_refreshed: "Health refreshed.",
    log_tasks_refreshed: "Tasks refreshed.",
    log_task_created: "Task created",
    log_held_refreshed: "Held queue refreshed.",
    log_held_released: "Held queue released.",
    log_profiles_refreshed: "Profiles refreshed.",
    log_upload_requirements: "Upload requires label and ZIP file.",
    log_profile_uploaded: "Profile uploaded",
    log_profile_action_accepted: "Profile action accepted",
    log_events_refreshed: "Switch events refreshed.",
    log_module_refreshed: "Module config refreshed.",
    log_module_json_invalid: "Module patch failed: config_json must be valid JSON.",
    log_module_patched: "Module config patched",
    log_executions_refreshed: "Module executions refreshed.",
    log_initial_refresh_failed: "Initial UI refresh failed",
    error_failed: "failed",
    error_request_failed: "Request failed"
  }
};

const ui = {
  langSelect: document.getElementById("lang-select"),
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
  statTasks: document.getElementById("stat-tasks"),
  statHeld: document.getElementById("stat-held"),
  statProfiles: document.getElementById("stat-profiles"),
  statEvents: document.getElementById("stat-events"),
  lastRefresh: document.getElementById("last-refresh"),
  log: document.getElementById("activity-log")
};

const appState = {
  lang: "ru",
  tasks: [],
  held: [],
  profiles: [],
  activeProfile: null,
  switchEvents: [],
  executions: [],
  healthLive: { ok: null, textKey: "status_unknown" },
  healthReady: { ok: null, textKey: "status_unknown" }
};

function t(key, vars) {
  const dict = I18N[appState.lang] ?? I18N.ru;
  const template = dict[key] ?? I18N.ru[key] ?? key;
  if (!vars) {
    return template;
  }

  return Object.entries(vars).reduce((acc, [name, value]) => {
    return acc.replaceAll(`{${name}}`, String(value));
  }, template);
}

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

function getLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === "en" ? "en" : "ru";
}

function setLang(lang) {
  const normalized = lang === "en" ? "en" : "ru";
  appState.lang = normalized;
  localStorage.setItem(LANG_KEY, normalized);
  document.documentElement.lang = normalized;
  ui.langSelect.value = normalized;
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

function applyHealthState() {
  markStatus(ui.liveStatus, appState.healthLive.ok, t(appState.healthLive.textKey));
  markStatus(ui.readyStatus, appState.healthReady.ok, t(appState.healthReady.textKey));
}

function updateLastRefresh() {
  ui.lastRefresh.textContent = `${t("last_refresh_prefix")}: ${new Date().toLocaleTimeString()}`;
}

function updateStats() {
  ui.statTasks.textContent = String(appState.tasks.length);
  ui.statHeld.textContent = String(appState.held.length);
  ui.statProfiles.textContent = String(appState.profiles.length);
  ui.statEvents.textContent = String(appState.switchEvents.length);
}

function applyI18n() {
  document.title = t("title_doc");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (key) {
      element.textContent = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    if (key) {
      element.setAttribute("placeholder", t(key));
    }
  });

  renderTasks(appState.tasks);
  renderHeld(appState.held);
  renderProfiles(appState.profiles);
  renderSwitchEvents(appState.switchEvents);
  renderExecutions(appState.executions);
  applyHealthState();
  updateStats();
}

async function requestRaw(route, options = {}) {
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

  return {
    status: response.status,
    ok: response.ok,
    payload
  };
}

async function requestJson(route, options = {}) {
  const response = await requestRaw(route, options);
  if (!response.ok) {
    const payload = response.payload;
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : `${t("error_request_failed")} (${response.status})`;
    const error = new Error(String(message));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return response.payload;
}

function renderTasks(items) {
  appState.tasks = Array.isArray(items) ? items : [];

  if (appState.tasks.length === 0) {
    ui.tasksBody.innerHTML = `<tr><td colspan="4" class="muted">${escapeHtml(t("no_tasks"))}</td></tr>`;
    updateStats();
    return;
  }

  ui.tasksBody.innerHTML = appState.tasks
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
  updateStats();
}

function renderHeld(items) {
  appState.held = Array.isArray(items) ? items : [];

  if (appState.held.length === 0) {
    ui.heldSummary.textContent = t("no_held");
    ui.heldList.innerHTML = "";
    updateStats();
    return;
  }

  ui.heldSummary.textContent = t("held_summary_count", { count: appState.held.length });
  ui.heldList.innerHTML = appState.held
    .map(
      (item) =>
        `<li><code>${escapeHtml(item.id)}</code> ${escapeHtml(item.title)} <span class="pill">${escapeHtml(item.status)}</span></li>`
    )
    .join("");
  updateStats();
}

function renderProfiles(items) {
  appState.profiles = Array.isArray(items) ? items : [];

  if (appState.activeProfile) {
    ui.activeProfile.textContent = t("active_profile_value", {
      label: appState.activeProfile.label,
      id: appState.activeProfile.id
    });
  } else {
    ui.activeProfile.textContent = t("active_profile_none");
  }

  if (appState.profiles.length === 0) {
    ui.profilesBody.innerHTML = `<tr><td colspan="4" class="muted">${escapeHtml(t("no_profiles"))}</td></tr>`;
    updateStats();
    return;
  }

  ui.profilesBody.innerHTML = appState.profiles
    .map((item) => {
      const state = item.is_active
        ? `<span class="pill pill-active">${escapeHtml(t("profile_state_active"))}</span>`
        : `<span class="pill">${escapeHtml(t("profile_state_inactive"))}</span>`;
      return `
        <tr>
          <td><code>${escapeHtml(item.id)}</code></td>
          <td>${escapeHtml(item.label)}</td>
          <td>${state}</td>
          <td class="actions">
            <button type="button" data-action="activate" data-id="${escapeHtml(item.id)}">${escapeHtml(t("action_activate"))}</button>
            <button type="button" data-action="deactivate" data-id="${escapeHtml(item.id)}" class="ghost">${escapeHtml(t("action_deactivate"))}</button>
          </td>
        </tr>
      `;
    })
    .join("");
  updateStats();
}

function renderSwitchEvents(items) {
  appState.switchEvents = Array.isArray(items) ? items : [];

  if (appState.switchEvents.length === 0) {
    ui.switchEvents.innerHTML = `<li class="muted">${escapeHtml(t("no_switch_events"))}</li>`;
    updateStats();
    return;
  }

  ui.switchEvents.innerHTML = appState.switchEvents
    .slice(0, 20)
    .map((eventItem) => {
      const from = eventItem.from_auth_profile_id ?? "none";
      const to = eventItem.to_auth_profile_id ?? "none";
      return `<li><span class="pill">${escapeHtml(eventItem.status)}</span> ${escapeHtml(
        eventItem.reason
      )} (${escapeHtml(from)} -> ${escapeHtml(to)})</li>`;
    })
    .join("");
  updateStats();
}

function renderExecutions(items) {
  appState.executions = Array.isArray(items) ? items : [];

  if (appState.executions.length === 0) {
    ui.executionsList.innerHTML = `<li class="muted">${escapeHtml(t("no_executions"))}</li>`;
    return;
  }

  ui.executionsList.innerHTML = appState.executions
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
    appState.healthLive = { ok: true, textKey: "status_ok" };
  } catch (error) {
    appState.healthLive = { ok: false, textKey: "status_failed" };
    log("health/live failed", { message: error.message });
  }

  try {
    await requestJson("/health/ready");
    appState.healthReady = { ok: true, textKey: "status_ok" };
  } catch (error) {
    appState.healthReady = { ok: false, textKey: "status_not_ready" };
    log("health/ready failed", { message: error.message });
  }

  applyHealthState();
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
  const profilesResponse = await requestJson("/api/auth-profiles/chatgpt");

  const activeResponse = await requestRaw("/api/auth-profiles/chatgpt/active");
  if (activeResponse.ok) {
    appState.activeProfile = activeResponse.payload.profile ?? null;
  } else if (activeResponse.status === 404) {
    appState.activeProfile = null;
  } else {
    const error = new Error(t("error_request_failed"));
    error.status = activeResponse.status;
    error.payload = activeResponse.payload;
    throw error;
  }

  renderProfiles(profilesResponse.items);
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
  if (!getToken()) {
    log(t("log_protected_skipped"));
    return;
  }

  const jobs = [
    ["tasks", refreshTasks],
    ["held", refreshHeld],
    ["profiles", refreshProfiles],
    ["switch-events", refreshSwitchEvents],
    ["module", refreshModule],
    ["executions", refreshExecutions]
  ];

  for (const [name, run] of jobs) {
    try {
      await run();
    } catch (error) {
      log(`${name} ${t("error_failed")}`, { message: error.message, payload: error.payload });
    }
  }
}

async function refreshAll() {
  await refreshHealth();
  await refreshProtectedPanels();
  updateLastRefresh();
  log(t("log_refresh_complete"));
}

function installHandlers() {
  setLang(getLang());
  ui.tokenInput.value = getToken();
  applyI18n();

  ui.langSelect.addEventListener("change", (event) => {
    const nextLang = event.target.value;
    setLang(nextLang);
    applyI18n();
    log(`language set to ${nextLang}`);
  });

  ui.tokenForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = ui.tokenInput.value.trim();
    if (!token) {
      log(t("log_token_empty"));
      return;
    }
    setToken(token);
    log(t("log_token_saved"));
    await refreshAll();
  });

  ui.tokenClear.addEventListener("click", () => {
    clearToken();
    ui.tokenInput.value = "";
    log(t("log_token_cleared"));
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
    updateLastRefresh();
    log(t("log_health_refreshed"));
  });

  ui.refreshTasks.addEventListener("click", async () => {
    try {
      await refreshTasks();
      updateLastRefresh();
      log(t("log_tasks_refreshed"));
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
      log(t("log_task_created"), { id: created.id, status: created.status });
      ui.taskForm.reset();
      await Promise.all([refreshTasks(), refreshHeld()]);
      updateLastRefresh();
    } catch (error) {
      log("task create failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshHeld.addEventListener("click", async () => {
    try {
      await refreshHeld();
      updateLastRefresh();
      log(t("log_held_refreshed"));
    } catch (error) {
      log("held queue refresh failed", { message: error.message, payload: error.payload });
    }
  });

  ui.releaseHeld.addEventListener("click", async () => {
    try {
      await requestJson("/api/queue/held/release", { method: "POST" });
      log(t("log_held_released"));
      await Promise.all([refreshHeld(), refreshTasks(), refreshSwitchEvents()]);
      updateLastRefresh();
    } catch (error) {
      log("held queue release failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshProfiles.addEventListener("click", async () => {
    try {
      await Promise.all([refreshProfiles(), refreshSwitchEvents()]);
      updateLastRefresh();
      log(t("log_profiles_refreshed"));
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
      log(t("log_upload_requirements"));
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
      log(t("log_profile_uploaded"), { id: response.id, checksum_sha256: response.checksum_sha256 });
      ui.uploadForm.reset();
      await refreshProfiles();
      updateLastRefresh();
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
      log(t("log_profile_action_accepted"), { action, id, accepted: response.accepted });
      await Promise.all([refreshProfiles(), refreshHeld(), refreshSwitchEvents(), refreshTasks()]);
      updateLastRefresh();
    } catch (error) {
      log(`profile ${action} failed`, { message: error.message, payload: error.payload });
    }
  });

  ui.refreshSwitchEvents.addEventListener("click", async () => {
    try {
      await refreshSwitchEvents();
      updateLastRefresh();
      log(t("log_events_refreshed"));
    } catch (error) {
      log("switch-events refresh failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshModule.addEventListener("click", async () => {
    try {
      await refreshModule();
      updateLastRefresh();
      log(t("log_module_refreshed"));
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
      log(t("log_module_json_invalid"));
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
      log(t("log_module_patched"), {
        module_key: response.module_key,
        is_enabled: response.is_enabled
      });
      await Promise.all([refreshModule(), refreshExecutions()]);
      updateLastRefresh();
    } catch (error) {
      log("module patch failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshExecutions.addEventListener("click", async () => {
    try {
      await refreshExecutions();
      updateLastRefresh();
      log(t("log_executions_refreshed"));
    } catch (error) {
      log("module executions refresh failed", { message: error.message, payload: error.payload });
    }
  });
}

installHandlers();
void refreshAll().catch((error) => {
  log(t("log_initial_refresh_failed"), { message: error.message, payload: error.payload });
});
