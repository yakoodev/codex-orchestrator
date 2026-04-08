const TOKEN_KEY = "codex_orchestrator_admin_token";
const LANG_KEY = "codex_orchestrator_lang";
const TAB_KEY = "codex_orchestrator_tab";
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
    tab_overview: "Обзор",
    tab_tasks: "Задачи и очередь",
    tab_agents: "Агенты",
    tab_accounts: "Аккаунты и лимиты",
    tab_system: "Система",
    tab_intro_overview_title: "Операционный сценарий",
    tab_intro_overview_text: "Подключи токен и проверь состояние сервиса перед запуском операций.",
    tab_intro_tasks_title: "Работа с задачами",
    tab_intro_tasks_text: "Создавай задачи и контролируй их жизненный цикл по колонкам статусов.",
    tab_intro_agents_title: "Контроль делегаций",
    tab_intro_agents_text: "Отслеживай preparing/running/recent агентов и проверяй prompt/account/log.",
    tab_intro_accounts_title: "Управление аккаунтами",
    tab_intro_accounts_text: "Загружай профили, переключай активный аккаунт и мониторь live-лимиты.",
    tab_intro_system_title: "Системные override-инструменты",
    tab_intro_system_text: "Модульные настройки и ручные fallback-действия для восстановления потока.",
    health_title: "Health",
    refresh: "Обновить",
    tasks_title: "Задачи",
    task_title_label: "Заголовок",
    task_description_label: "Описание",
    task_project_label: "Project ID",
    task_repo_label: "Repo ID",
    task_board_waiting: "Ожидает запуска",
    task_board_running: "Запущена",
    task_board_completed: "Выполнена",
    create_task: "Создать задачу",
    table_title: "Заголовок",
    table_status: "Статус",
    table_priority: "Приоритет",
    held_title: "Удержанная очередь",
    release: "Освободить",
    agent_cards_title: "Карточки агентов",
    agent_preparing: "Готовятся",
    agent_running: "Запущены",
    agent_recent: "Недавние",
    agent_field_capability: "capability",
    agent_field_template: "template",
    agent_field_account: "account",
    agent_field_prompt: "prompt",
    agent_field_log: "log",
    memory_title: "Память агентов",
    memory_project_label: "Project ID",
    memory_role_label: "Роль агента",
    memory_note_title_label: "Заголовок памяти",
    memory_note_content_label: "Содержимое памяти",
    create_memory_note: "Сохранить память",
    memory_manual_title: "Ручная правка памяти (fallback)",
    memory_manual_hint:
      "Память подмешивается автоматически. Этот блок нужен только для ручной коррекции.",
    accounts_title: "Аккаунты",
    profiles_title: "Auth-профили",
    profile_label_label: "Метка",
    profile_json_label: "Файл auth.json",
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
    no_tasks_waiting: "Нет задач в ожидании запуска.",
    no_tasks_running: "Нет запущенных задач.",
    no_tasks_completed: "Нет завершенных задач.",
    no_held: "Нет задач в WAITING_LIMIT.",
    no_profiles: "Профили ещё не загружены.",
    no_accounts: "Карточек аккаунтов пока нет.",
    no_preparing_agents: "Нет агентов в состоянии подготовки.",
    no_running_agents: "Нет запущенных агентов.",
    no_recent_agents: "Нет завершенных/ошибочных запусков.",
    no_memory_entries: "Записей памяти пока нет.",
    no_switch_events: "Событий переключения пока нет.",
    no_executions: "Исполнений модуля пока нет.",
    held_summary_count: "{count} задач(а/и) удержано guard-политикой.",
    active_profile_none: "Активный профиль: не выбран",
    active_profile_value: "Активный профиль: {label} ({id})",
    profile_state_active: "активен",
    profile_state_inactive: "неактивен",
    active_now: "активный сейчас",
    action_activate: "Активировать",
    action_deactivate: "Деактивировать",
    action_enable: "Включить",
    action_disable: "Выключить",
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
    log_upload_requirements: "Для upload нужны label и файл auth.json.",
    log_profile_uploaded: "Профиль загружен",
    log_profile_action_accepted: "Операция по профилю принята",
    log_agent_cards_refreshed: "Карточки агентов обновлены.",
    log_memory_refreshed: "Память агентов обновлена.",
    log_memory_created: "Запись памяти создана",
    log_memory_toggled: "Состояние записи памяти обновлено",
    log_memory_requirements: "Для памяти нужны project_id, agent_role, title и content.",
    log_tab_changed: "Переключена вкладка",
    log_account_fleet_refreshed: "Карточки аккаунтов обновлены.",
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
    tab_overview: "Overview",
    tab_tasks: "Tasks & Queue",
    tab_agents: "Agents",
    tab_accounts: "Accounts & Limits",
    tab_system: "System",
    tab_intro_overview_title: "Operational flow",
    tab_intro_overview_text: "Set admin token first and verify service health before running operations.",
    tab_intro_tasks_title: "Task operations",
    tab_intro_tasks_text: "Create tasks and track lifecycle transitions through status columns.",
    tab_intro_agents_title: "Delegation monitoring",
    tab_intro_agents_text: "Follow preparing/running/recent agents and inspect prompt/account/log context.",
    tab_intro_accounts_title: "Account operations",
    tab_intro_accounts_text: "Upload profiles, switch active account, and monitor live usage limits.",
    tab_intro_system_title: "System overrides",
    tab_intro_system_text: "Use module controls and manual fallback actions for recovery scenarios.",
    health_title: "Health",
    refresh: "Refresh",
    tasks_title: "Tasks",
    task_title_label: "Title",
    task_description_label: "Description",
    task_project_label: "Project ID",
    task_repo_label: "Repo ID",
    task_board_waiting: "Waiting",
    task_board_running: "Running",
    task_board_completed: "Completed",
    create_task: "Create task",
    table_title: "Title",
    table_status: "Status",
    table_priority: "Priority",
    held_title: "Held Queue",
    release: "Release",
    agent_cards_title: "Agent Runtime Cards",
    agent_preparing: "Preparing",
    agent_running: "Running",
    agent_recent: "Recent",
    agent_field_capability: "capability",
    agent_field_template: "template",
    agent_field_account: "account",
    agent_field_prompt: "prompt",
    agent_field_log: "log",
    memory_title: "Agent Memory",
    memory_project_label: "Project ID",
    memory_role_label: "Agent Role",
    memory_note_title_label: "Memory title",
    memory_note_content_label: "Memory content",
    create_memory_note: "Save memory",
    memory_manual_title: "Manual Memory Override (fallback)",
    memory_manual_hint:
      "Memory is injected automatically. Use this block only for manual correction.",
    accounts_title: "Account Fleet",
    profiles_title: "Auth Profiles",
    profile_label_label: "Label",
    profile_json_label: "auth.json file",
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
    no_tasks_waiting: "No tasks waiting to start.",
    no_tasks_running: "No running tasks.",
    no_tasks_completed: "No completed tasks.",
    no_held: "No tasks in WAITING_LIMIT.",
    no_profiles: "No profiles uploaded yet.",
    no_accounts: "No account cards yet.",
    no_preparing_agents: "No agents in preparing state.",
    no_running_agents: "No running agents.",
    no_recent_agents: "No recent completed/failed agents.",
    no_memory_entries: "No memory entries yet.",
    no_switch_events: "No switch events yet.",
    no_executions: "No module executions yet.",
    held_summary_count: "{count} task(s) are currently held by guard policy.",
    active_profile_none: "Active profile: none",
    active_profile_value: "Active profile: {label} ({id})",
    profile_state_active: "active",
    profile_state_inactive: "inactive",
    active_now: "active now",
    action_activate: "Activate",
    action_deactivate: "Deactivate",
    action_enable: "Enable",
    action_disable: "Disable",
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
    log_upload_requirements: "Upload requires label and auth.json file.",
    log_profile_uploaded: "Profile uploaded",
    log_profile_action_accepted: "Profile action accepted",
    log_agent_cards_refreshed: "Agent cards refreshed.",
    log_memory_refreshed: "Agent memory refreshed.",
    log_memory_created: "Memory entry created",
    log_memory_toggled: "Memory entry state updated",
    log_memory_requirements: "Memory requires project_id, agent_role, title, and content.",
    log_tab_changed: "Switched tab",
    log_account_fleet_refreshed: "Account cards refreshed.",
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
  tabIntroTitle: document.getElementById("tab-intro-title"),
  tabIntroText: document.getElementById("tab-intro-text"),
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-content]")),
  tokenForm: document.getElementById("token-form"),
  tokenInput: document.getElementById("admin-token"),
  tokenClear: document.getElementById("token-clear"),
  refreshAll: document.getElementById("refresh-all"),
  refreshHealth: document.getElementById("refresh-health"),
  liveStatus: document.getElementById("live-status"),
  readyStatus: document.getElementById("ready-status"),
  taskForm: document.getElementById("task-form"),
  refreshTasks: document.getElementById("refresh-tasks"),
  tasksWaiting: document.getElementById("tasks-waiting"),
  tasksRunning: document.getElementById("tasks-running"),
  tasksCompleted: document.getElementById("tasks-completed"),
  tasksWaitingCount: document.getElementById("tasks-waiting-count"),
  tasksRunningCount: document.getElementById("tasks-running-count"),
  tasksCompletedCount: document.getElementById("tasks-completed-count"),
  refreshAgentCards: document.getElementById("refresh-agent-cards"),
  agentsPreparing: document.getElementById("agents-preparing"),
  agentsRunning: document.getElementById("agents-running"),
  agentsRecent: document.getElementById("agents-recent"),
  refreshMemory: document.getElementById("refresh-memory"),
  memoryForm: document.getElementById("memory-form"),
  memoryList: document.getElementById("memory-list"),
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
  refreshAccountFleet: document.getElementById("refresh-account-fleet"),
  accountFleet: document.getElementById("account-fleet"),
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
  activeTab: "overview",
  tasks: [],
  agentCards: { preparing: [], running: [], recent: [] },
  memoryEntries: [],
  held: [],
  profiles: [],
  accountFleet: [],
  activeProfile: null,
  switchEvents: [],
  executions: [],
  healthLive: { ok: null, textKey: "status_unknown" },
  healthReady: { ok: null, textKey: "status_unknown" }
};

const TAB_INTRO_KEYS = {
  overview: {
    title: "tab_intro_overview_title",
    text: "tab_intro_overview_text"
  },
  tasks: {
    title: "tab_intro_tasks_title",
    text: "tab_intro_tasks_text"
  },
  agents: {
    title: "tab_intro_agents_title",
    text: "tab_intro_agents_text"
  },
  accounts: {
    title: "tab_intro_accounts_title",
    text: "tab_intro_accounts_text"
  },
  system: {
    title: "tab_intro_system_title",
    text: "tab_intro_system_text"
  }
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

function getSavedTab() {
  const value = localStorage.getItem(TAB_KEY);
  if (!value) {
    return "overview";
  }

  const normalized = String(value).trim();
  return ui.tabButtons.some((button) => button.dataset.tabTarget === normalized)
    ? normalized
    : "overview";
}

function updateTabIntro() {
  const intro = TAB_INTRO_KEYS[appState.activeTab] ?? TAB_INTRO_KEYS.overview;
  if (ui.tabIntroTitle) {
    ui.tabIntroTitle.textContent = t(intro.title);
  }
  if (ui.tabIntroText) {
    ui.tabIntroText.textContent = t(intro.text);
  }
}

function applyTabState() {
  const activeTab = appState.activeTab;

  ui.tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === activeTab;
    button.classList.toggle("tab-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  ui.tabPanels.forEach((panel) => {
    const target = panel.getAttribute("data-tab-content");
    panel.hidden = target !== activeTab;
  });

  updateTabIntro();
}

function setActiveTab(tabId, options = {}) {
  const nextTab = ui.tabButtons.some((button) => button.dataset.tabTarget === tabId)
    ? tabId
    : "overview";
  const persist = options.persist !== false;
  appState.activeTab = nextTab;
  if (persist) {
    localStorage.setItem(TAB_KEY, nextTab);
  }
  applyTabState();
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
  renderAgentCards(appState.agentCards);
  renderMemoryEntries(appState.memoryEntries);
  renderHeld(appState.held);
  renderProfiles(appState.profiles);
  renderAccountFleet(appState.accountFleet);
  renderSwitchEvents(appState.switchEvents);
  renderExecutions(appState.executions);
  applyHealthState();
  updateStats();
  applyTabState();
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

  const waitingStatuses = new Set([
    "NEW",
    "QUEUED",
    "WAITING_LIMIT",
    "WAITING_APPROVAL",
    "DRAINING_ACTIVE",
    "SWITCHING_AUTH"
  ]);
  const runningStatuses = new Set([
    "ASSIGNED",
    "STARTING",
    "RUNNING",
    "WAITING_USER",
    "INTERRUPTING",
    "INTERRUPTED",
    "REPLANNING",
    "BLOCKED",
    "FAILED_RETRYABLE"
  ]);
  const completedStatuses = new Set(["DONE", "FAILED_TERMINAL", "ARCHIVED"]);

  const buckets = {
    waiting: [],
    running: [],
    completed: []
  };

  for (const item of appState.tasks) {
    if (completedStatuses.has(item.status)) {
      buckets.completed.push(item);
      continue;
    }
    if (runningStatuses.has(item.status)) {
      buckets.running.push(item);
      continue;
    }
    if (waitingStatuses.has(item.status)) {
      buckets.waiting.push(item);
      continue;
    }

    buckets.running.push(item);
  }

  const renderBucket = (node, list, emptyKey) => {
    if (!Array.isArray(list) || list.length === 0) {
      node.innerHTML = `<li class="muted">${escapeHtml(t(emptyKey))}</li>`;
      return;
    }

    node.innerHTML = list
      .slice(0, 40)
      .map(
        (item) => `<li class="task-card">
          <div class="task-card-head">
            <span class="pill">${escapeHtml(item.status)}</span>
            <span class="account-meta">p${escapeHtml(item.priority)}</span>
          </div>
          <div class="task-card-title">${escapeHtml(item.title)}</div>
          <div class="account-meta"><code>${escapeHtml(item.id)}</code></div>
        </li>`
      )
      .join("");
  };

  renderBucket(ui.tasksWaiting, buckets.waiting, "no_tasks_waiting");
  renderBucket(ui.tasksRunning, buckets.running, "no_tasks_running");
  renderBucket(ui.tasksCompleted, buckets.completed, "no_tasks_completed");
  if (ui.tasksWaitingCount) {
    ui.tasksWaitingCount.textContent = String(buckets.waiting.length);
  }
  if (ui.tasksRunningCount) {
    ui.tasksRunningCount.textContent = String(buckets.running.length);
  }
  if (ui.tasksCompletedCount) {
    ui.tasksCompletedCount.textContent = String(buckets.completed.length);
  }
  updateStats();
}

function renderAgentCards(cards) {
  const nextCards =
    cards && typeof cards === "object"
      ? {
          preparing: Array.isArray(cards.preparing) ? cards.preparing : [],
          running: Array.isArray(cards.running) ? cards.running : [],
          recent: Array.isArray(cards.recent) ? cards.recent : []
        }
      : { preparing: [], running: [], recent: [] };
  appState.agentCards = nextCards;

  const renderBucket = (node, items, emptyKey) => {
    if (!Array.isArray(items) || items.length === 0) {
      node.innerHTML = `<li class="muted">${escapeHtml(t(emptyKey))}</li>`;
      return;
    }

    node.innerHTML = items
      .slice(0, 12)
      .map((item) => {
        const templatePart = item.target_template
          ? `${escapeHtml(item.target_template.name)} (${escapeHtml(item.target_template.model)})`
          : "n/a";
        const accountPart = item.account
          ? `${escapeHtml(item.account.label)} [${escapeHtml(item.account.status)}]`
          : "n/a";
        const promptPart = item.prompt ? escapeHtml(item.prompt) : "n/a";
        const logPart = item.log_preview ? escapeHtml(item.log_preview) : "n/a";

        return `<li class="agent-card">
          <div class="agent-card-head">
            <span class="pill">${escapeHtml(item.status)}</span>
            <code>${escapeHtml(item.id)}</code>
          </div>
          <div class="agent-card-meta">${escapeHtml(t("agent_field_capability"))}: ${escapeHtml(item.capability)}</div>
          <div class="agent-card-meta">${escapeHtml(t("agent_field_template"))}: ${templatePart}</div>
          <div class="agent-card-meta">${escapeHtml(t("agent_field_account"))}: ${accountPart}</div>
          <details class="agent-card-detail">
            <summary>${escapeHtml(t("agent_field_prompt"))}</summary>
            <pre>${promptPart}</pre>
          </details>
          <details class="agent-card-detail">
            <summary>${escapeHtml(t("agent_field_log"))}</summary>
            <pre>${logPart}</pre>
          </details>
        </li>`;
      })
      .join("");
  };

  renderBucket(ui.agentsPreparing, nextCards.preparing, "no_preparing_agents");
  renderBucket(ui.agentsRunning, nextCards.running, "no_running_agents");
  renderBucket(ui.agentsRecent, nextCards.recent, "no_recent_agents");
}

function renderMemoryEntries(items) {
  appState.memoryEntries = Array.isArray(items) ? items : [];

  if (appState.memoryEntries.length === 0) {
    ui.memoryList.innerHTML = `<li class="muted">${escapeHtml(t("no_memory_entries"))}</li>`;
    return;
  }

  ui.memoryList.innerHTML = appState.memoryEntries
    .slice(0, 30)
    .map((item) => {
      const isActive = item.is_active === true;
      const actionLabel = isActive ? t("action_disable") : t("action_enable");
      const stateClass = isActive ? "pill pill-active" : "pill";
      const stateLabel = isActive ? t("profile_state_active") : t("profile_state_inactive");
      return `<li class="memory-item">
        <div class="memory-item-head">
          <span class="memory-item-title">${escapeHtml(item.title)}</span>
          <span class="${stateClass}">${escapeHtml(stateLabel)}</span>
        </div>
        <div class="memory-item-meta"><code>${escapeHtml(item.project_id)}</code> role=${escapeHtml(item.agent_role)}</div>
        <div class="memory-item-content">${escapeHtml(item.content)}</div>
        <div class="actions">
          <button type="button" class="ghost" data-action="memory-toggle" data-id="${escapeHtml(item.id)}" data-next="${escapeHtml(String(!isActive))}">${escapeHtml(actionLabel)}</button>
        </div>
      </li>`;
    })
    .join("");
}

function renderAccountFleet(items) {
  appState.accountFleet = Array.isArray(items) ? items : [];

  if (appState.accountFleet.length === 0) {
    ui.accountFleet.innerHTML = `<p class="muted">${escapeHtml(t("no_accounts"))}</p>`;
    return;
  }

  ui.accountFleet.innerHTML = appState.accountFleet
    .map((item) => {
      const primary = item.primary_remaining_percent == null ? "n/a" : `${item.primary_remaining_percent}%`;
      const secondary =
        item.secondary_remaining_percent == null ? "n/a" : `${item.secondary_remaining_percent}%`;
      const primaryReset = item.primary_resets_at_utc ?? "n/a";
      const secondaryReset = item.secondary_resets_at_utc ?? "n/a";
      const limitSource = item.limits_error ? `error=${escapeHtml(item.limits_error)}` : "live";
      const isCurrent = appState.activeProfile && appState.activeProfile.id === item.id;
      const statusBadge = `<span class="pill">${escapeHtml(item.status)}</span>`;
      const currentBadge = isCurrent
        ? `<span class="pill pill-active">${escapeHtml(t("active_now"))}</span>`
        : "";

      return `<article class="account-card${isCurrent ? " account-card-active" : ""}">
        <div class="account-header">
          <div class="account-title">${escapeHtml(item.label)}</div>
          <div class="actions">
            ${currentBadge}
            ${statusBadge}
          </div>
        </div>
        <div class="account-meta"><code>${escapeHtml(item.id)}</code></div>
        <div class="account-meta">5h remaining=${escapeHtml(primary)} reset=${escapeHtml(primaryReset)}</div>
        <div class="account-meta">week remaining=${escapeHtml(secondary)} reset=${escapeHtml(secondaryReset)}</div>
        <div class="account-meta">limits_source=${limitSource}</div>
      </article>`;
    })
    .join("");
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
    ui.profilesBody.innerHTML = `<p class="muted">${escapeHtml(t("no_profiles"))}</p>`;
    updateStats();
    return;
  }

  ui.profilesBody.innerHTML = appState.profiles
    .map((item) => {
      const isActive = item.status === "active";
      const isCurrent = appState.activeProfile && appState.activeProfile.id === item.id;
      const state = isActive
        ? `<span class="pill pill-active">${escapeHtml(t("profile_state_active"))}</span>`
        : `<span class="pill">${escapeHtml(t("profile_state_inactive"))}</span>`;
      const current = isCurrent
        ? `<span class="pill pill-active">${escapeHtml(t("active_now"))}</span>`
        : "";

      return `<article class="profile-card${isCurrent ? " profile-card-active" : ""}">
        <div class="profile-card-head">
          <div class="profile-card-title">${escapeHtml(item.label)}</div>
          <div class="actions">
            ${current}
            ${state}
          </div>
        </div>
        <div class="profile-card-meta"><code>${escapeHtml(item.id)}</code></div>
        <div class="profile-card-actions">
          <button type="button" data-action="activate" data-id="${escapeHtml(item.id)}">${escapeHtml(t("action_activate"))}</button>
          <button type="button" data-action="deactivate" data-id="${escapeHtml(item.id)}" class="ghost">${escapeHtml(t("action_deactivate"))}</button>
        </div>
      </article>`;
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

async function refreshAgentCards() {
  const response = await requestJson("/api/delegation/cards");
  renderAgentCards(response);
}

async function refreshMemoryEntries() {
  const form = new FormData(ui.memoryForm);
  const projectId = String(form.get("project_id") ?? "").trim();
  const agentRole = String(form.get("agent_role") ?? "").trim();
  const params = new URLSearchParams();
  if (projectId) {
    params.set("project_id", projectId);
  }
  if (agentRole) {
    params.set("agent_role", agentRole.toLowerCase());
  }
  params.set("limit", "100");

  const response = await requestJson(`/api/memory/entries?${params.toString()}`);
  renderMemoryEntries(response.items);
}

async function refreshHeld() {
  const response = await requestJson("/api/queue/held");
  renderHeld(response.items);
}

async function refreshProfiles() {
  const profilesResponse = await requestJson("/api/auth-profiles/chatgpt");

  const activeResponse = await requestRaw("/api/auth-profiles/chatgpt/active");
  if (activeResponse.ok) {
    appState.activeProfile = activeResponse.payload ?? null;
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

async function refreshAccountFleet() {
  const profilesResponse = await requestJson("/api/auth-profiles/chatgpt");
  const profiles = Array.isArray(profilesResponse.items) ? profilesResponse.items : [];

  const fleet = await Promise.all(
    profiles.map(async (profile) => {
      const limitsResponse = await requestRaw(`/api/auth-profiles/chatgpt/${profile.id}/limits`);
      if (!limitsResponse.ok) {
        const payload = limitsResponse.payload;
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : `HTTP ${limitsResponse.status}`;
        return {
          id: profile.id,
          label: profile.label,
          status: profile.status,
          primary_remaining_percent: null,
          secondary_remaining_percent: null,
          primary_resets_at_utc: null,
          secondary_resets_at_utc: null,
          limits_error: message
        };
      }

      const payload = limitsResponse.payload ?? {};
      const rateLimits = payload.rate_limits && typeof payload.rate_limits === "object" ? payload.rate_limits : {};
      const primary = rateLimits.primary && typeof rateLimits.primary === "object" ? rateLimits.primary : {};
      const secondary =
        rateLimits.secondary && typeof rateLimits.secondary === "object" ? rateLimits.secondary : {};

      return {
        id: profile.id,
        label: profile.label,
        status: profile.status,
        primary_remaining_percent:
          typeof primary.remaining_percent === "number" ? primary.remaining_percent : null,
        secondary_remaining_percent:
          typeof secondary.remaining_percent === "number" ? secondary.remaining_percent : null,
        primary_resets_at_utc:
          typeof primary.resets_at_utc === "string" ? primary.resets_at_utc : null,
        secondary_resets_at_utc:
          typeof secondary.resets_at_utc === "string" ? secondary.resets_at_utc : null,
        limits_error: null
      };
    })
  );

  renderAccountFleet(fleet);
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
    ["agent-cards", refreshAgentCards],
    ["memory", refreshMemoryEntries],
    ["held", refreshHeld],
    ["profiles", refreshProfiles],
    ["account-fleet", refreshAccountFleet],
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
  setActiveTab(getSavedTab(), { persist: false });
  ui.tokenInput.value = getToken();
  applyI18n();

  ui.langSelect.addEventListener("change", (event) => {
    const nextLang = event.target.value;
    setLang(nextLang);
    applyI18n();
    log(`language set to ${nextLang}`);
  });

  ui.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.tabTarget ?? "overview";
      setActiveTab(nextTab);
      log(t("log_tab_changed"), { tab: nextTab });
    });
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

  ui.refreshAgentCards.addEventListener("click", async () => {
    try {
      await refreshAgentCards();
      updateLastRefresh();
      log(t("log_agent_cards_refreshed"));
    } catch (error) {
      log("agent cards refresh failed", { message: error.message, payload: error.payload });
    }
  });

  ui.refreshMemory.addEventListener("click", async () => {
    try {
      await refreshMemoryEntries();
      updateLastRefresh();
      log(t("log_memory_refreshed"));
    } catch (error) {
      log("memory refresh failed", { message: error.message, payload: error.payload });
    }
  });

  ui.memoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(ui.memoryForm);
    const payload = {
      project_id: String(form.get("project_id") ?? "").trim(),
      agent_role: String(form.get("agent_role") ?? "").trim().toLowerCase(),
      title: String(form.get("title") ?? "").trim(),
      content: String(form.get("content") ?? "").trim()
    };

    if (!payload.project_id || !payload.agent_role || !payload.title || !payload.content) {
      log(t("log_memory_requirements"));
      return;
    }

    try {
      const created = await requestJson("/api/memory/entries", {
        method: "POST",
        json: payload
      });
      log(t("log_memory_created"), {
        id: created.id,
        project_id: created.project_id,
        agent_role: created.agent_role
      });
      const contentInput = document.getElementById("memory-content");
      const titleInput = document.getElementById("memory-title");
      if (contentInput) {
        contentInput.value = "";
      }
      if (titleInput) {
        titleInput.value = "";
      }
      await refreshMemoryEntries();
      updateLastRefresh();
    } catch (error) {
      log("memory create failed", { message: error.message, payload: error.payload });
    }
  });

  ui.memoryList.addEventListener("click", async (event) => {
    const target = event.target.closest("button[data-action='memory-toggle']");
    if (!target) {
      return;
    }

    const id = target.dataset.id;
    const nextValue = target.dataset.next;
    if (!id || (nextValue !== "true" && nextValue !== "false")) {
      return;
    }

    try {
      const response = await requestJson(`/api/memory/entries/${id}`, {
        method: "PATCH",
        json: {
          is_active: nextValue === "true"
        }
      });
      log(t("log_memory_toggled"), {
        id: response.id,
        is_active: response.is_active
      });
      await refreshMemoryEntries();
      updateLastRefresh();
    } catch (error) {
      log("memory toggle failed", { message: error.message, payload: error.payload });
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
      await Promise.all([refreshProfiles(), refreshAccountFleet(), refreshSwitchEvents()]);
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
      await Promise.all([refreshProfiles(), refreshAccountFleet()]);
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
      await Promise.all([
        refreshProfiles(),
        refreshAccountFleet(),
        refreshHeld(),
        refreshSwitchEvents(),
        refreshTasks()
      ]);
      updateLastRefresh();
    } catch (error) {
      log(`profile ${action} failed`, { message: error.message, payload: error.payload });
    }
  });

  ui.refreshAccountFleet.addEventListener("click", async () => {
    try {
      await refreshAccountFleet();
      updateLastRefresh();
      log(t("log_account_fleet_refreshed"));
    } catch (error) {
      log("account fleet refresh failed", { message: error.message, payload: error.payload });
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
