const TOKEN_KEY = "codex_orchestrator_admin_token";
const LANG_KEY = "codex_orchestrator_lang";
const TAB_KEY = "codex_orchestrator_tab";
const ACCOUNTS_TAB_KEY = "codex_orchestrator_accounts_tab";
const TASK_FILTERS_KEY = "codex_orchestrator_task_filters";
const SWITCH_FILTERS_KEY = "codex_orchestrator_switch_filters";
const AUTOREFRESH_KEY = "codex_orchestrator_autorefresh";
const TASK_FORM_COLLAPSED_KEY = "codex_orchestrator_task_form_collapsed";
const SWITCH_MODULE_KEY = "switch_chatgpt_auth_on_limit";
const MAX_LOG_LINES = 150;
const AUTOREFRESH_INTERVAL_MS = 15000;

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
    autorefresh_label: "авто",
    panel_state_idle: "idle",
    panel_state_loading: "loading",
    panel_state_success: "ok",
    panel_state_error: "error",
    panel_state_token: "нужен токен",
    tasks_title: "Задачи",
    task_create_toggle: "Создать задачу",
    task_title_label: "Заголовок",
    task_description_label: "Описание",
    task_project_label: "Project ID",
    task_repo_label: "Repo ID",
    task_filter_search_label: "Поиск",
    task_filter_search_placeholder: "id/заголовок/описание",
    task_filter_project_label: "Project",
    task_filter_status_label: "Status",
    task_filter_any_project: "Все проекты",
    task_filter_any_status: "Все статусы",
    task_filter_clear: "Сбросить фильтры",
    task_board_waiting: "Ожидает запуска",
    task_board_running: "Запущена",
    task_board_completed: "Выполнена",
    task_details_title: "Детали задачи",
    task_details_empty: "Выбери карточку задачи, чтобы посмотреть детали.",
    task_details_not_found: "Выбранная задача не найдена в текущем списке.",
    task_field_id: "id",
    task_field_status: "status",
    task_field_priority: "priority",
    task_field_project: "project",
    task_field_repo: "repo",
    task_field_branch: "branch",
    task_field_created: "created_at",
    task_field_updated: "updated_at",
    task_field_description: "description",
    task_field_na: "n/a",
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
    agent_inspector_title: "Инспектор агента",
    agent_inspector_empty: "Выбери карточку агента, чтобы посмотреть prompt и log.",
    agent_field_id: "id",
    agent_field_status: "status",
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
    memory_manual_warning:
      "Advanced mode: используй только для ручного восстановления потока, основной сценарий памяти автоматический.",
    memory_manual_hint:
      "Память подмешивается автоматически. Этот блок нужен только для ручной коррекции.",
    accounts_title: "Аккаунты",
    accounts_subtab_profiles: "Профили",
    accounts_subtab_limits: "Лимиты",
    accounts_subtab_history: "История",
    account_limits_summary: "5h={primary} / week={secondary}",
    account_limits_5h: "5h remaining={remaining} reset={reset}",
    account_limits_week: "week remaining={remaining} reset={reset}",
    account_limits_source: "limits_source={source}",
    profiles_title: "Auth-профили",
    profile_label_label: "Метка",
    profile_json_label: "Файл auth.json",
    upload_profile: "Загрузить профиль",
    table_label: "Метка",
    table_state: "Состояние",
    table_actions: "Действия",
    events_title: "История переключений",
    switch_filter_search_label: "Поиск",
    switch_filter_search_placeholder: "reason/profile/status",
    switch_filter_status_label: "Status",
    switch_filter_profile_label: "Profile",
    switch_filter_any_status: "Все статусы",
    switch_filter_any_profile: "Все профили",
    switch_filter_clear: "Сбросить фильтры",
    switch_event_from_to: "from={from} to={to}",
    switch_event_started_at: "started_at={value}",
    switch_event_ended_at: "ended_at={value}",
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
    log_accounts_tab_changed: "Переключена вкладка аккаунтов",
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
    autorefresh_label: "auto",
    panel_state_idle: "idle",
    panel_state_loading: "loading",
    panel_state_success: "ok",
    panel_state_error: "error",
    panel_state_token: "token required",
    tasks_title: "Tasks",
    task_create_toggle: "Create task",
    task_title_label: "Title",
    task_description_label: "Description",
    task_project_label: "Project ID",
    task_repo_label: "Repo ID",
    task_filter_search_label: "Search",
    task_filter_search_placeholder: "id/title/description",
    task_filter_project_label: "Project",
    task_filter_status_label: "Status",
    task_filter_any_project: "All projects",
    task_filter_any_status: "All statuses",
    task_filter_clear: "Clear filters",
    task_board_waiting: "Waiting",
    task_board_running: "Running",
    task_board_completed: "Completed",
    task_details_title: "Task details",
    task_details_empty: "Select a task card to inspect details.",
    task_details_not_found: "Selected task is not in the current list.",
    task_field_id: "id",
    task_field_status: "status",
    task_field_priority: "priority",
    task_field_project: "project",
    task_field_repo: "repo",
    task_field_branch: "branch",
    task_field_created: "created_at",
    task_field_updated: "updated_at",
    task_field_description: "description",
    task_field_na: "n/a",
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
    agent_inspector_title: "Agent inspector",
    agent_inspector_empty: "Select an agent card to inspect full prompt and log.",
    agent_field_id: "id",
    agent_field_status: "status",
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
    memory_manual_warning:
      "Advanced mode: use only for manual recovery; automatic memory flow remains the primary path.",
    memory_manual_hint:
      "Memory is injected automatically. Use this block only for manual correction.",
    accounts_title: "Account Fleet",
    accounts_subtab_profiles: "Profiles",
    accounts_subtab_limits: "Limits",
    accounts_subtab_history: "History",
    account_limits_summary: "5h={primary} / week={secondary}",
    account_limits_5h: "5h remaining={remaining} reset={reset}",
    account_limits_week: "week remaining={remaining} reset={reset}",
    account_limits_source: "limits_source={source}",
    profiles_title: "Auth Profiles",
    profile_label_label: "Label",
    profile_json_label: "auth.json file",
    upload_profile: "Upload profile",
    table_label: "Label",
    table_state: "State",
    table_actions: "Actions",
    events_title: "Switch Events",
    switch_filter_search_label: "Search",
    switch_filter_search_placeholder: "reason/profile/status",
    switch_filter_status_label: "Status",
    switch_filter_profile_label: "Profile",
    switch_filter_any_status: "All statuses",
    switch_filter_any_profile: "All profiles",
    switch_filter_clear: "Clear filters",
    switch_event_from_to: "from={from} to={to}",
    switch_event_started_at: "started_at={value}",
    switch_event_ended_at: "ended_at={value}",
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
    log_accounts_tab_changed: "Switched accounts tab",
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
  taskCreateShell: document.getElementById("task-create-shell"),
  taskForm: document.getElementById("task-form"),
  refreshTasks: document.getElementById("refresh-tasks"),
  toggleAutoRefreshTasks: document.getElementById("toggle-autorefresh-tasks"),
  tasksPanelState: document.getElementById("tasks-panel-state"),
  taskFilterSearch: document.getElementById("task-filter-search"),
  taskFilterProject: document.getElementById("task-filter-project"),
  taskFilterStatus: document.getElementById("task-filter-status"),
  taskFilterClear: document.getElementById("task-filter-clear"),
  tasksWaiting: document.getElementById("tasks-waiting"),
  tasksRunning: document.getElementById("tasks-running"),
  tasksCompleted: document.getElementById("tasks-completed"),
  tasksWaitingCount: document.getElementById("tasks-waiting-count"),
  tasksRunningCount: document.getElementById("tasks-running-count"),
  tasksCompletedCount: document.getElementById("tasks-completed-count"),
  taskDetailsContent: document.getElementById("task-details-content"),
  refreshAgentCards: document.getElementById("refresh-agent-cards"),
  toggleAutoRefreshAgents: document.getElementById("toggle-autorefresh-agents"),
  agentsPanelState: document.getElementById("agents-panel-state"),
  agentsPreparing: document.getElementById("agents-preparing"),
  agentsRunning: document.getElementById("agents-running"),
  agentsRecent: document.getElementById("agents-recent"),
  agentsPreparingCount: document.getElementById("agents-preparing-count"),
  agentsRunningCount: document.getElementById("agents-running-count"),
  agentsRecentCount: document.getElementById("agents-recent-count"),
  agentInspectorEmpty: document.getElementById("agent-inspector-empty"),
  agentInspectorContent: document.getElementById("agent-inspector-content"),
  agentInspectorId: document.getElementById("agent-inspector-id"),
  agentInspectorStatus: document.getElementById("agent-inspector-status"),
  agentInspectorCapability: document.getElementById("agent-inspector-capability"),
  agentInspectorTemplate: document.getElementById("agent-inspector-template"),
  agentInspectorAccount: document.getElementById("agent-inspector-account"),
  agentInspectorPrompt: document.getElementById("agent-inspector-prompt"),
  agentInspectorLog: document.getElementById("agent-inspector-log"),
  refreshMemory: document.getElementById("refresh-memory"),
  memoryPanelState: document.getElementById("memory-panel-state"),
  memoryForm: document.getElementById("memory-form"),
  memoryList: document.getElementById("memory-list"),
  refreshHeld: document.getElementById("refresh-held"),
  heldPanelState: document.getElementById("held-panel-state"),
  releaseHeld: document.getElementById("release-held"),
  heldSummary: document.getElementById("held-summary"),
  heldList: document.getElementById("held-list"),
  uploadForm: document.getElementById("upload-form"),
  accountTabButtons: Array.from(document.querySelectorAll(".account-tab-button")),
  accountPanels: Array.from(document.querySelectorAll("[data-accounts-panel]")),
  refreshProfiles: document.getElementById("refresh-profiles"),
  profilesPanelState: document.getElementById("profiles-panel-state"),
  activeProfile: document.getElementById("active-profile"),
  profilesBody: document.getElementById("profiles-body"),
  refreshSwitchEvents: document.getElementById("refresh-switch-events"),
  toggleAutoRefreshEvents: document.getElementById("toggle-autorefresh-events"),
  eventsPanelState: document.getElementById("events-panel-state"),
  switchFilterSearch: document.getElementById("switch-filter-search"),
  switchFilterStatus: document.getElementById("switch-filter-status"),
  switchFilterProfile: document.getElementById("switch-filter-profile"),
  switchFilterClear: document.getElementById("switch-filter-clear"),
  switchEvents: document.getElementById("switch-events"),
  refreshAccountFleet: document.getElementById("refresh-account-fleet"),
  limitsPanelState: document.getElementById("limits-panel-state"),
  accountFleet: document.getElementById("account-fleet"),
  moduleForm: document.getElementById("module-form"),
  moduleEnabled: document.getElementById("module-enabled"),
  moduleConfig: document.getElementById("module-config"),
  modulePanelState: document.getElementById("module-panel-state"),
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
  activeAccountsTab: "profiles",
  taskFilters: {
    search: "",
    project: "all",
    status: "all"
  },
  switchFilters: {
    search: "",
    status: "all",
    profile: "all"
  },
  selectedTaskId: null,
  selectedAgentId: null,
  selectedAgentBucket: "running",
  autoRefresh: {
    tasks: false,
    agents: false,
    events: false
  },
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
  healthReady: { ok: null, textKey: "status_unknown" },
  intervals: {
    tasks: null,
    agents: null,
    events: null
  }
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

function parseJsonStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
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

function getSavedAccountsTab() {
  const value = localStorage.getItem(ACCOUNTS_TAB_KEY);
  if (!value) {
    return "profiles";
  }

  const normalized = String(value).trim();
  return ui.accountTabButtons.some((button) => button.dataset.accountsTarget === normalized)
    ? normalized
    : "profiles";
}

function getSavedTaskFilters() {
  const parsed = parseJsonStorage(TASK_FILTERS_KEY, {});
  return {
    search: typeof parsed.search === "string" ? parsed.search : "",
    project: typeof parsed.project === "string" ? parsed.project : "all",
    status: typeof parsed.status === "string" ? parsed.status : "all"
  };
}

function saveTaskFilters() {
  localStorage.setItem(TASK_FILTERS_KEY, JSON.stringify(appState.taskFilters));
}

function getSavedSwitchFilters() {
  const parsed = parseJsonStorage(SWITCH_FILTERS_KEY, {});
  return {
    search: typeof parsed.search === "string" ? parsed.search : "",
    status: typeof parsed.status === "string" ? parsed.status : "all",
    profile: typeof parsed.profile === "string" ? parsed.profile : "all"
  };
}

function saveSwitchFilters() {
  localStorage.setItem(SWITCH_FILTERS_KEY, JSON.stringify(appState.switchFilters));
}

function getSavedAutoRefresh() {
  const parsed = parseJsonStorage(AUTOREFRESH_KEY, {});
  return {
    tasks: parsed.tasks === true,
    agents: parsed.agents === true,
    events: parsed.events === true
  };
}

function saveAutoRefresh() {
  localStorage.setItem(AUTOREFRESH_KEY, JSON.stringify(appState.autoRefresh));
}

function formatDateTime(value) {
  if (!value) {
    return t("task_field_na");
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return t("task_field_na");
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } catch {
    return t("task_field_na");
  }
}

function trimPreview(value, maxLength = 140) {
  if (!value) {
    return "";
  }
  const normalized = String(value).trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function setPanelState(node, state) {
  if (!node) {
    return;
  }

  node.classList.remove("panel-state-idle", "panel-state-loading", "panel-state-success", "panel-state-error");
  node.classList.add(`panel-state-${state}`);
  const key = `panel_state_${state}`;
  node.textContent = t(key);
}

function syncPanelStateLabel(node) {
  if (!node) {
    return;
  }

  if (node.classList.contains("panel-state-loading")) {
    node.textContent = t("panel_state_loading");
    return;
  }
  if (node.classList.contains("panel-state-success")) {
    node.textContent = t("panel_state_success");
    return;
  }
  if (node.classList.contains("panel-state-error")) {
    node.textContent = t("panel_state_error");
    return;
  }
  node.textContent = t("panel_state_idle");
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

function applyAccountsTabState() {
  ui.accountTabButtons.forEach((button) => {
    const target = button.dataset.accountsTarget;
    const isActive = target === appState.activeAccountsTab;
    button.classList.toggle("account-tab-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  ui.accountPanels.forEach((panel) => {
    const target = panel.getAttribute("data-accounts-panel");
    panel.hidden = target !== appState.activeAccountsTab;
  });
}

function setActiveAccountsTab(tabId, options = {}) {
  const nextTab = ui.accountTabButtons.some((button) => button.dataset.accountsTarget === tabId)
    ? tabId
    : "profiles";
  appState.activeAccountsTab = nextTab;
  if (options.persist !== false) {
    localStorage.setItem(ACCOUNTS_TAB_KEY, nextTab);
  }
  applyAccountsTabState();
}

function clearRefreshInterval(name) {
  const handle = appState.intervals[name];
  if (handle) {
    clearInterval(handle);
    appState.intervals[name] = null;
  }
}

function startRefreshInterval(name, run) {
  clearRefreshInterval(name);
  appState.intervals[name] = setInterval(() => {
    if (!getToken()) {
      return;
    }
    void run().catch((error) => {
      log(`${name} ${t("error_failed")}`, { message: error.message, payload: error.payload });
    });
  }, AUTOREFRESH_INTERVAL_MS);
}

function syncAutoRefreshTimers() {
  if (appState.autoRefresh.tasks) {
    startRefreshInterval("tasks", async () => {
      await Promise.all([refreshTasks(), refreshHeld()]);
      updateLastRefresh();
    });
  } else {
    clearRefreshInterval("tasks");
  }

  if (appState.autoRefresh.agents) {
    startRefreshInterval("agents", async () => {
      await refreshAgentCards();
      updateLastRefresh();
    });
  } else {
    clearRefreshInterval("agents");
  }

  if (appState.autoRefresh.events) {
    startRefreshInterval("events", async () => {
      await refreshSwitchEvents();
      updateLastRefresh();
    });
  } else {
    clearRefreshInterval("events");
  }
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
  applyAccountsTabState();
  [
    ui.tasksPanelState,
    ui.heldPanelState,
    ui.agentsPanelState,
    ui.profilesPanelState,
    ui.limitsPanelState,
    ui.eventsPanelState,
    ui.modulePanelState,
    ui.memoryPanelState
  ].forEach(syncPanelStateLabel);
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

async function withPanelState(node, fn) {
  setPanelState(node, "loading");
  try {
    const result = await fn();
    setPanelState(node, "success");
    return result;
  } catch (error) {
    setPanelState(node, "error");
    throw error;
  }
}

function syncTaskFilterControls(sourceItems) {
  if (!ui.taskFilterProject || !ui.taskFilterStatus || !ui.taskFilterSearch) {
    return;
  }

  ui.taskFilterSearch.value = appState.taskFilters.search;

  const projects = Array.from(
    new Set(
      sourceItems
        .map((item) => (item && typeof item.project_id === "string" ? item.project_id : ""))
        .filter((value) => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

  const statuses = Array.from(
    new Set(
      sourceItems
        .map((item) => (item && typeof item.status === "string" ? item.status : ""))
        .filter((value) => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

  ui.taskFilterProject.innerHTML = [
    `<option value="all">${escapeHtml(t("task_filter_any_project"))}</option>`,
    ...projects.map((project) => `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`)
  ].join("");

  ui.taskFilterStatus.innerHTML = [
    `<option value="all">${escapeHtml(t("task_filter_any_status"))}</option>`,
    ...statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`)
  ].join("");

  ui.taskFilterProject.value = projects.includes(appState.taskFilters.project)
    ? appState.taskFilters.project
    : "all";
  ui.taskFilterStatus.value = statuses.includes(appState.taskFilters.status)
    ? appState.taskFilters.status
    : "all";

  if (ui.taskFilterProject.value !== appState.taskFilters.project) {
    appState.taskFilters.project = ui.taskFilterProject.value;
    saveTaskFilters();
  }
  if (ui.taskFilterStatus.value !== appState.taskFilters.status) {
    appState.taskFilters.status = ui.taskFilterStatus.value;
    saveTaskFilters();
  }
}

function renderTaskDetails(task) {
  if (!ui.taskDetailsContent) {
    return;
  }

  if (!task) {
    ui.taskDetailsContent.textContent = t("task_details_empty");
    return;
  }

  const rows = [
    [t("task_field_id"), `<code>${escapeHtml(task.id)}</code>`],
    [t("task_field_status"), escapeHtml(task.status ?? t("task_field_na"))],
    [t("task_field_priority"), escapeHtml(String(task.priority ?? t("task_field_na")) )],
    [t("task_field_project"), escapeHtml(task.project_id ?? t("task_field_na"))],
    [t("task_field_repo"), escapeHtml(task.repo_id ?? t("task_field_na"))],
    [t("task_field_branch"), escapeHtml(task.branch ?? t("task_field_na"))],
    [t("task_field_created"), escapeHtml(formatDateTime(task.created_at))],
    [t("task_field_updated"), escapeHtml(formatDateTime(task.updated_at))],
    [t("task_field_description"), escapeHtml(task.description ?? t("task_field_na"))]
  ];

  ui.taskDetailsContent.innerHTML = rows
    .map(
      ([label, value]) => `<div class="task-detail-row">
      <span class="task-detail-label">${escapeHtml(label)}</span>
      <span class="task-detail-value">${value}</span>
    </div>`
    )
    .join("");
}

function renderTasks(items) {
  appState.tasks = Array.isArray(items) ? items : [];
  syncTaskFilterControls(appState.tasks);

  const search = appState.taskFilters.search.trim().toLowerCase();
  const filteredTasks = appState.tasks.filter((task) => {
    if (appState.taskFilters.project !== "all" && task.project_id !== appState.taskFilters.project) {
      return false;
    }
    if (appState.taskFilters.status !== "all" && task.status !== appState.taskFilters.status) {
      return false;
    }
    if (!search) {
      return true;
    }

    const haystack = `${task.id ?? ""} ${task.title ?? ""} ${task.description ?? ""}`.toLowerCase();
    return haystack.includes(search);
  });

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

  for (const item of filteredTasks) {
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

  const allFiltered = [...buckets.waiting, ...buckets.running, ...buckets.completed];
  if (!allFiltered.some((task) => task.id === appState.selectedTaskId)) {
    appState.selectedTaskId = null;
  }

  const renderBucket = (node, list, emptyKey) => {
    if (!Array.isArray(list) || list.length === 0) {
      node.innerHTML = `<li class="muted">${escapeHtml(t(emptyKey))}</li>`;
      return;
    }

    node.innerHTML = list
      .slice(0, 60)
      .map((item) => {
        const selectedClass = appState.selectedTaskId === item.id ? " task-card-selected" : "";
        return `<li class="task-card${selectedClass}" data-task-id="${escapeHtml(item.id)}">
          <div class="task-card-head">
            <span class="pill">${escapeHtml(item.status)}</span>
            <span class="account-meta">p${escapeHtml(item.priority)}</span>
          </div>
          <div class="task-card-title">${escapeHtml(item.title)}</div>
          <div class="account-meta"><code>${escapeHtml(item.id)}</code></div>
          <div class="account-meta">${escapeHtml(trimPreview(item.description ?? ""))}</div>
        </li>`;
      })
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

  const selectedTask = filteredTasks.find((task) => task.id === appState.selectedTaskId) ?? null;
  renderTaskDetails(selectedTask);
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
  const allCards = [...nextCards.preparing, ...nextCards.running, ...nextCards.recent];

  if (!allCards.some((item) => item.id === appState.selectedAgentId)) {
    appState.selectedAgentId = null;
  }

  if (!appState.selectedAgentId && allCards.length > 0) {
    const preferred =
      nextCards.running[0] ??
      nextCards.preparing[0] ??
      nextCards.recent[0] ??
      null;
    if (preferred) {
      appState.selectedAgentId = preferred.id;
    }
  }

  const renderBucket = (node, items, emptyKey, bucket) => {
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
        const selectedClass = appState.selectedAgentId === item.id ? " agent-card-selected" : "";

        return `<li class="agent-card${selectedClass}" data-agent-id="${escapeHtml(item.id)}" data-agent-bucket="${escapeHtml(bucket)}">
          <div class="agent-card-head">
            <span class="pill">${escapeHtml(item.status)}</span>
            <code>${escapeHtml(item.id)}</code>
          </div>
          <div class="agent-card-meta">${escapeHtml(t("agent_field_capability"))}: ${escapeHtml(item.capability)}</div>
          <div class="agent-card-meta">${escapeHtml(t("agent_field_template"))}: ${templatePart}</div>
          <div class="agent-card-meta">${escapeHtml(t("agent_field_account"))}: ${accountPart}</div>
        </li>`;
      })
      .join("");
  };

  renderBucket(ui.agentsPreparing, nextCards.preparing, "no_preparing_agents", "preparing");
  renderBucket(ui.agentsRunning, nextCards.running, "no_running_agents", "running");
  renderBucket(ui.agentsRecent, nextCards.recent, "no_recent_agents", "recent");

  if (ui.agentsPreparingCount) {
    ui.agentsPreparingCount.textContent = String(nextCards.preparing.length);
  }
  if (ui.agentsRunningCount) {
    ui.agentsRunningCount.textContent = String(nextCards.running.length);
  }
  if (ui.agentsRecentCount) {
    ui.agentsRecentCount.textContent = String(nextCards.recent.length);
  }

  const selectedCard = allCards.find((item) => item.id === appState.selectedAgentId) ?? null;
  if (!selectedCard || !ui.agentInspectorContent || !ui.agentInspectorEmpty) {
    if (ui.agentInspectorContent) {
      ui.agentInspectorContent.hidden = true;
    }
    if (ui.agentInspectorEmpty) {
      ui.agentInspectorEmpty.hidden = false;
      ui.agentInspectorEmpty.textContent = t("agent_inspector_empty");
    }
    return;
  }

  const templatePart = selectedCard.target_template
    ? `${selectedCard.target_template.name} (${selectedCard.target_template.model})`
    : t("task_field_na");
  const accountPart = selectedCard.account
    ? `${selectedCard.account.label} [${selectedCard.account.status}]`
    : t("task_field_na");

  ui.agentInspectorId.textContent = selectedCard.id ?? t("task_field_na");
  ui.agentInspectorStatus.textContent = selectedCard.status ?? t("task_field_na");
  ui.agentInspectorCapability.textContent = selectedCard.capability ?? t("task_field_na");
  ui.agentInspectorTemplate.textContent = templatePart;
  ui.agentInspectorAccount.textContent = accountPart;
  ui.agentInspectorPrompt.textContent = selectedCard.prompt ?? t("task_field_na");
  ui.agentInspectorLog.textContent = selectedCard.log_preview ?? t("task_field_na");
  ui.agentInspectorContent.hidden = false;
  ui.agentInspectorEmpty.hidden = true;
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
        <details class="agent-card-detail">
          <summary>${escapeHtml(t("account_limits_summary", { primary, secondary }))}</summary>
          <div class="account-meta">${escapeHtml(t("account_limits_5h", { remaining: primary, reset: primaryReset }))}</div>
          <div class="account-meta">${escapeHtml(t("account_limits_week", { remaining: secondary, reset: secondaryReset }))}</div>
          <div class="account-meta">${escapeHtml(t("account_limits_source", { source: limitSource }))}</div>
        </details>
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
  const allStatuses = Array.from(
    new Set(
      appState.switchEvents
        .map((eventItem) => (typeof eventItem.status === "string" ? eventItem.status : ""))
        .filter((value) => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

  const allProfiles = Array.from(
    new Set(
      appState.switchEvents
        .flatMap((eventItem) => [eventItem.from_auth_profile_id, eventItem.to_auth_profile_id])
        .filter((value) => typeof value === "string" && value.trim())
    )
  ).sort((a, b) => a.localeCompare(b));

  if (ui.switchFilterStatus) {
    ui.switchFilterStatus.innerHTML = [
      `<option value="all">${escapeHtml(t("switch_filter_any_status"))}</option>`,
      ...allStatuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`)
    ].join("");
    ui.switchFilterStatus.value = allStatuses.includes(appState.switchFilters.status)
      ? appState.switchFilters.status
      : "all";
    appState.switchFilters.status = ui.switchFilterStatus.value;
  }

  if (ui.switchFilterProfile) {
    ui.switchFilterProfile.innerHTML = [
      `<option value="all">${escapeHtml(t("switch_filter_any_profile"))}</option>`,
      ...allProfiles.map((profileId) => `<option value="${escapeHtml(profileId)}">${escapeHtml(profileId)}</option>`)
    ].join("");
    ui.switchFilterProfile.value = allProfiles.includes(appState.switchFilters.profile)
      ? appState.switchFilters.profile
      : "all";
    appState.switchFilters.profile = ui.switchFilterProfile.value;
  }

  if (ui.switchFilterSearch) {
    ui.switchFilterSearch.value = appState.switchFilters.search;
  }

  if (appState.switchEvents.length === 0) {
    ui.switchEvents.innerHTML = `<li class="muted">${escapeHtml(t("no_switch_events"))}</li>`;
    updateStats();
    return;
  }

  const search = appState.switchFilters.search.trim().toLowerCase();
  const filtered = appState.switchEvents.filter((eventItem) => {
    if (appState.switchFilters.status !== "all" && eventItem.status !== appState.switchFilters.status) {
      return false;
    }

    if (appState.switchFilters.profile !== "all") {
      const from = typeof eventItem.from_auth_profile_id === "string" ? eventItem.from_auth_profile_id : "";
      const to = typeof eventItem.to_auth_profile_id === "string" ? eventItem.to_auth_profile_id : "";
      if (from !== appState.switchFilters.profile && to !== appState.switchFilters.profile) {
        return false;
      }
    }

    if (!search) {
      return true;
    }

    const haystack = `${eventItem.status ?? ""} ${eventItem.reason ?? ""} ${eventItem.from_auth_profile_id ?? ""} ${eventItem.to_auth_profile_id ?? ""}`.toLowerCase();
    return haystack.includes(search);
  });

  if (filtered.length === 0) {
    ui.switchEvents.innerHTML = `<li class="muted">${escapeHtml(t("no_switch_events"))}</li>`;
    updateStats();
    return;
  }

  ui.switchEvents.innerHTML = filtered
    .slice(0, 40)
    .map((eventItem) => {
      const from = eventItem.from_auth_profile_id ?? "none";
      const to = eventItem.to_auth_profile_id ?? "none";
      const startAt = formatDateTime(eventItem.started_at);
      const endAt = formatDateTime(eventItem.ended_at);
      return `<li>
        <details class="agent-card-detail">
          <summary><span class="pill">${escapeHtml(eventItem.status)}</span> ${escapeHtml(eventItem.reason)} (${escapeHtml(from)} -> ${escapeHtml(to)})</summary>
          <div class="account-meta">${escapeHtml(t("switch_event_from_to", { from, to }))}</div>
          <div class="account-meta">${escapeHtml(t("switch_event_started_at", { value: startAt }))}</div>
          <div class="account-meta">${escapeHtml(t("switch_event_ended_at", { value: endAt }))}</div>
        </details>
      </li>`;
    })
    .join("");

  saveSwitchFilters();
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
  return withPanelState(ui.tasksPanelState, async () => {
    const response = await requestJson("/api/tasks");
    renderTasks(response.items);
  });
}

async function refreshAgentCards() {
  return withPanelState(ui.agentsPanelState, async () => {
    const response = await requestJson("/api/delegation/cards");
    renderAgentCards(response);
  });
}

async function refreshMemoryEntries() {
  return withPanelState(ui.memoryPanelState, async () => {
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
  });
}

async function refreshHeld() {
  return withPanelState(ui.heldPanelState, async () => {
    const response = await requestJson("/api/queue/held");
    renderHeld(response.items);
  });
}

async function refreshProfiles() {
  return withPanelState(ui.profilesPanelState, async () => {
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
  });
}

async function refreshAccountFleet() {
  return withPanelState(ui.limitsPanelState, async () => {
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
  });
}

async function refreshSwitchEvents() {
  return withPanelState(ui.eventsPanelState, async () => {
    const response = await requestJson("/api/auth-profiles/chatgpt/switch-events");
    renderSwitchEvents(response.items);
  });
}

async function refreshModule() {
  return withPanelState(ui.modulePanelState, async () => {
    const response = await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}`);
    ui.moduleEnabled.checked = Boolean(response.is_enabled);
    ui.moduleConfig.value = JSON.stringify(response.config_json ?? {}, null, 2);
  });
}

async function refreshExecutions() {
  const response = await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}/executions`);
  renderExecutions(response.items);
}

async function refreshProtectedPanels() {
  if (!getToken()) {
    log(t("log_protected_skipped"));
    [
      ui.tasksPanelState,
      ui.heldPanelState,
      ui.agentsPanelState,
      ui.profilesPanelState,
      ui.limitsPanelState,
      ui.eventsPanelState,
      ui.modulePanelState,
      ui.memoryPanelState
    ].forEach((node) => {
      if (!node) {
        return;
      }
      setPanelState(node, "idle");
      node.textContent = t("panel_state_token");
    });
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
  appState.taskFilters = getSavedTaskFilters();
  appState.switchFilters = getSavedSwitchFilters();
  appState.autoRefresh = getSavedAutoRefresh();
  setActiveTab(getSavedTab(), { persist: false });
  setActiveAccountsTab(getSavedAccountsTab(), { persist: false });
  ui.tokenInput.value = getToken();
  if (ui.taskCreateShell && localStorage.getItem(TASK_FORM_COLLAPSED_KEY) === "1") {
    ui.taskCreateShell.open = false;
  }
  if (ui.toggleAutoRefreshTasks) {
    ui.toggleAutoRefreshTasks.checked = appState.autoRefresh.tasks;
  }
  if (ui.toggleAutoRefreshAgents) {
    ui.toggleAutoRefreshAgents.checked = appState.autoRefresh.agents;
  }
  if (ui.toggleAutoRefreshEvents) {
    ui.toggleAutoRefreshEvents.checked = appState.autoRefresh.events;
  }
  applyI18n();
  syncAutoRefreshTimers();

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

  ui.accountTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.accountsTarget ?? "profiles";
      setActiveAccountsTab(nextTab);
      log(t("log_accounts_tab_changed"), { tab: nextTab });
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

  ui.taskFilterSearch?.addEventListener("input", (event) => {
    appState.taskFilters.search = String(event.target.value ?? "");
    saveTaskFilters();
    renderTasks(appState.tasks);
  });

  ui.taskFilterProject?.addEventListener("change", (event) => {
    appState.taskFilters.project = String(event.target.value ?? "all");
    saveTaskFilters();
    renderTasks(appState.tasks);
  });

  ui.taskFilterStatus?.addEventListener("change", (event) => {
    appState.taskFilters.status = String(event.target.value ?? "all");
    saveTaskFilters();
    renderTasks(appState.tasks);
  });

  ui.taskFilterClear?.addEventListener("click", () => {
    appState.taskFilters = { search: "", project: "all", status: "all" };
    saveTaskFilters();
    renderTasks(appState.tasks);
  });

  const handleTaskCardSelection = (event) => {
    const card = event.target.closest("[data-task-id]");
    if (!card) {
      return;
    }
    const taskId = card.dataset.taskId;
    if (!taskId) {
      return;
    }
    appState.selectedTaskId = taskId;
    renderTasks(appState.tasks);
  };

  ui.tasksWaiting?.addEventListener("click", handleTaskCardSelection);
  ui.tasksRunning?.addEventListener("click", handleTaskCardSelection);
  ui.tasksCompleted?.addEventListener("click", handleTaskCardSelection);

  ui.refreshAgentCards.addEventListener("click", async () => {
    try {
      await refreshAgentCards();
      updateLastRefresh();
      log(t("log_agent_cards_refreshed"));
    } catch (error) {
      log("agent cards refresh failed", { message: error.message, payload: error.payload });
    }
  });

  const handleAgentCardSelection = (event) => {
    const card = event.target.closest("[data-agent-id]");
    if (!card) {
      return;
    }
    const agentId = card.dataset.agentId;
    const bucket = card.dataset.agentBucket;
    if (!agentId) {
      return;
    }
    appState.selectedAgentId = agentId;
    if (bucket) {
      appState.selectedAgentBucket = bucket;
    }
    renderAgentCards(appState.agentCards);
  };

  ui.agentsPreparing?.addEventListener("click", handleAgentCardSelection);
  ui.agentsRunning?.addEventListener("click", handleAgentCardSelection);
  ui.agentsRecent?.addEventListener("click", handleAgentCardSelection);

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
      const taskProjectInput = document.getElementById("task-project");
      const taskRepoInput = document.getElementById("task-repo");
      if (taskProjectInput) {
        taskProjectInput.value = "web-ui";
      }
      if (taskRepoInput) {
        taskRepoInput.value = "web-ui";
      }
      if (ui.taskCreateShell && localStorage.getItem(TASK_FORM_COLLAPSED_KEY) !== "1") {
        ui.taskCreateShell.open = false;
        localStorage.setItem(TASK_FORM_COLLAPSED_KEY, "1");
      }
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

  ui.toggleAutoRefreshTasks?.addEventListener("change", async (event) => {
    appState.autoRefresh.tasks = Boolean(event.target.checked);
    saveAutoRefresh();
    syncAutoRefreshTimers();
    if (appState.autoRefresh.tasks && getToken()) {
      try {
        await Promise.all([refreshTasks(), refreshHeld()]);
        updateLastRefresh();
      } catch (error) {
        log("tasks auto-refresh bootstrap failed", { message: error.message, payload: error.payload });
      }
    }
  });

  ui.toggleAutoRefreshAgents?.addEventListener("change", async (event) => {
    appState.autoRefresh.agents = Boolean(event.target.checked);
    saveAutoRefresh();
    syncAutoRefreshTimers();
    if (appState.autoRefresh.agents && getToken()) {
      try {
        await refreshAgentCards();
        updateLastRefresh();
      } catch (error) {
        log("agents auto-refresh bootstrap failed", { message: error.message, payload: error.payload });
      }
    }
  });

  ui.toggleAutoRefreshEvents?.addEventListener("change", async (event) => {
    appState.autoRefresh.events = Boolean(event.target.checked);
    saveAutoRefresh();
    syncAutoRefreshTimers();
    if (appState.autoRefresh.events && getToken()) {
      try {
        await refreshSwitchEvents();
        updateLastRefresh();
      } catch (error) {
        log("events auto-refresh bootstrap failed", { message: error.message, payload: error.payload });
      }
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

  ui.switchFilterSearch?.addEventListener("input", (event) => {
    appState.switchFilters.search = String(event.target.value ?? "");
    saveSwitchFilters();
    renderSwitchEvents(appState.switchEvents);
  });

  ui.switchFilterStatus?.addEventListener("change", (event) => {
    appState.switchFilters.status = String(event.target.value ?? "all");
    saveSwitchFilters();
    renderSwitchEvents(appState.switchEvents);
  });

  ui.switchFilterProfile?.addEventListener("change", (event) => {
    appState.switchFilters.profile = String(event.target.value ?? "all");
    saveSwitchFilters();
    renderSwitchEvents(appState.switchEvents);
  });

  ui.switchFilterClear?.addEventListener("click", () => {
    appState.switchFilters = {
      search: "",
      status: "all",
      profile: "all"
    };
    saveSwitchFilters();
    renderSwitchEvents(appState.switchEvents);
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
