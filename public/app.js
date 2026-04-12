
const SWITCH_MODULE_KEY = "switch_chatgpt_auth_on_limit"
const ROUTES = ["dashboard", "projects", "tasks", "schedules", "agents", "agent-profiles", "accounts", "secrets", "memory", "system", "logs"]
const ACCOUNT_SECTIONS = ["profiles", "limits", "history"]
const AUTOREFRESH_INTERVAL_MS = 15000
const MAX_LOGS = 500

const KEYS = {
  token: "codex_orchestrator_admin_token",
  lang: "codex_orchestrator_lang",
  theme: "codex_orchestrator_theme",
  route: "codex_orchestrator_console_route",
  section: "codex_orchestrator_accounts_section",
  auto: "codex_orchestrator_autorefresh",
  projectFilters: "codex_orchestrator_project_filters",
  taskFilters: "codex_orchestrator_task_filters",
  switchFilters: "codex_orchestrator_switch_filters",
  secretsFilters: "codex_orchestrator_secrets_filters",
  logFilters: "codex_orchestrator_log_filters",
  agentProfileFilters: "codex_orchestrator_agent_profile_filters",
  taskCollapsed: "codex_orchestrator_task_create_collapsed"
}

const I18N = {
  ru: {
    entry_kicker: "Панель управления",
    entry_title: "Панель управления Codex Orchestrator",
    entry_subtitle: "Полностью обновленная консоль оператора: задачи, агенты, аккаунты, память, система и логи на отдельных экранах.",
    entry_open_console: "Открыть консоль",
    entry_note: "Токен, язык, тема и последний экран консоли сохраняются в localStorage браузера.",
    entry_routes_label: "Экраны консоли",
    brand_kicker: "Панель управления",
    brand_title: "Codex Orchestrator",
    brand_subtitle: "Операционная консоль v2",
    route_dashboard: "Обзор",
    route_projects: "Проекты",
    route_tasks: "Задачи",
    route_schedules: "Расписания",
    route_agents: "Агенты",
    route_agent_profiles: "Профили агентов",
    route_accounts: "Аккаунты",
    route_secrets: "Секреты",
    route_memory: "Память",
    route_system: "Система",
    route_logs: "Логи",
    route_desc_dashboard: "Состояние сервиса и последние сигналы системы.",
    route_desc_projects: "Реестр проектов, summary и проектные настройки.",
    route_desc_tasks: "Создание, фильтрация и управление очередью задач.",
    route_desc_schedules: "Правила расписаний: создание задач по cron и история запусков.",
    route_desc_agents: "Мониторинг групп агентов и инспектор запуска.",
    route_desc_agent_profiles: "Глобальные профили агентов, MCP server sets и OS-скрипты.",
    route_desc_accounts: "Профили auth.json, лимиты и история переключений.",
    route_desc_secrets: "Секреты проекта: создание, ротация, отзыв и привязки.",
    route_desc_memory: "Память агентов по проекту и роли.",
    route_desc_system: "Конфигурация модуля и история исполнений.",
    route_desc_logs: "Централизованный журнал операций интерфейса и ответов API.",
    language_label: "Язык",
    theme_label: "Тема",
    theme_dark: "Тёмная",
    theme_light: "Светлая",
    token_placeholder: "вставь токен",
    save_token: "Сохранить",
    clear_token: "Очистить",
    token_hint: "Токен хранится в localStorage и отправляется только в /api/* запросы.",
    refresh: "Обновить",
    refresh_current: "Обновить экран",
    refresh_all: "Обновить всё",
    autorefresh_label: "авто",
    panel_state_idle: "ожидание",
    panel_state_loading: "загрузка",
    panel_state_success: "ок",
    panel_state_error: "ошибка",
    panel_state_token: "нужен токен",
    stats_tasks: "Задачи",
    stats_held: "Удержанные",
    stats_profiles: "Профили",
    stats_events: "События переключений",
    dashboard_health_title: "Состояние сервиса",
    dashboard_signals_title: "Последние сигналы",
    no_signals: "Пока нет сигналов.",
    projects_title: "Реестр проектов",
    project_create_toggle: "Создать проект",
    project_key_label: "Ключ проекта",
    project_name_label: "Название проекта",
    project_description_label: "Описание",
    project_github_url_label: "GitHub URL",
    project_workspace_path_label: "Рабочая директория",
    project_create_action: "Создать проект",
    project_filter_search_label: "Поиск",
    project_filter_search_placeholder: "key/name/github",
    project_filter_include_inactive: "Показывать неактивные",
    project_list_empty: "Проектов пока нет.",
    project_details_empty: "Выбери проект в списке, чтобы посмотреть summary и обновить конфигурацию.",
    project_summary_title: "Сводка проекта",
    project_summary_tasks_total: "Всего задач",
    project_summary_active_memory: "Активная память",
    project_summary_switch_recent: "Switch events (окно)",
    project_summary_last_switch: "Последний switch",
    project_summary_window: "Окно агрегации",
    project_summary_window_hours: "Окно: {hours} ч",
    project_summary_statuses: "Задачи по статусам",
    project_edit_title: "Редактирование проекта",
    project_active_label: "Проект активен",
    project_save_action: "Сохранить изменения",
    project_option_none: "Нет активных проектов",
    tasks_title: "Задачи и очередь",
    task_create_toggle: "Создать задачу",
    task_title_label: "Заголовок",
    task_description_label: "Описание",
    task_project_label: "ID проекта",
    task_agent_profile_label: "Профиль агента",
    task_agent_template_label: "Шаблон агента",
    create_task: "Создать задачу",
    schedules_title: "Расписания",
    schedules_create_toggle: "Создать правило",
    schedule_name_label: "Название правила",
    schedule_project_label: "Проект",
    schedule_cron_label: "CRON (UTC)",
    schedule_task_title_label: "Заголовок задачи",
    schedule_task_description_label: "Описание задачи",
    schedule_task_agent_profile_label: "Профиль агента",
    schedule_task_agent_template_label: "Шаблон агента",
    schedule_task_priority_label: "Приоритет",
    schedule_create_action: "Создать правило",
    schedule_rules_title: "Активные правила",
    schedule_runs_title: "История запусков",
    schedule_runs_empty: "Выбери правило, чтобы посмотреть историю запусков.",
    schedule_list_empty: "Правил пока нет.",
    schedule_action_trigger: "Запустить",
    schedule_action_evaluate: "Проверить",
    schedule_action_enable: "Включить",
    schedule_action_disable: "Выключить",
    schedule_action_delete: "Удалить",
    schedule_field_scope: "Область",
    schedule_field_cron: "CRON",
    schedule_field_project: "Проект",
    schedule_trigger_matched: "matched: {value}",
    accounts_policy_title: "Политика auto-switch",
    switch_policy_enabled: "Авто-переключение включено",
    switch_policy_eligible: "Валидные профили для авто-switch",
    switch_policy_five_label: "Порог 5ч (%)",
    switch_policy_week_label: "Порог недели (%)",
    switch_policy_guard_label: "Reset guard (ч)",
    switch_policy_probe_label: "Probe interval (сек)",
    switch_policy_cooldown_label: "Cooldown (сек)",
    switch_policy_save: "Сохранить политику",
    switch_policy_last: "Последнее решение: {status} / {reason} ({time})",
    switch_policy_last_empty: "Решений auto-switch пока нет.",
    switch_policy_no_profiles: "Нет доступных профилей.",
    switch_policy_error_eligible_required: "При включенном auto-switch нужно выбрать хотя бы один валидный профиль.",
    task_filter_search_label: "Поиск",
    task_filter_search_placeholder: "id/заголовок/описание",
    task_filter_project_label: "Проект",
    task_filter_status_label: "Статус",
    task_filter_any_project: "Все проекты",
    task_filter_any_status: "Все статусы",
    task_filter_clear: "Сбросить фильтры",
    task_board_waiting: "Ожидает запуска",
    task_board_running: "Запущена",
    task_board_completed: "Выполнена",
    no_tasks_waiting: "Нет задач в ожидании.",
    no_tasks_running: "Нет запущенных задач.",
    no_tasks_completed: "Нет завершенных задач.",
    held_title: "Удержанная очередь",
    release: "Освободить",
    held_summary_count: "Задач в удержании: {count}",
    no_held: "Нет задач в WAITING_LIMIT.",
    task_details_title: "Детали задачи",
    task_details_empty: "Выбери карточку задачи, чтобы посмотреть детали.",
    task_cancel_action: "Отменить задачу",
    task_cancel_prompt: "Причина отмены (опционально):",
    task_field_id: "ID",
    task_field_status: "Статус",
    task_field_priority: "Приоритет",
    task_field_project: "Проект",
    task_field_agent_profile: "Профиль агента",
    task_field_agent_template: "Шаблон агента",
    task_field_created: "Создано",
    task_field_updated: "Обновлено",
    task_field_cancelled: "Отменено",
    task_field_cancel_reason: "Причина отмены",
    task_field_description: "Описание",
    task_field_na: "н/д",
    agent_cards_title: "Карточки агентов",
    agent_preparing: "Готовятся",
    agent_running: "Запущены",
    agent_recent: "Недавние",
    no_preparing_agents: "Нет агентов в подготовке.",
    no_running_agents: "Нет запущенных агентов.",
    no_recent_agents: "Нет недавних запусков агентов.",
    agent_inspector_title: "Инспектор агента",
    agent_inspector_empty: "Выбери карточку агента, чтобы посмотреть промпт и лог.",
    agent_field_id: "ID",
    agent_field_status: "Статус",
    agent_field_capability: "Специализация",
    agent_field_template: "Шаблон",
    agent_field_account: "Аккаунт",
    agent_field_trace: "Трейс",
    agent_field_execution_mode: "Режим выполнения",
    agent_field_created: "Создано",
    agent_field_started: "Старт",
    agent_field_ended: "Завершено",
    agent_field_cwd: "Рабочая директория",
    agent_field_cwd_source: "Источник cwd",
    agent_field_memory_context: "Контекст памяти",
    agent_field_result: "Результат",
    agent_field_prompt: "Промпт",
    agent_field_log: "Лог",
    agent_profiles_title: "Профили агентов и MCP",
    agent_profile_create_toggle: "Создать профиль агента",
    agent_profile_project_label: "Глобальный профиль",
    agent_profile_name_label: "Название профиля",
    agent_profile_role_label: "Роль",
    agent_profile_source_policy_label: "Source policy",
    agent_profile_description_label: "Описание",
    agent_profile_enabled_label: "Профиль активен",
    agent_profile_create_action: "Создать профиль",
    agent_profile_filter_search_label: "Поиск",
    agent_profile_filter_search_placeholder: "name/role/description",
    agent_profile_filter_project_label: "Проект",
    agent_profile_filter_role_label: "Роль",
    agent_profile_filter_include_disabled: "Показывать отключенные",
    agent_profile_filter_any_project: "Все проекты",
    agent_profile_filter_any_role: "Все роли",
    agent_profile_list_empty: "Профилей агентов пока нет.",
    agent_profile_details_empty: "Выбери профиль агента в списке, чтобы управлять MCP серверами и script sets.",
    agent_profile_summary_title: "Сводка профиля",
    agent_profile_edit_title: "Редактирование профиля",
    agent_profile_field_id: "ID",
    agent_profile_field_project: "Проект",
    agent_profile_field_role: "Роль",
    agent_profile_field_source_policy: "Source policy",
    agent_profile_field_status: "Статус",
    agent_profile_field_updated: "Обновлено",
    agent_profile_save_action: "Сохранить профиль",
    agent_profile_mcp_title: "MCP серверы профиля",
    mcp_server_create_toggle: "Зарегистрировать MCP сервер",
    mcp_server_name_label: "Имя сервера",
    mcp_server_transport_label: "Transport",
    mcp_server_origin_label: "Origin type",
    mcp_server_endpoint_label: "Endpoint / command",
    mcp_server_meta_label: "Meta JSON",
    mcp_server_approved_label: "Сервер одобрен",
    mcp_server_create_action: "Создать MCP сервер",
    agent_profile_bind_server_label: "Сервер",
    agent_profile_bind_priority_label: "Priority",
    agent_profile_bind_required_label: "Обязательный binding",
    agent_profile_bind_optional: "опциональный",
    agent_profile_bind_config_label: "Config JSON",
    agent_profile_bind_action: "Привязать сервер",
    agent_profile_unbind_action: "Отвязать",
    agent_profile_bindings_empty: "Нет MCP binding для этого профиля.",
    agent_profile_bindings_orchestrator_required: "orchestrator-core обязателен",
    agent_profile_scripts_title: "OS script sets",
    agent_profile_script_type_label: "Тип",
    agent_profile_script_content_label: "Содержимое",
    agent_profile_script_save_action: "Сохранить script",
    agent_profile_script_empty: "Скрипт не задан",
    agent_profile_script_version: "v{version} · {updated}",
    log_agent_profile_created: "Профиль агента создан",
    log_agent_profile_updated: "Профиль агента обновлён",
    log_agent_profile_selected: "Профиль агента выбран",
    log_agent_profile_server_created: "MCP сервер зарегистрирован",
    log_agent_profile_server_bound: "MCP сервер привязан",
    log_agent_profile_server_unbound: "MCP сервер отвязан",
    log_agent_profile_script_saved: "OS script сохранён",
    agent_profile_error_meta_json: "Ошибка парсинга Meta JSON",
    agent_profile_error_config_json: "Ошибка парсинга Config JSON",
    agent_profile_error_script_empty: "Содержимое script пустое",
    accounts_title: "Аккаунты и лимиты",
    accounts_limits_title: "Лимиты профилей",
    accounts_subtab_profiles: "Профили",
    accounts_subtab_limits: "Лимиты",
    accounts_subtab_history: "История",
    profiles_title: "Профили авторизации",
    profile_label_label: "Метка",
    profile_json_label: "auth.json файл",
    upload_profile: "Загрузить профиль",
    active_profile_none: "Активный профиль: не выбран",
    active_profile_value: "Активный профиль: {label} ({id})",
    profile_state_active: "активен",
    profile_state_inactive: "неактивен",
    active_now: "активный сейчас",
    action_activate: "Активировать",
    action_deactivate: "Деактивировать",
    action_delete: "Удалить",
    action_open_history: "История",
    profile_delete_modal_title: "Удалить профиль?",
    profile_delete_modal_message: "Профиль {label} ({id}) будет удален без возможности восстановления.",
    profile_delete_modal_confirm: "Удалить профиль",
    profile_delete_modal_cancel: "Отмена",
    no_profiles: "Профилей пока нет.",
    events_title: "События переключений",
    switch_filter_search_label: "Поиск",
    switch_filter_search_placeholder: "reason/profile/status",
    switch_filter_status_label: "Статус",
    switch_filter_profile_label: "Профиль",
    switch_filter_any_status: "Все статусы",
    switch_filter_any_profile: "Все профили",
    switch_filter_clear: "Сбросить",
    no_switch_events: "Событий переключения пока нет.",
    switch_event_from_to: "{from} -> {to}",
    switch_event_ended_at: "завершено: {value}",
    account_limits_5h: "5ч: {remaining}% (сброс {reset})",
    account_limits_week: "неделя: {remaining}% (сброс {reset})",
    account_limits_source: "источник: {source}",
    account_limit_na: "n/a",
    secrets_title: "Секреты проекта",
    secrets_create_title: "Создать секрет",
    secrets_project_label: "Проект",
    secrets_key_label: "Ключ (ENV)",
    secrets_value_label: "Значение",
    secrets_description_label: "Описание",
    secrets_bind_roles_label: "Роли (через запятую)",
    secrets_bind_templates_label: "ID шаблонов (через запятую)",
    secrets_create_action: "Сохранить секрет",
    secrets_filter_search_label: "Поиск",
    secrets_filter_search_placeholder: "ключ/описание/маска",
    secrets_project_missing: "Выбери проект, чтобы загрузить секреты.",
    secrets_list_empty: "Секретов пока нет.",
    secrets_field_masked: "Маска",
    secrets_field_version: "Версия",
    secrets_field_status: "Статус",
    secrets_field_rotated: "Ротирован",
    secrets_field_revoked: "Отозван",
    secrets_bindings_roles: "Привязки ролей",
    secrets_bindings_templates: "Привязки шаблонов",
    secrets_action_rotate: "Ротировать",
    secrets_action_revoke: "Отозвать",
    secrets_action_activate: "Активировать",
    secrets_action_deactivate: "Деактивировать",
    secrets_action_bind_role: "Привязать роль",
    secrets_action_unbind_role: "Отвязать роль",
    secrets_action_bind_template: "Привязать шаблон",
    secrets_action_unbind_template: "Отвязать шаблон",
    secrets_prompt_rotate: "Введи новое значение секрета:",
    secrets_prompt_role: "Укажи роль:",
    secrets_prompt_template: "Укажи template_id/ID шаблона:",
    error_secret_project_required: "Выбери проект для работы с секретами.",
    memory_title: "Память агентов",
    memory_project_label: "ID проекта",
    memory_role_label: "Роль агента",
    memory_note_title_label: "Заголовок памяти",
    memory_note_content_label: "Содержимое памяти",
    create_memory_note: "Сохранить память",
    no_memory_entries: "Записей памяти пока нет.",
    action_enable: "Включить",
    action_disable: "Выключить",
    module_title: "Модуль и исполнение",
    module_enabled_label: "switch_chatgpt_auth_on_limit включен",
    patch_module: "Обновить модуль",
    executions: "Исполнения",
    no_executions: "Исполнений пока нет.",
    logs_title: "Операционные логи",
    logs_clear: "Очистить логи",
    logs_filter_level: "Уровень",
    logs_filter_scope: "Область",
    logs_filter_search: "Поиск",
    logs_filter_search_placeholder: "маршрут/статус/сообщение",
    logs_details_toggle: "Показать детали",
    logs_filter_all: "Все",
    no_logs: "Логи пока пустые.",
    error_missing_token: "Укажи X-Admin-Token для /api запросов.",
    error_generic: "Ошибка запроса",
    log_route_changed: "Переключен экран",
    log_account_section_changed: "Переключена секция аккаунтов",
    log_token_saved: "Токен сохранен",
    log_token_cleared: "Токен очищен",
    log_language_changed: "Язык обновлен",
    log_theme_changed: "Тема обновлена",
    log_route_refresh_retry: "Повтор загрузки экрана",
    log_partial_refresh_failed: "Частичная загрузка экрана завершилась с ошибкой",
    log_project_created: "Проект создан",
    log_project_updated: "Проект обновлен",
    log_project_selected: "Проект выбран",
    log_task_created: "Задача создана",
    log_task_cancelled: "Задача отменена",
    log_schedule_created: "Правило расписания создано",
    log_schedule_action: "Операция с расписанием выполнена",
    log_held_released: "Удержанная очередь освобождена",
    log_profile_uploaded: "Профиль загружен",
    log_profile_action: "Операция с профилем выполнена",
    log_profile_deleted: "Профиль удален",
    log_secret_created: "Секрет создан",
    log_secret_rotated: "Секрет ротирован",
    log_secret_revoked: "Секрет отозван",
    log_secret_updated: "Секрет обновлен",
    log_secret_binding_updated: "Bindings секрета обновлены",
    log_memory_created: "Запись памяти создана",
    log_memory_toggled: "Статус записи памяти обновлен",
    log_module_updated: "Конфигурация модуля обновлена",
    log_switch_policy_saved: "Политика auto-switch сохранена",
    log_logs_cleared: "Логи очищены",
    log_api_response: "Ответ API",
    log_api_compact: "{method} {route} -> {status} ({duration} мс)"
  },
  en: {}
}

I18N.en = {
  ...I18N.ru,
  entry_kicker: "Control Plane",
  entry_subtitle: "Fully redesigned operator console: tasks, agents, accounts, memory, system, and logs on dedicated screens.",
  entry_title: "Codex Orchestrator Control Panel",
  entry_open_console: "Open console",
  entry_note: "Token, language, theme, and last route are stored in browser localStorage.",
  entry_routes_label: "Console screens",
  brand_kicker: "Control Plane",
  brand_subtitle: "Operational console v2",
  route_dashboard: "Dashboard",
  route_projects: "Projects",
  route_tasks: "Tasks",
  route_schedules: "Schedules",
  route_agents: "Agents",
  route_agent_profiles: "Agent Profiles",
  route_accounts: "Accounts",
  route_secrets: "Secrets",
  route_memory: "Memory",
  route_system: "System",
  route_logs: "Logs",
  route_desc_dashboard: "Service health and latest system signals.",
  route_desc_projects: "Project registry, summary, and project settings.",
  route_desc_tasks: "Create, filter, and operate task queue.",
  route_desc_schedules: "Schedule rules: create tasks by cron and inspect run history.",
  route_desc_agents: "Monitor preparing/running/recent agents and inspector.",
  route_desc_agent_profiles: "Global agent profiles, MCP server sets, and OS scripts.",
  route_desc_accounts: "auth.json profiles, limits, and switch history.",
  route_desc_secrets: "Project secrets: create, rotate, revoke, and manage bindings.",
  route_desc_memory: "Agent memory by project_id and role.",
  route_desc_system: "Module config and execution history.",
  route_desc_logs: "Centralized UI actions and API responses journal.",
  language_label: "Language",
  theme_label: "Theme",
  theme_dark: "Dark",
  theme_light: "Light",
  token_placeholder: "paste token",
  save_token: "Save",
  clear_token: "Clear",
  token_hint: "Token is stored in localStorage and only sent to /api/* requests.",
  refresh: "Refresh",
  refresh_current: "Refresh screen",
  refresh_all: "Full refresh",
  autorefresh_label: "auto",
  panel_state_idle: "idle",
  panel_state_loading: "loading",
  panel_state_success: "ok",
  panel_state_error: "error",
  panel_state_token: "token required",
  stats_tasks: "Tasks",
  stats_held: "Held",
  stats_profiles: "Profiles",
  stats_events: "Switch events",
  dashboard_health_title: "Service health",
  dashboard_signals_title: "Latest signals",
  no_signals: "No signals yet.",
  projects_title: "Project registry",
  project_create_toggle: "Create project",
  project_key_label: "Project key",
  project_name_label: "Project name",
  project_description_label: "Description",
  project_github_url_label: "GitHub URL",
  project_workspace_path_label: "Workspace path",
  project_create_action: "Create project",
  project_filter_search_label: "Search",
  project_filter_search_placeholder: "key/name/github",
  project_filter_include_inactive: "Show inactive projects",
  project_list_empty: "No projects yet.",
  project_details_empty: "Select a project to inspect summary and update settings.",
  project_summary_title: "Project summary",
  project_summary_tasks_total: "Total tasks",
  project_summary_active_memory: "Active memory entries",
  project_summary_switch_recent: "Switch events (window)",
  project_summary_last_switch: "Last switch event",
  project_summary_window: "Aggregation window",
  project_summary_window_hours: "Window: {hours}h",
  project_summary_statuses: "Tasks by status",
  project_edit_title: "Edit project",
  project_active_label: "Project is active",
  project_save_action: "Save changes",
  project_option_none: "No active projects",
  tasks_title: "Tasks & Queue",
  task_create_toggle: "Create task",
  task_title_label: "Title",
  task_description_label: "Description",
  task_project_label: "Project ID",
  task_agent_profile_label: "Agent profile",
  task_agent_template_label: "Agent template",
  create_task: "Create task",
  schedules_title: "Schedules",
  schedules_create_toggle: "Create rule",
  schedule_name_label: "Rule name",
  schedule_project_label: "Project",
  schedule_cron_label: "CRON (UTC)",
  schedule_task_title_label: "Task title",
  schedule_task_description_label: "Task description",
  schedule_task_agent_profile_label: "Agent profile",
  schedule_task_agent_template_label: "Agent template",
  schedule_task_priority_label: "Priority",
  schedule_create_action: "Create rule",
  schedule_rules_title: "Active rules",
  schedule_runs_title: "Run history",
  schedule_runs_empty: "Select a rule to inspect run history.",
  schedule_list_empty: "No rules yet.",
  schedule_action_trigger: "Trigger",
  schedule_action_evaluate: "Evaluate",
  schedule_action_enable: "Enable",
  schedule_action_disable: "Disable",
  schedule_action_delete: "Delete",
  schedule_field_scope: "Scope",
  schedule_field_cron: "CRON",
  schedule_field_project: "Project",
  schedule_trigger_matched: "matched: {value}",
  accounts_policy_title: "Auto-switch policy",
  switch_policy_enabled: "Auto-switch enabled",
  switch_policy_eligible: "Eligible profiles for auto-switch",
  switch_policy_five_label: "5h threshold (%)",
  switch_policy_week_label: "Week threshold (%)",
  switch_policy_guard_label: "Reset guard (hours)",
  switch_policy_probe_label: "Probe interval (sec)",
  switch_policy_cooldown_label: "Cooldown (sec)",
  switch_policy_save: "Save policy",
  switch_policy_last: "Last decision: {status} / {reason} ({time})",
  switch_policy_last_empty: "No auto-switch decisions yet.",
  switch_policy_no_profiles: "No profiles available.",
  switch_policy_error_eligible_required: "When auto-switch is enabled, select at least one eligible profile.",
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
  no_tasks_waiting: "No waiting tasks.",
  no_tasks_running: "No running tasks.",
  no_tasks_completed: "No completed tasks.",
  held_title: "Held Queue",
  release: "Release",
  held_summary_count: "Held tasks: {count}",
  no_held: "No tasks in WAITING_LIMIT.",
  task_details_title: "Task details",
  task_details_empty: "Select a task card to inspect details.",
  task_cancel_action: "Cancel task",
  task_cancel_prompt: "Cancel reason (optional):",
  task_field_status: "Status",
  task_field_priority: "Priority",
  task_field_project: "Project",
  task_field_agent_profile: "Agent profile",
  task_field_agent_template: "Agent template",
  task_field_created: "Created",
  task_field_updated: "Updated",
  task_field_cancelled: "Cancelled at",
  task_field_cancel_reason: "Cancel reason",
  task_field_description: "Description",
  task_field_na: "n/a",
  agent_cards_title: "Agent cards",
  agent_preparing: "Preparing",
  agent_running: "Running",
  agent_recent: "Recent",
  no_preparing_agents: "No preparing agents.",
  no_running_agents: "No running agents.",
  no_recent_agents: "No recent agents.",
  agent_inspector_title: "Agent inspector",
  agent_inspector_empty: "Select an agent card to inspect prompt and log.",
  agent_field_trace: "Trace",
  agent_field_execution_mode: "Execution mode",
  agent_field_created: "Created",
  agent_field_started: "Started",
  agent_field_ended: "Ended",
  agent_field_cwd: "CWD",
  agent_field_cwd_source: "CWD source",
  agent_field_memory_context: "Memory context",
  agent_field_result: "Result",
  agent_field_prompt: "Prompt",
  agent_field_log: "Log",
  agent_profiles_title: "Agent Profiles & MCP",
  agent_profile_create_toggle: "Create agent profile",
  agent_profile_project_label: "Global profile",
  agent_profile_name_label: "Profile name",
  agent_profile_role_label: "Role",
  agent_profile_source_policy_label: "Source policy",
  agent_profile_description_label: "Description",
  agent_profile_enabled_label: "Profile enabled",
  agent_profile_create_action: "Create profile",
  agent_profile_filter_search_label: "Search",
  agent_profile_filter_search_placeholder: "name/role/description",
  agent_profile_filter_project_label: "Project",
  agent_profile_filter_role_label: "Role",
  agent_profile_filter_include_disabled: "Include disabled",
  agent_profile_filter_any_project: "All projects",
  agent_profile_filter_any_role: "All roles",
  agent_profile_list_empty: "No agent profiles yet.",
  agent_profile_details_empty: "Select an agent profile to manage MCP servers and script sets.",
  agent_profile_summary_title: "Profile summary",
  agent_profile_edit_title: "Edit profile",
  agent_profile_field_id: "ID",
  agent_profile_field_project: "Project",
  agent_profile_field_role: "Role",
  agent_profile_field_source_policy: "Source policy",
  agent_profile_field_status: "Status",
  agent_profile_field_updated: "Updated",
  agent_profile_save_action: "Save profile",
  agent_profile_mcp_title: "Profile MCP servers",
  mcp_server_create_toggle: "Register MCP server",
  mcp_server_name_label: "Server name",
  mcp_server_transport_label: "Transport",
  mcp_server_origin_label: "Origin type",
  mcp_server_endpoint_label: "Endpoint / command",
  mcp_server_meta_label: "Meta JSON",
  mcp_server_approved_label: "Server approved",
  mcp_server_create_action: "Create MCP server",
  agent_profile_bind_server_label: "Server",
  agent_profile_bind_priority_label: "Priority",
  agent_profile_bind_required_label: "Required binding",
  agent_profile_bind_optional: "optional",
  agent_profile_bind_config_label: "Config JSON",
  agent_profile_bind_action: "Bind server",
  agent_profile_unbind_action: "Unbind",
  agent_profile_bindings_empty: "No MCP bindings for this profile.",
  agent_profile_bindings_orchestrator_required: "orchestrator-core is mandatory",
  agent_profile_scripts_title: "OS script sets",
  agent_profile_script_type_label: "Type",
  agent_profile_script_content_label: "Content",
  agent_profile_script_save_action: "Save script",
  agent_profile_script_empty: "Script is not set",
  agent_profile_script_version: "v{version} · {updated}",
  log_agent_profile_created: "Agent profile created",
  log_agent_profile_updated: "Agent profile updated",
  log_agent_profile_selected: "Agent profile selected",
  log_agent_profile_server_created: "MCP server registered",
  log_agent_profile_server_bound: "MCP server bound",
  log_agent_profile_server_unbound: "MCP server unbound",
  log_agent_profile_script_saved: "OS script saved",
  agent_profile_error_meta_json: "Meta JSON parse error",
  agent_profile_error_config_json: "Config JSON parse error",
  agent_profile_error_script_empty: "Script content is empty",
  accounts_limits_title: "Profile limits",
  accounts_subtab_profiles: "Profiles",
  accounts_subtab_limits: "Limits",
  accounts_subtab_history: "History",
  profile_label_label: "Label",
  profile_json_label: "auth.json file",
  upload_profile: "Upload profile",
  active_profile_none: "Active profile: none",
  active_profile_value: "Active profile: {label} ({id})",
  profile_state_active: "active",
  profile_state_inactive: "inactive",
  active_now: "active now",
  action_activate: "Activate",
  action_deactivate: "Deactivate",
  action_delete: "Delete",
  action_open_history: "History",
  profile_delete_modal_title: "Delete profile?",
  profile_delete_modal_message: "Profile {label} ({id}) will be deleted permanently.",
  profile_delete_modal_confirm: "Delete profile",
  profile_delete_modal_cancel: "Cancel",
  no_profiles: "No profiles yet.",
  events_title: "Switch events",
  switch_filter_search_label: "Search",
  switch_filter_search_placeholder: "reason/profile/status",
  switch_filter_status_label: "Status",
  switch_filter_profile_label: "Profile",
  switch_filter_any_status: "All statuses",
  switch_filter_any_profile: "All profiles",
  switch_filter_clear: "Clear",
  no_switch_events: "No switch events yet.",
  switch_event_ended_at: "end: {value}",
  account_limits_5h: "5h: {remaining}% (reset {reset})",
  account_limits_week: "week: {remaining}% (reset {reset})",
  account_limits_source: "source: {source}",
  secrets_title: "Project secrets",
  secrets_create_title: "Create secret",
  secrets_project_label: "Project",
  secrets_key_label: "Key (ENV)",
  secrets_value_label: "Value",
  secrets_description_label: "Description",
  secrets_bind_roles_label: "Roles (comma-separated)",
  secrets_bind_templates_label: "Template IDs (comma-separated)",
  secrets_create_action: "Save secret",
  secrets_filter_search_label: "Search",
  secrets_filter_search_placeholder: "key/description/masked",
  secrets_project_missing: "Select a project to load secrets.",
  secrets_list_empty: "No secrets yet.",
  secrets_field_masked: "Masked preview",
  secrets_field_version: "Version",
  secrets_field_status: "Status",
  secrets_field_rotated: "Rotated",
  secrets_field_revoked: "Revoked",
  secrets_bindings_roles: "Role bindings",
  secrets_bindings_templates: "Template bindings",
  secrets_action_rotate: "Rotate",
  secrets_action_revoke: "Revoke",
  secrets_action_activate: "Activate",
  secrets_action_deactivate: "Deactivate",
  secrets_action_bind_role: "Bind role",
  secrets_action_unbind_role: "Unbind role",
  secrets_action_bind_template: "Bind template",
  secrets_action_unbind_template: "Unbind template",
  secrets_prompt_rotate: "Enter new secret value:",
  secrets_prompt_role: "Enter role:",
  secrets_prompt_template: "Enter template_id:",
  error_secret_project_required: "Select a project for secret operations.",
  memory_project_label: "Project ID",
  memory_role_label: "Agent Role",
  no_memory_entries: "No memory entries yet.",
  action_enable: "Enable",
  action_disable: "Disable",
  patch_module: "Update module",
  no_executions: "No executions yet.",
  logs_title: "Operational logs",
  logs_clear: "Clear logs",
  logs_filter_level: "Level",
  logs_filter_scope: "Scope",
  logs_filter_search: "Search",
  logs_filter_search_placeholder: "route/status/message",
  logs_details_toggle: "Show details",
  logs_filter_all: "All",
  no_logs: "Logs are empty.",
  error_missing_token: "Set X-Admin-Token for /api requests.",
  error_generic: "Request failed",
  log_route_changed: "Route switched",
  log_account_section_changed: "Accounts section switched",
  log_token_saved: "Token saved",
  log_token_cleared: "Token cleared",
  log_language_changed: "Language updated",
  log_theme_changed: "Theme updated",
  log_route_refresh_retry: "Route refresh retry",
  log_partial_refresh_failed: "Partial screen hydration failed",
  log_project_created: "Project created",
  log_project_updated: "Project updated",
  log_project_selected: "Project selected",
  log_task_created: "Task created",
  log_task_cancelled: "Task cancelled",
  log_schedule_created: "Schedule rule created",
  log_schedule_action: "Schedule action completed",
  log_held_released: "Held queue released",
  log_profile_uploaded: "Profile uploaded",
  log_profile_action: "Profile action completed",
  log_profile_deleted: "Profile deleted",
  log_secret_created: "Secret created",
  log_secret_rotated: "Secret rotated",
  log_secret_revoked: "Secret revoked",
  log_secret_updated: "Secret updated",
  log_secret_binding_updated: "Secret bindings updated",
  log_memory_created: "Memory entry created",
  log_memory_toggled: "Memory entry state updated",
  log_module_updated: "Module config updated",
  log_switch_policy_saved: "Auto-switch policy saved",
  log_logs_cleared: "Logs cleared",
  log_api_response: "API response",
  log_api_compact: "{method} {route} -> {status} ({duration} ms)"
}

const state = {
  page: document.body.dataset.page ?? "console",
  lang: "ru",
  theme: "dark",
  token: "",
  route: "dashboard",
  section: "profiles",
  auto: { tasks: false, agents: false, history: false },
  projectFilters: { search: "", includeInactive: true },
  taskFilters: { search: "", project: "all", status: "all" },
  switchFilters: { search: "", status: "all", profile: "all" },
  secretsFilters: { project: "", search: "" },
  logFilters: { level: "all", scope: "all", search: "" },
  tasks: [],
  taskAgentProfiles: [],
  taskAgentTemplates: [],
  held: [],
  schedules: [],
  scheduleRuns: [],
  selectedScheduleId: null,
  agents: { preparing: [], running: [], recent: [] },
  profiles: [],
  activeProfile: null,
  fleet: [],
  switches: [],
  switchPolicy: {
    enabled: false,
    config: {
      eligible_profile_ids: [],
      weekly_remaining_percent_lt: 5,
      five_hour_remaining_percent_lt: 10,
      reset_guard_hours: 3,
      probe_interval_sec: 60,
      switch_cooldown_sec: 120
    },
    lastDecision: null
  },
  secrets: [],
  agentProfiles: [],
  mcpServers: [],
  agentProfileBindings: [],
  agentProfileScripts: [],
  selectedAgentProfileId: null,
  agentProfileFilters: { search: "", role: "all", includeDisabled: true },
  projects: [],
  selectedProjectKey: null,
  projectSummary: null,
  memory: [],
  executions: [],
  health: { live: "unknown", ready: "unknown" },
  selectedTaskId: null,
  selectedAgentId: null,
  selectedAgentDetails: null,
  logs: []
}

const timers = { tasks: null, agents: null, history: null }
let ui = {}

const WAITING_STATUSES = new Set(["NEW", "QUEUED", "WAITING_LIMIT", "WAITING_APPROVAL", "DRAINING_ACTIVE", "SWITCHING_AUTH"])
const RUNNING_STATUSES = new Set(["ASSIGNED", "STARTING", "RUNNING", "WAITING_USER", "INTERRUPTING", "INTERRUPTED", "REPLANNING", "BLOCKED", "FAILED_RETRYABLE"])
const COMPLETED_STATUSES = new Set(["DONE", "FAILED_TERMINAL", "ARCHIVED"])

function t(key, params = {}) {
  const raw = (I18N[state.lang] ?? I18N.ru)[key] ?? key
  return Object.entries(params).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), raw)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function fmtDate(value) {
  if (!value) return t("task_field_na")
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(state.lang === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
}

function clampPercent(value) {
  if (value == null) return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return Math.max(0, Math.min(100, Math.round(num)))
}

function toObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null
}

function normalizeAuthProfileBase(label) {
  const normalized = String(label ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
  return normalized || "profile"
}

function deriveAuthProfileDisplayId(profile) {
  const explicit = String(profile?.display_id ?? "").trim()
  if (explicit) return explicit

  const rawId = String(profile?.id ?? "")
  const compactId = rawId.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (!compactId) return rawId || t("task_field_na")

  const suffix = compactId.slice(-5).padStart(5, "0")
  return `${normalizeAuthProfileBase(profile?.label).slice(0, 40)}-${suffix}`
}

function normalizeLimitsSnapshot(payload) {
  const root = toObject(payload)
  const snapshot = toObject(root?.rate_limits)
  const primary = toObject(snapshot?.primary)
  const secondary = toObject(snapshot?.secondary)
  return {
    primary_remaining_percent: primary?.remaining_percent ?? null,
    secondary_remaining_percent: secondary?.remaining_percent ?? null,
    primary_resets_at_utc: primary?.resets_at_utc ?? null,
    secondary_resets_at_utc: secondary?.resets_at_utc ?? null,
    limits_source: typeof snapshot?.source === "string" ? snapshot.source : "live"
  }
}

function findAuthProfileById(id) {
  if (!id) return null
  const fromProfiles = state.profiles.find((profile) => profile.id === id)
  if (fromProfiles) return fromProfiles
  return state.fleet.find((profile) => profile.id === id) ?? null
}

function buildAuthProfileToggleButton(item, actionAttr, profileId) {
  const isActive = item?.status === "active"
  const action = isActive ? "deactivate" : "activate"
  const label = t(isActive ? "action_deactivate" : "action_activate")
  return `<button type="button" data-${actionAttr}="${action}" data-profile-id="${escapeHtml(profileId)}">${escapeHtml(label)}</button>`
}

function confirmProfileDelete(profile) {
  const displayId = deriveAuthProfileDisplayId(profile)
  const title = t("profile_delete_modal_title")
  const message = t("profile_delete_modal_message", {
    label: profile?.label ?? t("task_field_na"),
    id: displayId
  })

  if (!ui.confirmModal || !ui.confirmModalTitle || !ui.confirmModalMessage || !ui.confirmModalConfirm || !ui.confirmModalCancel) {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`))
  }

  ui.confirmModalTitle.textContent = title
  ui.confirmModalMessage.textContent = message
  ui.confirmModalConfirm.textContent = t("profile_delete_modal_confirm")
  ui.confirmModalCancel.textContent = t("profile_delete_modal_cancel")
  ui.confirmModal.hidden = false
  document.body.classList.add("modal-open")

  return new Promise((resolve) => {
    const cleanup = (result) => {
      ui.confirmModal.hidden = true
      document.body.classList.remove("modal-open")
      ui.confirmModalConfirm.removeEventListener("click", onConfirm)
      ui.confirmModalCancel.removeEventListener("click", onCancel)
      ui.confirmModal.removeEventListener("click", onBackdrop)
      window.removeEventListener("keydown", onKeyDown)
      resolve(result)
    }

    const onConfirm = () => cleanup(true)
    const onCancel = () => cleanup(false)
    const onBackdrop = (event) => {
      if (event.target === ui.confirmModal) cleanup(false)
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") cleanup(false)
    }

    ui.confirmModalConfirm.addEventListener("click", onConfirm)
    ui.confirmModalCancel.addEventListener("click", onCancel)
    ui.confirmModal.addEventListener("click", onBackdrop)
    window.addEventListener("keydown", onKeyDown)
    ui.confirmModalConfirm.focus()
  })
}

function toNullableString(value) {
  const trimmed = String(value ?? "").trim()
  return trimmed ? trimmed : null
}

function parseCsvList(value) {
  return Array.from(new Set(String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)))
}

function parseJsonObjectInput(rawValue, { allowNull = true } = {}) {
  const raw = String(rawValue ?? "").trim()
  if (!raw) return allowNull ? null : {}
  const parsed = JSON.parse(raw)
  if (parsed === null) {
    if (allowNull) return null
    throw new Error("JSON must be an object")
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON must be an object")
  }
  return parsed
}

function toIntegerInRange(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function normalizeSwitchPolicyConfig(rawValue) {
  const raw = toObject(rawValue) ?? {}
  const eligible = Array.isArray(raw.eligible_profile_ids)
    ? Array.from(new Set(raw.eligible_profile_ids.map((id) => String(id ?? "").trim()).filter(Boolean)))
    : []

  return {
    eligible_profile_ids: eligible,
    weekly_remaining_percent_lt: toIntegerInRange(raw.weekly_remaining_percent_lt, 5, 0, 100),
    five_hour_remaining_percent_lt: toIntegerInRange(raw.five_hour_remaining_percent_lt, 10, 0, 100),
    reset_guard_hours: toIntegerInRange(raw.reset_guard_hours, 3, 0, 720),
    probe_interval_sec: toIntegerInRange(raw.probe_interval_sec, 60, 5, 3600),
    switch_cooldown_sec: toIntegerInRange(raw.switch_cooldown_sec, 120, 0, 3600)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return typeof parsed === "object" && parsed ? parsed : fallback
  } catch {
    return fallback
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // noop
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // noop
  }
}

function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // noop
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme
}

function applyI18n() {
  document.documentElement.lang = state.lang
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n")
    if (key) el.textContent = t(key)
  })
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder")
    if (key) el.setAttribute("placeholder", t(key))
  })

  if (state.page === "entry") {
    if (ui.openConsole) ui.openConsole.href = `/ui/console.html#/${state.route}`
    return
  }

  renderRouteShell()
  renderAccountSection()
  renderHealth()
  renderProjects(state.projects)
  renderTasks(state.tasks)
  renderHeld(state.held)
  renderSchedules(state.schedules)
  renderScheduleRuns(state.scheduleRuns)
  renderAgents(state.agents)
  renderAgentProfiles(state.agentProfiles)
  renderProfiles(state.profiles)
  renderFleet(state.fleet)
  renderSwitchPolicy()
  renderSwitches(state.switches)
  renderSecrets(state.secrets)
  renderMemory(state.memory)
  renderExecutions(state.executions)
  renderDashboardSignals()
  renderLogs()
  syncPanelStateLabels()
}

function normalizeRoute(route) {
  return ROUTES.includes(route) ? route : "dashboard"
}

function routeFromHash(hash) {
  return normalizeRoute(String(hash ?? "").replace(/^#\/?/, "").trim().toLowerCase())
}

function normalizeSection(section) {
  return ACCOUNT_SECTIONS.includes(section) ? section : "profiles"
}

function levelClass(level) {
  return level === "success" ? "log-level-success" : level === "warn" ? "log-level-warn" : level === "error" ? "log-level-error" : ""
}

function logSummary(item) {
  if (!item || !item.details || typeof item.details !== "object") return ""
  const details = item.details

  if (item.scope === "api") {
    const method = typeof details.method === "string" && details.method.trim() ? details.method.toUpperCase() : "GET"
    const route = typeof details.route === "string" && details.route.trim() ? details.route : t("task_field_na")
    const status = details.status == null ? t("task_field_na") : String(details.status)
    const durationValue = Number(details.duration_ms)
    const duration = Number.isFinite(durationValue) ? Math.max(0, Math.round(durationValue)) : 0
    return t("log_api_compact", { method, route, status, duration })
  }

  const pairs = ["route", "section", "action", "profile_id", "id", "status"]
    .filter((key) => details[key] != null && String(details[key]).trim())
    .map((key) => `${key}=${String(details[key])}`)

  return pairs.join(" · ")
}

function pushLog(level, scope, message, details = {}) {
  state.logs.unshift({
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    details
  })

  if (state.logs.length > MAX_LOGS) state.logs.length = MAX_LOGS

  if (state.page === "console") {
    renderDashboardSignals()
    renderLogs()
    setPanelState(ui.logsPanelState, "success")
  }
}

function panelLabelByState(stateName) {
  if (stateName === "loading") return "panel_state_loading"
  if (stateName === "success") return "panel_state_success"
  if (stateName === "error") return "panel_state_error"
  return "panel_state_idle"
}

function setPanelState(node, stateName, labelKey = null) {
  if (!node) return
  node.classList.remove("panel-state-idle", "panel-state-loading", "panel-state-success", "panel-state-error")
  node.classList.add(`panel-state-${stateName}`)
  const key = labelKey ?? panelLabelByState(stateName)
  node.dataset.labelKey = key
  node.textContent = t(key)
}

function syncPanelStateLabels() {
  const nodes = [ui.projectsPanelState, ui.tasksPanelState, ui.heldPanelState, ui.agentsPanelState, ui.agentProfilesPanelState, ui.profilesPanelState, ui.limitsPanelState, ui.eventsPanelState, ui.secretsPanelState, ui.memoryPanelState, ui.modulePanelState, ui.logsPanelState, ui.dashboardSignalsState]
  nodes.forEach((node) => {
    if (!node) return
    const key = node.dataset.labelKey ?? "panel_state_idle"
    node.textContent = t(key)
  })
}

function requireTokenPanels() {
  ;[
    ui.projectsPanelState,
    ui.tasksPanelState,
    ui.heldPanelState,
    ui.schedulesPanelState,
    ui.agentsPanelState,
    ui.agentProfilesPanelState,
    ui.profilesPanelState,
    ui.limitsPanelState,
    ui.switchPolicyState,
    ui.eventsPanelState,
    ui.secretsPanelState,
    ui.memoryPanelState,
    ui.modulePanelState
  ].forEach((node) => setPanelState(node, "error", "panel_state_token"))
}

async function withPanel(node, scope, fn) {
  setPanelState(node, "loading")
  try {
    const out = await fn()
    setPanelState(node, "success")
    return out
  } catch (error) {
    setPanelState(node, "error")
    pushLog("error", scope, error?.message ?? t("error_generic"), { status: error?.status ?? null, payload: error?.payload ?? null })
    throw error
  }
}

function errorMessage(payload, fallback) {
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error
  }
  if (typeof payload === "string" && payload.trim()) return payload
  return fallback || t("error_generic")
}

async function requestRaw(route, options = {}) {
  const method = String(options.method ?? "GET").toUpperCase()
  if (route.startsWith("/api/") && !state.token) {
    const error = new Error(t("error_missing_token"))
    error.status = 401
    throw error
  }

  const headers = new Headers(options.headers ?? {})
  if (route.startsWith("/api/") && state.token) headers.set("X-Admin-Token", state.token)

  let body = options.body
  if (Object.prototype.hasOwnProperty.call(options, "json")) {
    headers.set("Content-Type", "application/json")
    body = JSON.stringify(options.json)
  }

  const start = performance.now()
  const response = await fetch(route, { method, headers, body })
  const duration = Math.round(performance.now() - start)

  const contentType = response.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text().catch(() => "")

  pushLog(response.ok ? "success" : "warn", "api", t("log_api_response"), { method, route, status: response.status, duration_ms: duration })

  if (!response.ok) {
    const error = new Error(errorMessage(payload, `${response.status} ${response.statusText}`))
    error.status = response.status
    error.payload = payload
    throw error
  }

  return { response, payload }
}

async function requestJson(route, options = {}) {
  const result = await requestRaw(route, options)
  return result.payload
}

function updateStats() {
  if (state.page !== "console") return
  ui.statTasks.textContent = String(state.tasks.length)
  ui.statHeld.textContent = String(state.held.length)
  ui.statProfiles.textContent = String(state.profiles.length)
  ui.statEvents.textContent = String(state.switches.length)
}

function renderRouteShell() {
  if (state.page !== "console") return
  const routeKey = state.route.replaceAll("-", "_")
  ui.routeLinks.forEach((link) => {
    const active = link.dataset.routeLink === state.route
    link.classList.toggle("route-active", active)
    link.setAttribute("aria-current", active ? "page" : "false")
  })
  ui.screens.forEach((screen) => {
    screen.hidden = screen.getAttribute("data-screen") !== state.route
  })
  if (ui.kpiStrip) {
    ui.kpiStrip.hidden = state.route !== "dashboard"
  }
  ui.quickbarRoute.textContent = t(`route_${routeKey}`).toUpperCase()
  ui.quickbarTitle.textContent = t(`route_${routeKey}`)
  ui.quickbarSubtitle.textContent = t(`route_desc_${routeKey}`)
}

function renderAccountSection() {
  if (state.page !== "console") return
  ui.accountSectionButtons.forEach((btn) => {
    const active = btn.dataset.accountsSection === state.section
    btn.classList.toggle("account-section-active", active)
    btn.setAttribute("aria-pressed", active ? "true" : "false")
  })
  ui.accountPanels.forEach((panel) => {
    panel.hidden = panel.getAttribute("data-accounts-panel") !== state.section
  })
}

function renderHealth() {
  if (state.page !== "console") return
  ui.liveStatus.textContent = state.health.live
  ui.readyStatus.textContent = state.health.ready
  ui.liveStatus.className = `status-badge ${state.health.live === "ok" ? "status-ok" : state.health.live === "error" ? "status-error" : ""}`.trim()
  ui.readyStatus.className = `status-badge ${state.health.ready === "ok" ? "status-ok" : state.health.ready === "error" ? "status-error" : ""}`.trim()
}

function renderDashboardSignals() {
  if (state.page !== "console") return
  if (state.logs.length === 0) {
    ui.dashboardSignals.innerHTML = `<li class="meta-note">${escapeHtml(t("no_signals"))}</li>`
    setPanelState(ui.dashboardSignalsState, "idle")
    return
  }

  ui.dashboardSignals.innerHTML = state.logs.slice(0, 8).map((item) => {
    const summary = logSummary(item)
    return `<li>
    <div class="log-head">
      <span class="log-level ${levelClass(item.level)}">${escapeHtml(item.level)}</span>
      <span class="pill">${escapeHtml(item.scope)}</span>
      <span class="meta-note">${escapeHtml(fmtDate(item.ts))}</span>
    </div>
    <div>${escapeHtml(item.message)}</div>
    ${summary ? `<div class="meta-note">${escapeHtml(summary)}</div>` : ""}
  </li>`
  }).join("")
  setPanelState(ui.dashboardSignalsState, "success")
}

function projectKeys({ includeInactive = true } = {}) {
  return state.projects
    .filter((project) => includeInactive || project?.is_active === true)
    .map((project) => project?.key)
    .filter((key) => typeof key === "string" && key.trim())
    .sort((a, b) => a.localeCompare(b))
}

function applyProjectSelect(selectNode, options, selectedValue, placeholder) {
  if (!selectNode) return ""

  if (!options.length) {
    selectNode.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`
    selectNode.value = ""
    selectNode.disabled = true
    return ""
  }

  selectNode.innerHTML = options.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`).join("")
  selectNode.disabled = false
  const fallback = options[0]
  selectNode.value = options.includes(selectedValue) ? selectedValue : fallback
  return selectNode.value
}

function applyGenericSelect(selectNode, options, selectedValue, placeholder) {
  if (!selectNode) return ""

  if (!Array.isArray(options) || !options.length) {
    selectNode.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`
    selectNode.value = ""
    selectNode.disabled = true
    return ""
  }

  selectNode.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("")
  selectNode.disabled = false
  const values = options.map((item) => item.value)
  const fallback = options[0]?.value ?? ""
  selectNode.value = values.includes(selectedValue) ? selectedValue : fallback
  return selectNode.value
}

function syncProjectBindings() {
  if (state.page !== "console") return

  const activeKeys = projectKeys({ includeInactive: false })
  const allKeys = projectKeys({ includeInactive: true })
  const legacyTaskKeys = state.tasks
    .map((task) => task.project_id)
    .filter((key) => typeof key === "string" && key.trim())
  const taskFilterKeys = Array.from(new Set([...allKeys, ...legacyTaskKeys])).sort((a, b) => a.localeCompare(b))

  const taskProject = applyProjectSelect(ui.taskProject, activeKeys, ui.taskProject?.value ?? "", t("project_option_none"))
  const memoryProject = applyProjectSelect(ui.memoryProject, activeKeys, ui.memoryProject?.value ?? "", t("project_option_none"))
  const scheduleProject = applyProjectSelect(ui.scheduleProject, activeKeys, ui.scheduleProject?.value ?? "", t("project_option_none"))
  const secretsProject = applyProjectSelect(ui.secretProject, allKeys, state.secretsFilters.project, t("project_option_none"))
  const profileOptions = state.taskAgentProfiles
    .filter((item) => item?.id && item?.is_enabled === true)
    .map((item) => ({
      value: item.id,
      label: `${item.name ?? item.id} (${item.role ?? t("task_field_na")})`
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const templateOptions = state.taskAgentTemplates
    .filter((item) => item?.id && item?.is_enabled === true)
    .map((item) => ({
      value: item.id,
      label: `${item.name ?? item.id} (${item.role ?? t("task_field_na")})`
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const taskAgentProfile = applyGenericSelect(
    ui.taskAgentProfile,
    profileOptions,
    ui.taskAgentProfile?.value ?? "",
    t("task_field_na")
  )
  const taskAgentTemplate = applyGenericSelect(
    ui.taskAgentTemplate,
    templateOptions,
    ui.taskAgentTemplate?.value ?? "",
    t("task_field_na")
  )
  const scheduleAgentProfile = applyGenericSelect(
    ui.scheduleTaskAgentProfile,
    profileOptions,
    ui.scheduleTaskAgentProfile?.value ?? "",
    t("task_field_na")
  )
  const scheduleAgentTemplate = applyGenericSelect(
    ui.scheduleTaskAgentTemplate,
    templateOptions,
    ui.scheduleTaskAgentTemplate?.value ?? "",
    t("task_field_na")
  )

  const taskSubmit = ui.taskForm?.querySelector('button[type="submit"]')
  const memorySubmit = ui.memoryForm?.querySelector('button[type="submit"]')
  const scheduleSubmit = ui.scheduleCreateForm?.querySelector('button[type="submit"]')
  const secretSubmit = ui.secretCreateForm?.querySelector('button[type="submit"]')
  if (taskSubmit) taskSubmit.disabled = !taskProject || !taskAgentProfile || !taskAgentTemplate
  if (memorySubmit) memorySubmit.disabled = !memoryProject
  if (scheduleSubmit) scheduleSubmit.disabled = !scheduleProject || !scheduleAgentProfile || !scheduleAgentTemplate
  if (secretSubmit) secretSubmit.disabled = !secretsProject
  state.secretsFilters.project = secretsProject

  if (ui.taskFilterProject) {
    ui.taskFilterProject.innerHTML = [
      `<option value="all">${escapeHtml(t("task_filter_any_project"))}</option>`,
      ...taskFilterKeys.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`)
    ].join("")
    ui.taskFilterProject.value = taskFilterKeys.includes(state.taskFilters.project) ? state.taskFilters.project : "all"
    state.taskFilters.project = ui.taskFilterProject.value
  }

}

function syncTaskFilters(items) {
  const statuses = Array.from(new Set(items.map((task) => task.status).filter((v) => typeof v === "string" && v.trim()))).sort((a, b) => a.localeCompare(b))

  ui.taskFilterStatus.innerHTML = [`<option value="all">${escapeHtml(t("task_filter_any_status"))}</option>`, ...statuses.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)].join("")

  ui.taskFilterSearch.value = state.taskFilters.search
  ui.taskFilterStatus.value = statuses.includes(state.taskFilters.status) ? state.taskFilters.status : "all"
  state.taskFilters.status = ui.taskFilterStatus.value
}

function renderProjectDetails() {
  const selected = state.projects.find((item) => item.key === state.selectedProjectKey) ?? null
  if (!selected || !state.projectSummary) {
    ui.projectDetailsEmpty.hidden = false
    ui.projectDetailsContent.hidden = true
    return
  }

  ui.projectDetailsEmpty.hidden = true
  ui.projectDetailsContent.hidden = false

  const summary = state.projectSummary
  const statuses = summary.tasks_by_status && typeof summary.tasks_by_status === "object"
    ? Object.entries(summary.tasks_by_status).sort(([a], [b]) => a.localeCompare(b))
    : []

  const summaryCards = [
    [t("project_summary_tasks_total"), String(summary.tasks_total ?? 0)],
    [t("project_summary_active_memory"), String(summary.active_memory_entries ?? 0)],
    [t("project_summary_switch_recent"), String(summary.switch_events_recent ?? 0)],
    [t("project_summary_last_switch"), fmtDate(summary.last_switch_event_at)],
    [t("project_summary_window"), t("project_summary_window_hours", { hours: summary.switch_events_window_hours ?? 24 })]
  ]

  ui.projectSummaryGrid.innerHTML = [
    ...summaryCards.map(([label, value]) => `<div class="project-summary-item"><p class="tiny-label">${escapeHtml(label)}</p><p>${escapeHtml(value)}</p></div>`),
    `<div class="project-summary-item project-summary-item-wide"><p class="tiny-label">${escapeHtml(t("project_summary_statuses"))}</p><div class="status-pill-wrap">${statuses.length
      ? statuses.map(([status, count]) => `<span class="pill">${escapeHtml(status)}: ${escapeHtml(String(count))}</span>`).join("")
      : `<span class="meta-note">${escapeHtml(t("task_field_na"))}</span>`}</div></div>`
  ].join("")

  ui.projectEditKey.value = selected.key
  ui.projectEditName.value = selected.name ?? ""
  ui.projectEditDescription.value = selected.description ?? ""
  ui.projectEditGithubUrl.value = selected.github_url ?? ""
  ui.projectEditWorkspacePath.value = selected.workspace_path ?? ""
  ui.projectEditActive.checked = selected.is_active === true
}

function renderProjects(items) {
  state.projects = Array.isArray(items) ? [...items].sort((a, b) => String(a.key).localeCompare(String(b.key))) : state.projects
  if (state.page !== "console") return

  syncProjectBindings()

  const search = state.projectFilters.search.trim().toLowerCase()
  const visible = state.projects.filter((project) => {
    if (!state.projectFilters.includeInactive && project.is_active !== true) return false
    if (!search) return true
    const haystack = `${project.key ?? ""} ${project.name ?? ""} ${project.github_url ?? ""} ${project.workspace_path ?? ""}`
    return haystack.toLowerCase().includes(search)
  })

  if (!visible.some((project) => project.key === state.selectedProjectKey)) {
    state.selectedProjectKey = visible[0]?.key ?? null
    state.projectSummary = null
  }

  if (!visible.length) {
    ui.projectsList.innerHTML = `<li class="meta-note">${escapeHtml(t("project_list_empty"))}</li>`
    renderProjectDetails()
    return
  }

  ui.projectsList.innerHTML = visible.map((project) => {
    const active = project.is_active === true
    const selected = project.key === state.selectedProjectKey
    return `<li class="project-card ${selected ? "project-card-selected" : ""}" data-project-key="${escapeHtml(project.key)}">
      <div class="task-card-head">
        <div class="task-card-title">${escapeHtml(project.name)}</div>
        <span class="pill ${active ? "pill-active" : ""}">${escapeHtml(active ? t("profile_state_active") : t("profile_state_inactive"))}</span>
      </div>
      <div class="meta-note"><code>${escapeHtml(project.key)}</code></div>
      <div class="meta-note">${escapeHtml(project.github_url ?? project.workspace_path ?? t("task_field_na"))}</div>
    </li>`
  }).join("")

  renderProjectDetails()
}

function renderTaskDetails(task) {
  if (!task) {
    if (ui.cancelTask) {
      ui.cancelTask.disabled = true
    }
    ui.taskDetailsContent.textContent = t("task_details_empty")
    return
  }

  if (ui.cancelTask) {
    const terminal = new Set(["DONE", "FAILED_TERMINAL", "ARCHIVED", "CANCELLED", "INTERRUPTED"])
    ui.cancelTask.disabled = terminal.has(task.status)
  }

  const rows = [
    [t("task_field_id"), `<code>${escapeHtml(task.id)}</code>`],
    [t("task_field_status"), escapeHtml(task.status ?? t("task_field_na"))],
    [t("task_field_priority"), escapeHtml(String(task.priority ?? t("task_field_na")))],
    [t("task_field_project"), escapeHtml(task.project_id ?? t("task_field_na"))],
    [t("task_field_agent_profile"), escapeHtml(task.agent_profile_id ?? t("task_field_na"))],
    [t("task_field_agent_template"), escapeHtml(task.agent_template_id ?? t("task_field_na"))],
    [t("task_field_created"), escapeHtml(fmtDate(task.created_at))],
    [t("task_field_updated"), escapeHtml(fmtDate(task.updated_at))],
    [t("task_field_cancelled"), escapeHtml(fmtDate(task.cancelled_at))],
    [t("task_field_cancel_reason"), escapeHtml(task.cancel_reason ?? t("task_field_na"))],
    [t("task_field_description"), escapeHtml(task.description ?? t("task_field_na"))]
  ]

  ui.taskDetailsContent.innerHTML = rows.map(([label, value]) => `<div class="task-detail-row"><span class="task-detail-label">${escapeHtml(label)}</span><span>${value}</span></div>`).join("")
}

function renderTasks(items) {
  state.tasks = Array.isArray(items) ? items : []
  if (state.page !== "console") return

  syncProjectBindings()
  syncTaskFilters(state.tasks)

  const search = state.taskFilters.search.trim().toLowerCase()
  const filtered = state.tasks.filter((task) => {
    if (state.taskFilters.project !== "all" && task.project_id !== state.taskFilters.project) return false
    if (state.taskFilters.status !== "all" && task.status !== state.taskFilters.status) return false
    if (!search) return true
    return `${task.id ?? ""} ${task.title ?? ""} ${task.description ?? ""}`.toLowerCase().includes(search)
  })

  const buckets = { waiting: [], running: [], completed: [] }
  filtered.forEach((task) => {
    if (COMPLETED_STATUSES.has(task.status)) buckets.completed.push(task)
    else if (RUNNING_STATUSES.has(task.status)) buckets.running.push(task)
    else if (WAITING_STATUSES.has(task.status)) buckets.waiting.push(task)
    else buckets.running.push(task)
  })

  const all = [...buckets.waiting, ...buckets.running, ...buckets.completed]
  if (!all.some((task) => task.id === state.selectedTaskId)) state.selectedTaskId = null

  const renderBucket = (node, list, emptyKey) => {
    if (!list.length) {
      node.innerHTML = `<li class="meta-note">${escapeHtml(t(emptyKey))}</li>`
      return
    }
    node.innerHTML = list.slice(0, 100).map((task) => `<li class="task-card ${state.selectedTaskId === task.id ? "task-card-selected" : ""}" data-task-id="${escapeHtml(task.id)}">
      <div class="task-card-head"><span class="pill">${escapeHtml(task.status)}</span><span class="meta-note">p${escapeHtml(task.priority)}</span></div>
      <div class="task-card-title">${escapeHtml(task.title)}</div>
      <div class="meta-note"><code>${escapeHtml(task.id)}</code></div>
      <div class="meta-note">${escapeHtml(String(task.description ?? "").slice(0, 120))}</div>
    </li>`).join("")
  }

  renderBucket(ui.tasksWaiting, buckets.waiting, "no_tasks_waiting")
  renderBucket(ui.tasksRunning, buckets.running, "no_tasks_running")
  renderBucket(ui.tasksCompleted, buckets.completed, "no_tasks_completed")

  ui.tasksWaitingCount.textContent = String(buckets.waiting.length)
  ui.tasksRunningCount.textContent = String(buckets.running.length)
  ui.tasksCompletedCount.textContent = String(buckets.completed.length)

  renderTaskDetails(filtered.find((task) => task.id === state.selectedTaskId) ?? null)
  updateStats()
}

function renderHeld(items) {
  state.held = Array.isArray(items) ? items : []
  if (state.page !== "console") return

  if (!state.held.length) {
    ui.heldSummary.textContent = t("no_held")
    ui.heldList.innerHTML = ""
    updateStats()
    return
  }

  ui.heldSummary.textContent = t("held_summary_count", { count: state.held.length })
  ui.heldList.innerHTML = state.held.map((task) => `<li><div class="task-card-head"><span class="pill">${escapeHtml(task.status)}</span><code>${escapeHtml(task.id)}</code></div><div>${escapeHtml(task.title)}</div></li>`).join("")
  updateStats()
}

function extractScheduleCron(ruleAst) {
  if (!ruleAst || typeof ruleAst !== "object") return null
  if (ruleAst.predicate === "time.cron" && typeof ruleAst.value === "string") return ruleAst.value
  if (Array.isArray(ruleAst.conditions)) {
    const cronNode = ruleAst.conditions.find((item) => item?.predicate === "time.cron" && typeof item?.value === "string")
    if (cronNode) return cronNode.value
  }
  if (Array.isArray(ruleAst.all)) {
    for (const child of ruleAst.all) {
      const cron = extractScheduleCron(child)
      if (cron) return cron
    }
  }
  if (Array.isArray(ruleAst.any)) {
    for (const child of ruleAst.any) {
      const cron = extractScheduleCron(child)
      if (cron) return cron
    }
  }
  if (ruleAst.not && typeof ruleAst.not === "object") {
    return extractScheduleCron(ruleAst.not)
  }
  return null
}

function renderSchedules(items) {
  state.schedules = Array.isArray(items) ? [...items] : []
  if (state.page !== "console") return
  if (!ui.schedulesList || !ui.scheduleRunsList) return

  syncProjectBindings()

  if (!state.schedules.length) {
    state.selectedScheduleId = null
    state.scheduleRuns = []
    ui.schedulesList.innerHTML = `<li class="meta-note">${escapeHtml(t("schedule_list_empty"))}</li>`
    ui.scheduleRunsList.innerHTML = `<li class="meta-note">${escapeHtml(t("schedule_runs_empty"))}</li>`
    return
  }

  if (!state.schedules.some((item) => item.id === state.selectedScheduleId)) {
    state.selectedScheduleId = state.schedules[0].id
  }

  const sorted = [...state.schedules].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")))
  ui.schedulesList.innerHTML = sorted.map((rule) => {
    const selected = rule.id === state.selectedScheduleId
    const enabled = rule.is_enabled === true
    const cron = extractScheduleCron(rule.rule_ast) ?? t("task_field_na")
    return `<li class="schedule-item ${selected ? "task-card-selected" : ""}" data-schedule-id="${escapeHtml(rule.id)}">
      <div class="task-card-head">
        <div class="task-card-title">${escapeHtml(rule.name ?? rule.id)}</div>
        <div class="action-bar">
          <span class="pill ${enabled ? "pill-active" : ""}">${escapeHtml(enabled ? t("profile_state_active") : t("profile_state_inactive"))}</span>
          <span class="pill">${escapeHtml(rule.scope ?? t("task_field_na"))}</span>
        </div>
      </div>
      <div class="meta-note">${escapeHtml(t("schedule_field_project"))}: <code>${escapeHtml(rule.project_id ?? t("task_field_na"))}</code></div>
      <div class="meta-note">${escapeHtml(t("schedule_field_cron"))}: <code>${escapeHtml(cron)}</code></div>
      <div class="action-bar">
        <button type="button" class="button-ghost" data-schedule-action="trigger" data-schedule-id="${escapeHtml(rule.id)}">${escapeHtml(t("schedule_action_trigger"))}</button>
        <button type="button" class="button-ghost" data-schedule-action="evaluate" data-schedule-id="${escapeHtml(rule.id)}">${escapeHtml(t("schedule_action_evaluate"))}</button>
        <button type="button" class="button-ghost" data-schedule-action="${enabled ? "disable" : "enable"}" data-schedule-id="${escapeHtml(rule.id)}">${escapeHtml(t(enabled ? "schedule_action_disable" : "schedule_action_enable"))}</button>
        <button type="button" class="button-danger" data-schedule-action="delete" data-schedule-id="${escapeHtml(rule.id)}">${escapeHtml(t("schedule_action_delete"))}</button>
      </div>
    </li>`
  }).join("")
}

function renderScheduleRuns(items) {
  state.scheduleRuns = Array.isArray(items) ? items : []
  if (state.page !== "console") return
  if (!ui.scheduleRunsList) return

  if (!state.selectedScheduleId) {
    ui.scheduleRunsList.innerHTML = `<li class="meta-note">${escapeHtml(t("schedule_runs_empty"))}</li>`
    return
  }

  if (!state.scheduleRuns.length) {
    ui.scheduleRunsList.innerHTML = `<li class="meta-note">${escapeHtml(t("schedule_runs_empty"))}</li>`
    return
  }

  ui.scheduleRunsList.innerHTML = state.scheduleRuns.slice(0, 80).map((run) => {
    const result = run?.result_json && typeof run.result_json === "object" ? run.result_json : null
    const matched = typeof result?.matched === "boolean" ? String(result.matched) : t("task_field_na")
    return `<li>
      <div class="task-card-head"><span class="pill">${escapeHtml(run.status ?? t("task_field_na"))}</span><span class="meta-note">${escapeHtml(fmtDate(run.started_at))}</span></div>
      <div class="meta-note"><code>${escapeHtml(run.id ?? t("task_field_na"))}</code></div>
      <div class="meta-note">${escapeHtml(t("schedule_trigger_matched", { value: matched }))}</div>
      <div class="meta-note">task_id=${escapeHtml(run.created_task_id ?? t("task_field_na"))}</div>
      <div class="meta-note">${escapeHtml(run.skip_reason ?? t("task_field_na"))}</div>
    </li>`
  }).join("")
}

function renderAgents(payload) {
  state.agents = payload && typeof payload === "object"
    ? { preparing: Array.isArray(payload.preparing) ? payload.preparing : [], running: Array.isArray(payload.running) ? payload.running : [], recent: Array.isArray(payload.recent) ? payload.recent : [] }
    : { preparing: [], running: [], recent: [] }

  if (state.page !== "console") return

  const all = [...state.agents.preparing, ...state.agents.running, ...state.agents.recent]
  if (!all.some((item) => item.id === state.selectedAgentId)) state.selectedAgentId = null
  if (!state.selectedAgentId && all.length) state.selectedAgentId = all[0].id

  const renderBucket = (node, list, emptyKey) => {
    if (!list.length) {
      node.innerHTML = `<li class="meta-note">${escapeHtml(t(emptyKey))}</li>`
      return
    }

    node.innerHTML = list.slice(0, 30).map((item) => {
      const template = item.target_template ? `${item.target_template.name} (${item.target_template.model})` : t("task_field_na")
      const account = item.account ? `${item.account.label} [${item.account.status}]` : t("task_field_na")
      return `<li class="agent-card ${state.selectedAgentId === item.id ? "agent-card-selected" : ""}" data-agent-id="${escapeHtml(item.id)}">
        <div class="agent-card-head"><span class="pill">${escapeHtml(item.status)}</span><code>${escapeHtml(item.id)}</code></div>
        <div class="agent-card-meta">${escapeHtml(t("agent_field_capability"))}: ${escapeHtml(item.capability)}</div>
        <div class="agent-card-meta">${escapeHtml(t("agent_field_template"))}: ${escapeHtml(template)}</div>
        <div class="agent-card-meta">${escapeHtml(t("agent_field_account"))}: ${escapeHtml(account)}</div>
      </li>`
    }).join("")
  }

  renderBucket(ui.agentsPreparing, state.agents.preparing, "no_preparing_agents")
  renderBucket(ui.agentsRunning, state.agents.running, "no_running_agents")
  renderBucket(ui.agentsRecent, state.agents.recent, "no_recent_agents")

  ui.agentsPreparingCount.textContent = String(state.agents.preparing.length)
  ui.agentsRunningCount.textContent = String(state.agents.running.length)
  ui.agentsRecentCount.textContent = String(state.agents.recent.length)

  const selected = all.find((item) => item.id === state.selectedAgentId)
  if (!selected) {
    ui.agentInspectorEmpty.hidden = false
    ui.agentInspectorContent.hidden = true
    ui.agentInspectorEmpty.textContent = t("agent_inspector_empty")
    return
  }

  const details = state.selectedAgentDetails && state.selectedAgentDetails.id === selected.id
    ? state.selectedAgentDetails
    : null

  const template = selected.target_template ? `${selected.target_template.name} (${selected.target_template.model})` : t("task_field_na")
  const account = selected.account ? `${selected.account.label} [${selected.account.status}]` : t("task_field_na")
  const executionMeta = details && details.execution_meta_json && typeof details.execution_meta_json === "object"
    ? details.execution_meta_json
    : {}
  const executionContext = executionMeta.execution_context && typeof executionMeta.execution_context === "object"
    ? executionMeta.execution_context
    : {}
  const memoryContext = executionMeta.memory_context && typeof executionMeta.memory_context === "object"
    ? executionMeta.memory_context
    : {}

  ui.agentInspectorId.textContent = selected.id ?? t("task_field_na")
  ui.agentInspectorStatus.textContent = details?.status ?? selected.status ?? t("task_field_na")
  ui.agentInspectorCapability.textContent = selected.capability ?? t("task_field_na")
  ui.agentInspectorTemplate.textContent = template
  ui.agentInspectorAccount.textContent = account
  ui.agentInspectorTrace.textContent = details?.trace_id ?? selected.trace_id ?? t("task_field_na")
  ui.agentInspectorExecMode.textContent = details?.execution_mode ?? selected.execution_mode ?? t("task_field_na")
  ui.agentInspectorCreated.textContent = fmtDate(details?.created_at ?? selected.created_at)
  ui.agentInspectorStarted.textContent = fmtDate(details?.started_at ?? selected.started_at)
  ui.agentInspectorEnded.textContent = fmtDate(details?.ended_at ?? selected.ended_at)
  ui.agentInspectorCwd.textContent = executionContext.cwd ?? t("task_field_na")
  ui.agentInspectorCwdSource.textContent = executionContext.cwd_source ?? t("task_field_na")
  const memoryText = memoryContext.project_id
    ? `${memoryContext.project_id}/${memoryContext.agent_role ?? "n/a"} entries=${memoryContext.entries_used ?? 0} disabled=${memoryContext.disabled === true ? "true" : "false"}`
    : t("task_field_na")
  ui.agentInspectorMemory.textContent = memoryText
  ui.agentInspectorResult.textContent = details?.result_summary ?? selected.log_preview ?? t("task_field_na")
  ui.agentInspectorPrompt.textContent = details?.input_prompt ?? selected.prompt ?? t("task_field_na")
  ui.agentInspectorLog.textContent = details?.execution_log ?? selected.log_preview ?? t("task_field_na")
  ui.agentInspectorEmpty.hidden = true
  ui.agentInspectorContent.hidden = false
}

function selectedAgentProfile() {
  return state.agentProfiles.find((item) => item.id === state.selectedAgentProfileId) ?? null
}

function syncAgentProfileRoleFilter(items) {
  if (!ui.agentProfileFilterRole) return
  const roles = Array.from(new Set((Array.isArray(items) ? items : [])
    .map((item) => item.role)
    .filter((value) => typeof value === "string" && value.trim()))).sort((a, b) => a.localeCompare(b))

  ui.agentProfileFilterRole.innerHTML = [
    `<option value="all">${escapeHtml(t("agent_profile_filter_any_role"))}</option>`,
    ...roles.map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`)
  ].join("")

  ui.agentProfileFilterRole.value = roles.includes(state.agentProfileFilters.role)
    ? state.agentProfileFilters.role
    : "all"
  state.agentProfileFilters.role = ui.agentProfileFilterRole.value
}

function renderAgentProfileBindings(profile) {
  if (!ui.agentProfileBindServer || !ui.agentProfileBindingsList) return

  const availableServers = [...state.mcpServers].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")))
  if (!availableServers.length) {
    ui.agentProfileBindServer.innerHTML = `<option value="">${escapeHtml(t("task_field_na"))}</option>`
    ui.agentProfileBindServer.disabled = true
  } else {
    ui.agentProfileBindServer.innerHTML = availableServers.map((server) => `<option value="${escapeHtml(server.id)}">${escapeHtml(server.name)} (${escapeHtml(server.transport)})</option>`).join("")
    const current = ui.agentProfileBindServer.value
    ui.agentProfileBindServer.disabled = false
    ui.agentProfileBindServer.value = availableServers.some((server) => server.id === current) ? current : availableServers[0].id
  }

  const bindSubmit = ui.agentProfileBindForm?.querySelector('button[type="submit"]')
  if (bindSubmit) bindSubmit.disabled = !profile || !availableServers.length

  if (!profile || !state.agentProfileBindings.length) {
    ui.agentProfileBindingsList.innerHTML = `<li class="meta-note">${escapeHtml(t("agent_profile_bindings_empty"))}</li>`
    return
  }

  const rows = [...state.agentProfileBindings].sort((a, b) => {
    const byPriority = Number(a.priority ?? 0) - Number(b.priority ?? 0)
    if (byPriority !== 0) return byPriority
    const nameA = String(a?.mcp_server?.name ?? a?.mcp_server_id ?? "")
    const nameB = String(b?.mcp_server?.name ?? b?.mcp_server_id ?? "")
    return nameA.localeCompare(nameB)
  })

  ui.agentProfileBindingsList.innerHTML = rows.map((binding) => {
    const server = binding?.mcp_server && typeof binding.mcp_server === "object" ? binding.mcp_server : null
    const serverName = server?.name ?? binding.mcp_server_id ?? t("task_field_na")
    const transport = server?.transport ?? t("task_field_na")
    const origin = server?.origin_type ?? t("task_field_na")
    const config = binding.config_json && typeof binding.config_json === "object"
      ? JSON.stringify(binding.config_json)
      : ""
    const configPreview = config ? config.slice(0, 180) : ""
    const isRequired = binding.is_required === true
    const removeButton = isRequired
      ? `<span class="meta-note">${escapeHtml(t("agent_profile_bindings_orchestrator_required"))}</span>`
      : `<button type="button" class="button-ghost" data-agent-profile-unbind="${escapeHtml(binding.mcp_server_id)}">${escapeHtml(t("agent_profile_unbind_action"))}</button>`

    return `<li>
      <div class="task-card-head">
        <div class="task-card-title">${escapeHtml(serverName)}</div>
        <div class="action-bar">
          <span class="pill ${isRequired ? "pill-active" : ""}">${escapeHtml(isRequired ? t("agent_profile_bind_required_label") : t("agent_profile_bind_optional"))}</span>
          <span class="pill">p${escapeHtml(String(binding.priority ?? 0))}</span>
        </div>
      </div>
      <div class="meta-note">${escapeHtml(transport)} · ${escapeHtml(origin)}</div>
      ${configPreview ? `<div class="meta-note"><code>${escapeHtml(configPreview)}</code></div>` : ""}
      <div class="action-bar">${removeButton}</div>
    </li>`
  }).join("")
}

function renderAgentProfileScripts() {
  const byOs = new Map(state.agentProfileScripts.map((item) => [item.os, item]))
  const nodes = {
    windows: {
      type: ui.agentProfileScriptWindowsType,
      content: ui.agentProfileScriptWindowsContent,
      meta: ui.agentProfileScriptWindowsMeta
    },
    linux: {
      type: ui.agentProfileScriptLinuxType,
      content: ui.agentProfileScriptLinuxContent,
      meta: ui.agentProfileScriptLinuxMeta
    },
    macos: {
      type: ui.agentProfileScriptMacosType,
      content: ui.agentProfileScriptMacosContent,
      meta: ui.agentProfileScriptMacosMeta
    }
  }

  for (const [os, refs] of Object.entries(nodes)) {
    const script = byOs.get(os) ?? null
    if (refs.type) refs.type.value = script?.script_type === "shell" ? "shell" : "instruction"
    if (refs.content) refs.content.value = script?.content ?? ""
    if (refs.meta) {
      refs.meta.textContent = script
        ? t("agent_profile_script_version", {
          version: script.version ?? 1,
          updated: fmtDate(script.updated_at)
        })
        : t("agent_profile_script_empty")
    }
  }
}

function renderAgentProfileDetails() {
  const profile = selectedAgentProfile()
  if (!profile) {
    ui.agentProfileDetailsEmpty.hidden = false
    ui.agentProfileDetailsContent.hidden = true
    renderAgentProfileBindings(null)
    renderAgentProfileScripts()
    return
  }

  ui.agentProfileDetailsEmpty.hidden = true
  ui.agentProfileDetailsContent.hidden = false

  ui.agentProfileSummaryGrid.innerHTML = [
    [t("agent_profile_field_id"), profile.id],
    [t("agent_profile_field_role"), profile.role],
    [t("agent_profile_field_source_policy"), profile.source_policy],
    [t("agent_profile_field_status"), profile.is_enabled === true ? t("profile_state_active") : t("profile_state_inactive")],
    [t("agent_profile_field_updated"), fmtDate(profile.updated_at)]
  ].map(([label, value]) => `<div class="project-summary-item"><p class="tiny-label">${escapeHtml(label)}</p><p>${escapeHtml(value ?? t("task_field_na"))}</p></div>`).join("")

  ui.agentProfileEditId.value = profile.id ?? ""
  ui.agentProfileEditName.value = profile.name ?? ""
  ui.agentProfileEditRole.value = profile.role ?? ""
  ui.agentProfileEditSourcePolicy.value = profile.source_policy ?? "catalog_only"
  ui.agentProfileEditEnabled.checked = profile.is_enabled === true
  ui.agentProfileEditDescription.value = profile.description ?? ""

  renderAgentProfileBindings(profile)
  renderAgentProfileScripts()
}

function renderAgentProfiles(items) {
  state.agentProfiles = Array.isArray(items)
    ? [...items].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")))
    : state.agentProfiles
  state.taskAgentProfiles = state.agentProfiles
  if (state.page !== "console") return

  syncProjectBindings()
  syncAgentProfileRoleFilter(state.agentProfiles)

  ui.agentProfileFilterSearch.value = state.agentProfileFilters.search
  ui.agentProfileFilterIncludeDisabled.checked = state.agentProfileFilters.includeDisabled

  const search = state.agentProfileFilters.search.trim().toLowerCase()
  const visible = state.agentProfiles.filter((profile) => {
    if (!state.agentProfileFilters.includeDisabled && profile.is_enabled !== true) return false
    if (state.agentProfileFilters.role !== "all" && profile.role !== state.agentProfileFilters.role) return false
    if (!search) return true
    const haystack = `${profile.id ?? ""} ${profile.name ?? ""} ${profile.role ?? ""} ${profile.description ?? ""} ${profile.source_policy ?? ""}`
    return haystack.toLowerCase().includes(search)
  })

  const previousSelectedId = state.selectedAgentProfileId
  if (!visible.some((item) => item.id === state.selectedAgentProfileId)) {
    state.selectedAgentProfileId = visible[0]?.id ?? null
  }
  if (previousSelectedId !== state.selectedAgentProfileId) {
    state.agentProfileBindings = []
    state.agentProfileScripts = []
    if (state.token && state.selectedAgentProfileId) {
      void refreshSelectedAgentProfileContext().catch((error) => {
        pushLog("warn", "ui", t("error_generic"), {
          route: "/api/agent-profiles/:id/*",
          message: error?.message ?? "failed_to_refresh_agent_profile_context"
        })
      })
    }
  }

  if (!visible.length) {
    ui.agentProfilesList.innerHTML = `<li class="meta-note">${escapeHtml(t("agent_profile_list_empty"))}</li>`
    renderAgentProfileDetails()
    return
  }

  ui.agentProfilesList.innerHTML = visible.map((profile) => {
    const selected = profile.id === state.selectedAgentProfileId
    const enabled = profile.is_enabled === true
    return `<li class="project-card ${selected ? "project-card-selected" : ""}" data-agent-profile-id="${escapeHtml(profile.id)}">
      <div class="task-card-head">
        <div class="task-card-title">${escapeHtml(profile.name ?? profile.id)}</div>
        <div class="action-bar">
          <span class="pill">${escapeHtml(profile.role ?? t("task_field_na"))}</span>
          <span class="pill ${enabled ? "pill-active" : ""}">${escapeHtml(enabled ? t("profile_state_active") : t("profile_state_inactive"))}</span>
        </div>
      </div>
      <div class="meta-note"><code>${escapeHtml(profile.id)}</code></div>
      <div class="meta-note">${escapeHtml(profile.source_policy ?? t("task_field_na"))}</div>
    </li>`
  }).join("")

  renderAgentProfileDetails()
}

function renderProfiles(items) {
  state.profiles = Array.isArray(items) ? items : []
  if (state.page !== "console") return

  ui.activeProfile.textContent = state.activeProfile
    ? t("active_profile_value", { label: state.activeProfile.label, id: deriveAuthProfileDisplayId(state.activeProfile) })
    : t("active_profile_none")

  if (!state.profiles.length) {
    ui.profilesBody.innerHTML = `<p class="meta-note">${escapeHtml(t("no_profiles"))}</p>`
    updateStats()
    return
  }

  ui.profilesBody.innerHTML = state.profiles.map((item) => {
    const active = item.status === "active"
    const current = state.activeProfile?.id === item.id
    const displayId = deriveAuthProfileDisplayId(item)
    const toggleButton = buildAuthProfileToggleButton(item, "profile-action", item.id)
    return `<article>
      <div class="task-card-head">
        <div class="profile-title">${escapeHtml(item.label)}</div>
        <div class="action-bar">${current ? `<span class="pill pill-active">${escapeHtml(t("active_now"))}</span>` : ""}<span class="pill ${active ? "pill-active" : ""}">${escapeHtml(active ? t("profile_state_active") : t("profile_state_inactive"))}</span></div>
      </div>
      <div class="account-meta"><code>${escapeHtml(displayId)}</code></div>
      <div class="action-bar">
        ${toggleButton}
        <button type="button" class="button-danger" data-profile-action="delete" data-profile-id="${escapeHtml(item.id)}">${escapeHtml(t("action_delete"))}</button>
      </div>
    </article>`
  }).join("")

  updateStats()
  renderSwitchPolicy()
}

function renderFleet(items) {
  state.fleet = Array.isArray(items) ? items : []
  if (state.page !== "console") return

  if (!state.fleet.length) {
    ui.accountFleet.innerHTML = `<p class="meta-note">${escapeHtml(t("no_profiles"))}</p>`
    return
  }

  ui.accountFleet.innerHTML = state.fleet.map((item) => {
    const p1 = clampPercent(item.primary_remaining_percent)
    const p2 = clampPercent(item.secondary_remaining_percent)
    const l1 = p1 == null ? t("account_limit_na") : String(p1)
    const l2 = p2 == null ? t("account_limit_na") : String(p2)
    const r1 = item.primary_resets_at_utc ?? t("task_field_na")
    const r2 = item.secondary_resets_at_utc ?? t("task_field_na")
    const src = item.limits_error ? `error=${item.limits_error}` : String(item.limits_source ?? "live")
    const current = state.activeProfile?.id === item.id
    const displayId = deriveAuthProfileDisplayId(item)
    const toggleButton = buildAuthProfileToggleButton(item, "fleet-action", item.id)

    return `<article>
      <div class="task-card-head"><div class="account-title">${escapeHtml(item.label)}</div><div class="action-bar">${current ? `<span class="pill pill-active">${escapeHtml(t("active_now"))}</span>` : ""}<span class="pill">${escapeHtml(item.status)}</span></div></div>
      <div class="account-meta"><code>${escapeHtml(displayId)}</code></div>
      <div class="limit-bars">
        <div class="limit-row"><span class="tiny-label">5H</span><div class="limit-track"><div class="limit-fill" style="width:${p1 ?? 0}%"></div></div><strong>${escapeHtml(l1)}%</strong></div>
        <div class="limit-row"><span class="tiny-label">WEEK</span><div class="limit-track"><div class="limit-fill" style="width:${p2 ?? 0}%"></div></div><strong>${escapeHtml(l2)}%</strong></div>
      </div>
      <div class="meta-note">${escapeHtml(t("account_limits_5h", { remaining: l1, reset: r1 }))}</div>
      <div class="meta-note">${escapeHtml(t("account_limits_week", { remaining: l2, reset: r2 }))}</div>
      <div class="meta-note">${escapeHtml(t("account_limits_source", { source: src }))}</div>
      <div class="action-bar">
        ${toggleButton}
        <button type="button" class="button-ghost" data-fleet-action="history" data-profile-id="${escapeHtml(item.id)}">${escapeHtml(t("action_open_history"))}</button>
        <button type="button" class="button-danger" data-fleet-action="delete" data-profile-id="${escapeHtml(item.id)}">${escapeHtml(t("action_delete"))}</button>
      </div>
    </article>`
  }).join("")
  renderSwitchPolicy()
}

function renderSwitchPolicy() {
  if (state.page !== "console") return
  if (!ui.switchPolicyForm || !ui.switchPolicyEligible) return

  const config = normalizeSwitchPolicyConfig(state.switchPolicy?.config)
  state.switchPolicy.config = config

  ui.switchPolicyEnabled.checked = state.switchPolicy.enabled === true
  ui.switchPolicyFive.value = String(config.five_hour_remaining_percent_lt)
  ui.switchPolicyWeek.value = String(config.weekly_remaining_percent_lt)
  ui.switchPolicyGuard.value = String(config.reset_guard_hours)
  ui.switchPolicyProbe.value = String(config.probe_interval_sec)
  ui.switchPolicyCooldown.value = String(config.switch_cooldown_sec)

  const profileItems = Array.from(
    new Map(
      state.profiles
        .filter((item) => item?.id)
        .map((item) => [item.id, item])
    ).values()
  )

  if (!profileItems.length) {
    ui.switchPolicyEligible.innerHTML = `<p class="meta-note">${escapeHtml(t("switch_policy_no_profiles"))}</p>`
  } else {
    ui.switchPolicyEligible.innerHTML = profileItems.map((profile) => {
      const checked = config.eligible_profile_ids.includes(profile.id)
      const displayId = deriveAuthProfileDisplayId(profile)
      return `<label class="checkbox-option">
        <input type="checkbox" data-switch-policy-profile="${escapeHtml(profile.id)}" ${checked ? "checked" : ""} />
        <span>${escapeHtml(profile.label ?? profile.id)}</span>
        <code>${escapeHtml(displayId)}</code>
      </label>`
    }).join("")
  }

  const decision = state.switchPolicy.lastDecision
  if (!decision) {
    ui.switchPolicyLast.textContent = t("switch_policy_last_empty")
  } else {
    ui.switchPolicyLast.textContent = t("switch_policy_last", {
      status: decision.status ?? t("task_field_na"),
      reason: decision.reason ?? t("task_field_na"),
      time: fmtDate(decision.time)
    })
  }
}

function syncSwitchFilters(items) {
  const statuses = ["started", "completed", "failed", "skipped"]
  const profilesFromItems = items
    .flatMap((item) => [item.from_auth_profile_id, item.to_auth_profile_id])
    .filter((v) => typeof v === "string" && v.trim())
  const profilesFromRegistry = state.profiles
    .map((item) => item?.id)
    .filter((v) => typeof v === "string" && v.trim())
  const profiles = Array.from(new Set([...profilesFromRegistry, ...profilesFromItems])).sort((a, b) => a.localeCompare(b))

  ui.switchFilterStatus.innerHTML = [`<option value="all">${escapeHtml(t("switch_filter_any_status"))}</option>`, ...statuses.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)].join("")
  ui.switchFilterProfile.innerHTML = [`<option value="all">${escapeHtml(t("switch_filter_any_profile"))}</option>`, ...profiles.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)].join("")

  ui.switchFilterSearch.value = state.switchFilters.search
  ui.switchFilterStatus.value = statuses.includes(state.switchFilters.status) ? state.switchFilters.status : "all"
  ui.switchFilterProfile.value = profiles.includes(state.switchFilters.profile) ? state.switchFilters.profile : "all"
  state.switchFilters.status = ui.switchFilterStatus.value
  state.switchFilters.profile = ui.switchFilterProfile.value
}

function renderSwitches(items) {
  state.switches = Array.isArray(items) ? items : []
  if (state.page !== "console") return

  syncSwitchFilters(state.switches)

  if (!state.switches.length) {
    ui.switchEvents.innerHTML = `<li class="meta-note">${escapeHtml(t("no_switch_events"))}</li>`
    updateStats()
    return
  }

  const search = state.switchFilters.search.trim().toLowerCase()
  const filtered = state.switches.filter((item) => {
    if (state.switchFilters.status !== "all" && item.status !== state.switchFilters.status) return false
    if (state.switchFilters.profile !== "all") {
      const from = item.from_auth_profile_id ?? ""
      const to = item.to_auth_profile_id ?? ""
      if (from !== state.switchFilters.profile && to !== state.switchFilters.profile) return false
    }
    if (!search) return true
    return `${item.status ?? ""} ${item.reason ?? ""} ${item.from_auth_profile_id ?? ""} ${item.to_auth_profile_id ?? ""}`.toLowerCase().includes(search)
  })

  if (!filtered.length) {
    ui.switchEvents.innerHTML = `<li class="meta-note">${escapeHtml(t("no_switch_events"))}</li>`
    updateStats()
    return
  }

  ui.switchEvents.innerHTML = filtered.slice(0, 80).map((item) => {
    const from = item.from_auth_profile_id ?? "none"
    const to = item.to_auth_profile_id ?? "none"
    return `<li>
      <div class="task-card-head"><span class="pill">${escapeHtml(item.status)}</span><span class="meta-note">${escapeHtml(fmtDate(item.started_at))}</span></div>
      <div>${escapeHtml(item.reason ?? "")}</div>
      <div class="meta-note">${escapeHtml(t("switch_event_from_to", { from, to }))}</div>
      <div class="action-bar">
        ${from === "none" ? "" : `<button type="button" class="button-ghost" data-switch-profile="${escapeHtml(from)}">${escapeHtml(from)}</button>`}
        ${to === "none" ? "" : `<button type="button" class="button-ghost" data-switch-profile="${escapeHtml(to)}">${escapeHtml(to)}</button>`}
      </div>
      <div class="meta-note">${escapeHtml(t("switch_event_ended_at", { value: fmtDate(item.ended_at) }))}</div>
    </li>`
  }).join("")

  updateStats()
}

function renderSecrets(items) {
  state.secrets = Array.isArray(items) ? items : state.secrets
  if (state.page !== "console") return

  if (ui.secretFilterSearch) {
    ui.secretFilterSearch.value = state.secretsFilters.search
  }

  if (!state.secretsFilters.project) {
    ui.secretsList.innerHTML = `<li class="meta-note">${escapeHtml(t("secrets_project_missing"))}</li>`
    return
  }

  const search = state.secretsFilters.search.trim().toLowerCase()
  const visible = state.secrets.filter((secret) => {
    if (!search) return true
    const haystack = `${secret.key ?? ""} ${secret.description ?? ""} ${secret.masked_preview ?? ""}`.toLowerCase()
    return haystack.includes(search)
  })

  if (!visible.length) {
    ui.secretsList.innerHTML = `<li class="meta-note">${escapeHtml(t("secrets_list_empty"))}</li>`
    return
  }

  ui.secretsList.innerHTML = visible.map((secret) => {
    const roles = Array.isArray(secret.role_bindings)
      ? secret.role_bindings.map((item) => item?.role).filter((value) => typeof value === "string" && value.trim())
      : []
    const templates = Array.isArray(secret.template_bindings)
      ? secret.template_bindings.map((item) => item?.template_id).filter((value) => typeof value === "string" && value.trim())
      : []
    const active = secret.is_active === true
    const statusText = active ? t("profile_state_active") : t("profile_state_inactive")

    return `<li class="secret-card" data-secret-id="${escapeHtml(secret.id)}" data-secret-project="${escapeHtml(secret.project_id)}" data-secret-active="${String(active)}">
      <div class="task-card-head">
        <div class="task-card-title">${escapeHtml(secret.key ?? t("task_field_na"))}</div>
        <span class="pill ${active ? "pill-active" : ""}">${escapeHtml(statusText)}</span>
      </div>
      <div class="meta-note">${escapeHtml(secret.description ?? t("task_field_na"))}</div>
      <div class="secret-bindings">
        <div class="meta-note">${escapeHtml(t("secrets_field_masked"))}: <code>${escapeHtml(secret.masked_preview ?? t("task_field_na"))}</code></div>
        <div class="meta-note">${escapeHtml(t("secrets_field_version"))}: ${escapeHtml(String(secret.version ?? 1))}</div>
        <div class="meta-note">${escapeHtml(t("task_field_updated"))}: ${escapeHtml(fmtDate(secret.updated_at))}</div>
        <div class="meta-note">${escapeHtml(t("secrets_field_rotated"))}: ${escapeHtml(fmtDate(secret.rotated_at))}</div>
        <div class="meta-note">${escapeHtml(t("secrets_field_revoked"))}: ${escapeHtml(fmtDate(secret.revoked_at))}</div>
        <div class="meta-note">${escapeHtml(t("secrets_bindings_roles"))}: ${roles.length ? `<code>${escapeHtml(roles.join(", "))}</code>` : escapeHtml(t("task_field_na"))}</div>
        <div class="meta-note">${escapeHtml(t("secrets_bindings_templates"))}: ${templates.length ? `<code>${escapeHtml(templates.join(", "))}</code>` : escapeHtml(t("task_field_na"))}</div>
      </div>
      <div class="secret-actions">
        <button type="button" class="button-ghost" data-secret-action="rotate">${escapeHtml(t("secrets_action_rotate"))}</button>
        <button type="button" class="button-ghost" data-secret-action="${active ? "deactivate" : "activate"}">${escapeHtml(t(active ? "secrets_action_deactivate" : "secrets_action_activate"))}</button>
        <button type="button" class="button-ghost" data-secret-action="bind-role">${escapeHtml(t("secrets_action_bind_role"))}</button>
        <button type="button" class="button-ghost" data-secret-action="unbind-role">${escapeHtml(t("secrets_action_unbind_role"))}</button>
        <button type="button" class="button-ghost" data-secret-action="bind-template">${escapeHtml(t("secrets_action_bind_template"))}</button>
        <button type="button" class="button-ghost" data-secret-action="unbind-template">${escapeHtml(t("secrets_action_unbind_template"))}</button>
        <button type="button" class="button-warn" data-secret-action="revoke">${escapeHtml(t("secrets_action_revoke"))}</button>
      </div>
    </li>`
  }).join("")
}

function renderMemory(items) {
  state.memory = Array.isArray(items) ? items : []
  if (state.page !== "console") return

  if (!state.memory.length) {
    ui.memoryList.innerHTML = `<li class="meta-note">${escapeHtml(t("no_memory_entries"))}</li>`
    return
  }

  ui.memoryList.innerHTML = state.memory.slice(0, 60).map((item) => {
    const active = item.is_active === true
    return `<li class="memory-item">
      <div class="memory-item-head"><div class="memory-item-title">${escapeHtml(item.title)}</div><span class="pill ${active ? "pill-active" : ""}">${escapeHtml(active ? t("profile_state_active") : t("profile_state_inactive"))}</span></div>
      <div class="meta-note"><code>${escapeHtml(item.project_id)}</code> role=${escapeHtml(item.agent_role)}</div>
      <div>${escapeHtml(item.content)}</div>
      <div class="action-bar"><button type="button" class="button-ghost" data-memory-id="${escapeHtml(item.id)}" data-memory-next="${String(!active)}">${escapeHtml(active ? t("action_disable") : t("action_enable"))}</button></div>
    </li>`
  }).join("")
}

function renderExecutions(items) {
  state.executions = Array.isArray(items) ? items : []
  if (state.page !== "console") return

  if (!state.executions.length) {
    ui.executionsList.innerHTML = `<li class="meta-note">${escapeHtml(t("no_executions"))}</li>`
    return
  }

  ui.executionsList.innerHTML = state.executions.slice(0, 80).map((item) => `<li>
    <div class="task-card-head"><span class="pill">${escapeHtml(item.status)}</span><span class="meta-note">${escapeHtml(fmtDate(item.started_at))}</span></div>
    <div>${escapeHtml(item.event_type)}</div>
    <div class="meta-note">${escapeHtml(item.module_key)}</div>
    <div class="meta-note">end: ${escapeHtml(fmtDate(item.ended_at))}</div>
  </li>`).join("")
}

function renderLogs() {
  if (state.page !== "console") return

  ui.logFilterLevel.value = state.logFilters.level
  ui.logFilterScope.value = state.logFilters.scope
  ui.logFilterSearch.value = state.logFilters.search

  if (!state.logs.length) {
    ui.logsList.innerHTML = `<li class="meta-note">${escapeHtml(t("no_logs"))}</li>`
    return
  }

  const search = state.logFilters.search.trim().toLowerCase()
  const filtered = state.logs.filter((item) => {
    if (state.logFilters.level !== "all" && item.level !== state.logFilters.level) return false
    if (state.logFilters.scope !== "all" && item.scope !== state.logFilters.scope) return false
    if (!search) return true
    return `${item.message} ${JSON.stringify(item.details ?? {})}`.toLowerCase().includes(search)
  })

  if (!filtered.length) {
    ui.logsList.innerHTML = `<li class="meta-note">${escapeHtml(t("no_logs"))}</li>`
    return
  }

  ui.logsList.innerHTML = filtered.slice(0, 200).map((item) => {
    const details = item.details && Object.keys(item.details).length ? JSON.stringify(item.details, null, 2) : ""
    const summary = logSummary(item)
    return `<li class="log-item"><div class="log-head"><span class="log-level ${levelClass(item.level)}">${escapeHtml(item.level)}</span><span class="pill">${escapeHtml(item.scope)}</span><span class="meta-note">${escapeHtml(fmtDate(item.ts))}</span></div><div>${escapeHtml(item.message)}</div>${summary ? `<div class="meta-note">${escapeHtml(summary)}</div>` : ""}${details ? `<details class="log-details"><summary>${escapeHtml(t("logs_details_toggle"))}</summary><pre class="mono-box">${escapeHtml(details)}</pre></details>` : ""}</li>`
  }).join("")
}

async function refreshHealth() {
  try {
    await requestRaw("/health/live")
    state.health.live = "ok"
  } catch {
    state.health.live = "error"
  }
  try {
    await requestRaw("/health/ready")
    state.health.ready = "ok"
  } catch {
    state.health.ready = "error"
  }
  renderHealth()
}

async function fetchProjectRegistry({ includeInactive = true } = {}) {
  const response = await requestJson(`/api/projects?include_inactive=${includeInactive ? "true" : "false"}`)
  const items = Array.isArray(response?.items) ? response.items : []
  state.projects = [...items].sort((a, b) => String(a.key).localeCompare(String(b.key)))
  syncProjectBindings()
  return state.projects
}

async function refreshProjectSummary() {
  if (!state.selectedProjectKey) {
    state.projectSummary = null
    renderProjectDetails()
    return null
  }

  const summary = await requestJson(`/api/projects/${encodeURIComponent(state.selectedProjectKey)}/summary`)
  state.projectSummary = summary
  renderProjectDetails()
  return summary
}

async function refreshProjects() {
  return withPanel(ui.projectsPanelState, "system", async () => {
    const includeInactive = state.projectFilters.includeInactive
    const items = await fetchProjectRegistry({ includeInactive })
    renderProjects(items)
    await refreshProjectSummary()
  })
}

async function refreshTasks() {
  if (state.token) {
    try {
      const [projects, profiles, templates] = await Promise.all([
        fetchProjectRegistry({ includeInactive: true }),
        requestJson("/api/agent-profiles?include_disabled=false&limit=200"),
        requestJson("/api/agents/templates")
      ])
      if (Array.isArray(projects)) {
        state.projects = projects
      }
      state.taskAgentProfiles = Array.isArray(profiles?.items) ? profiles.items : []
      state.taskAgentTemplates = Array.isArray(templates?.items) ? templates.items : []
    } catch {
      // best-effort sync for selectors in tasks form/filters
    }
  }
  return withPanel(ui.tasksPanelState, "system", async () => renderTasks((await requestJson("/api/tasks")).items))
}

async function refreshHeld() {
  return withPanel(ui.heldPanelState, "system", async () => renderHeld((await requestJson("/api/queue/held")).items))
}

async function refreshScheduleRuns() {
  if (!state.selectedScheduleId) {
    renderScheduleRuns([])
    return []
  }

  const response = await requestJson(`/api/schedules/${encodeURIComponent(state.selectedScheduleId)}/runs`)
  const items = Array.isArray(response?.items) ? response.items : []
  renderScheduleRuns(items)
  return items
}

async function refreshSchedulesRoute() {
  if (state.token) {
    try {
      const [projects, profiles, templates] = await Promise.all([
        fetchProjectRegistry({ includeInactive: false }),
        requestJson("/api/agent-profiles?include_disabled=false&limit=200"),
        requestJson("/api/agents/templates")
      ])
      if (Array.isArray(projects)) {
        state.projects = projects
      }
      state.taskAgentProfiles = Array.isArray(profiles?.items) ? profiles.items : []
      state.taskAgentTemplates = Array.isArray(templates?.items) ? templates.items : []
    } catch {
      // best-effort sync for project selector in schedules form
    }
  }

  return withPanel(ui.schedulesPanelState, "system", async () => {
    const response = await requestJson("/api/schedules")
    renderSchedules(response?.items ?? [])
    await refreshScheduleRuns()
  })
}

async function refreshAgents() {
  return withPanel(ui.agentsPanelState, "system", async () => {
    renderAgents(await requestJson("/api/delegation/cards"))
    await refreshSelectedAgentDetails()
  })
}

async function refreshSelectedAgentProfileContext() {
  if (!state.selectedAgentProfileId || !state.token) {
    state.agentProfileBindings = []
    state.agentProfileScripts = []
    renderAgentProfileDetails()
    return
  }

  const profileId = state.selectedAgentProfileId
  try {
    const [bindingsResponse, scriptsResponse] = await Promise.all([
      requestJson(`/api/agent-profiles/${encodeURIComponent(profileId)}/mcp-servers`),
      requestJson(`/api/agent-profiles/${encodeURIComponent(profileId)}/scripts`)
    ])
    state.agentProfileBindings = Array.isArray(bindingsResponse?.items) ? bindingsResponse.items : []
    state.agentProfileScripts = Array.isArray(scriptsResponse?.items) ? scriptsResponse.items : []
  } catch (error) {
    if (error?.status === 404) {
      state.selectedAgentProfileId = null
      state.agentProfileBindings = []
      state.agentProfileScripts = []
      return
    }
    throw error
  }

  renderAgentProfileDetails()
}

async function refreshAgentProfilesRoute() {
  return withPanel(ui.agentProfilesPanelState, "system", async () => {
    const [profilesResponse, templatesResponse, serversResponse] = await Promise.all([
      requestJson("/api/agent-profiles?include_disabled=true&limit=200"),
      requestJson("/api/agents/templates"),
      requestJson("/api/mcp/servers?include_unapproved=true")
    ])
    state.agentProfiles = Array.isArray(profilesResponse?.items) ? profilesResponse.items : []
    state.taskAgentProfiles = state.agentProfiles
    state.taskAgentTemplates = Array.isArray(templatesResponse?.items) ? templatesResponse.items : []
    state.mcpServers = Array.isArray(serversResponse?.items) ? serversResponse.items : []

    if (!state.agentProfiles.some((item) => item.id === state.selectedAgentProfileId)) {
      state.selectedAgentProfileId = state.agentProfiles[0]?.id ?? null
    }

    await refreshSelectedAgentProfileContext()
    renderAgentProfiles(state.agentProfiles)
  })
}

async function refreshSelectedAgentDetails() {
  if (!state.selectedAgentId || !state.token) return

  try {
    const details = await requestJson(`/api/delegation/${encodeURIComponent(state.selectedAgentId)}`)
    state.selectedAgentDetails = details && typeof details === "object" ? details : null
  } catch (error) {
    if (error?.status === 404) {
      state.selectedAgentDetails = null
      return
    }
    pushLog("warn", "ui", t("log_api_response"), {
      route: `/api/delegation/${state.selectedAgentId}`,
      message: error?.message ?? "failed_to_refresh_selected_agent"
    })
    return
  }

  renderAgents(state.agents)
}

async function refreshProfiles() {
  return withPanel(ui.profilesPanelState, "system", async () => {
    const response = await requestJson("/api/auth-profiles/chatgpt")
    try {
      state.activeProfile = await requestJson("/api/auth-profiles/chatgpt/active")
    } catch (error) {
      if (error.status !== 404) throw error
      state.activeProfile = null
    }
    renderProfiles(response.items)
  })
}

async function refreshFleet() {
  return withPanel(ui.limitsPanelState, "system", async () => {
    let profiles = state.profiles
    if (!profiles.length) {
      profiles = (await requestJson("/api/auth-profiles/chatgpt")).items ?? []
      state.profiles = profiles
    }
    const fleet = await Promise.all(profiles.map(async (profile) => {
      try {
        const limits = await requestJson(`/api/auth-profiles/chatgpt/${profile.id}/limits`)
        return { ...profile, ...normalizeLimitsSnapshot(limits), limits_error: null }
      } catch (error) {
        return {
          ...profile,
          primary_remaining_percent: null,
          secondary_remaining_percent: null,
          primary_resets_at_utc: null,
          secondary_resets_at_utc: null,
          limits_source: null,
          limits_error: error.message
        }
      }
    }))
    renderFleet(fleet)
  })
}

async function refreshSwitchPolicy() {
  return withPanel(ui.switchPolicyState, "system", async () => {
    let profiles = state.profiles
    if (!profiles.length) {
      profiles = (await requestJson("/api/auth-profiles/chatgpt")).items ?? []
      state.profiles = profiles
    }

    const module = await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}`)
    const config = normalizeSwitchPolicyConfig(module?.config_json)
    state.switchPolicy.enabled = module?.is_enabled === true || module?.enabled === true
    state.switchPolicy.config = config
    state.switchPolicy.lastDecision = null

    try {
      const switchesResponse = await requestJson("/api/auth-profiles/chatgpt/switch-events?limit=30")
      const items = Array.isArray(switchesResponse?.items) ? switchesResponse.items : []
      const autoDecision = items.find((item) => {
        const reason = String(item?.reason ?? "")
        if (reason.startsWith("auto_switch")) return true
        const details = toObject(item?.details_json)
        return details?.source === "runner"
      }) ?? null

      if (autoDecision) {
        state.switchPolicy.lastDecision = {
          status: autoDecision.status ?? null,
          reason: autoDecision.reason ?? null,
          time: autoDecision.ended_at ?? autoDecision.started_at ?? null
        }
      }
    } catch {
      // optional call for last decision; keep form interactive even if history API fails
    }

    renderSwitchPolicy()
  })
}

function buildSwitchesRoute() {
  const params = new URLSearchParams()
  if (state.switchFilters.status !== "all") params.set("status", state.switchFilters.status)
  if (state.switchFilters.profile !== "all") params.set("profile_id", state.switchFilters.profile)
  params.set("limit", "200")
  return `/api/auth-profiles/chatgpt/switch-events?${params.toString()}`
}

async function refreshSwitches() {
  return withPanel(
    ui.eventsPanelState,
    "system",
    async () => renderSwitches((await requestJson(buildSwitchesRoute())).items)
  )
}

async function refreshMemoryEntries() {
  if (state.token) {
    try {
      await fetchProjectRegistry({ includeInactive: true })
    } catch {
      // best-effort sync for project selectors in memory form
    }
  }
  return withPanel(ui.memoryPanelState, "system", async () => {
    const params = new URLSearchParams()
    if (ui.memoryProject.value.trim()) params.set("project_id", ui.memoryProject.value.trim())
    if (ui.memoryRole.value.trim()) params.set("agent_role", ui.memoryRole.value.trim())
    const route = params.toString() ? `/api/memory/entries?${params.toString()}` : "/api/memory/entries"
    renderMemory((await requestJson(route)).items)
  })
}

async function refreshSecretsRoute() {
  if (state.token) {
    try {
      await fetchProjectRegistry({ includeInactive: true })
    } catch {
      // best-effort sync for project selector on secrets screen
    }
  }

  return withPanel(ui.secretsPanelState, "system", async () => {
    const projectKey = ui.secretProject?.value?.trim() ?? state.secretsFilters.project
    state.secretsFilters.project = projectKey
    saveJson(KEYS.secretsFilters, state.secretsFilters)

    if (!projectKey) {
      state.secrets = []
      renderSecrets([])
      return
    }

    const route = `/api/projects/${encodeURIComponent(projectKey)}/secrets?include_inactive=true&limit=200`
    const response = await requestJson(route)
    renderSecrets(response?.items ?? [])
  })
}

async function refreshModule() {
  return withPanel(ui.modulePanelState, "system", async () => {
    const module = await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}`)
    ui.moduleEnabled.checked = module.is_enabled === true || module.enabled === true
    ui.moduleConfig.value = JSON.stringify(module.config_json ?? {}, null, 2)
  })
}

async function refreshExecutions() {
  renderExecutions((await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}/executions`)).items)
}

async function runRefreshGroupWithRetry(reason, refreshers, attempts = 2) {
  let pending = Array.isArray(refreshers) ? [...refreshers] : []
  if (!pending.length) return

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const results = await Promise.allSettled(pending.map((item) => item.run()))
    const failed = []

    results.forEach((result, index) => {
      if (result.status === "rejected") failed.push(pending[index])
    })

    if (!failed.length) return

    const failedNames = failed.map((item) => item.name).join(",")

    if (attempt < attempts) {
      pushLog("warn", "ui", t("log_route_refresh_retry"), {
        reason: `${reason}:${failedNames}`,
        attempt,
        message: "partial_panels"
      })
      await sleep(350 * attempt)
      pending = failed
      continue
    }

    pushLog("error", "ui", t("log_partial_refresh_failed"), {
      reason,
      failed: failedNames,
      attempt
    })
  }
}

async function refreshDashboard() {
  await refreshHealth()
  if (!state.token) {
    requireTokenPanels()
    return
  }
  await runRefreshGroupWithRetry("dashboard", [
    { name: "tasks", run: () => refreshTasks() },
    { name: "held", run: () => refreshHeld() },
    { name: "profiles", run: () => refreshProfiles() },
    { name: "switches", run: () => refreshSwitches() }
  ])
}

async function refreshCurrentRoute() {
  if (state.route === "dashboard") return refreshDashboard()
  if (!state.token && state.route !== "logs") {
    requireTokenPanels()
    return
  }
  if (state.route === "projects") return refreshProjects()
  if (state.route === "tasks") {
    return runRefreshGroupWithRetry("tasks_route", [
      { name: "tasks", run: () => refreshTasks() },
      { name: "held", run: () => refreshHeld() }
    ])
  }
  if (state.route === "schedules") return refreshSchedulesRoute()
  if (state.route === "agents") return refreshAgents()
  if (state.route === "agent-profiles") return refreshAgentProfilesRoute()
  if (state.route === "accounts") {
    if (state.section === "profiles") return refreshProfiles()
    if (state.section === "limits") {
      return runRefreshGroupWithRetry("accounts_limits", [
        { name: "fleet", run: () => refreshFleet() },
        { name: "switch_policy", run: () => refreshSwitchPolicy() }
      ])
    }
    return refreshSwitches()
  }
  if (state.route === "secrets") return refreshSecretsRoute()
  if (state.route === "memory") return refreshMemoryEntries()
  if (state.route === "system") {
    return runRefreshGroupWithRetry("system_route", [
      { name: "module", run: () => refreshModule() },
      { name: "executions", run: () => refreshExecutions() }
    ])
  }
  renderLogs()
}

async function refreshAll() {
  await refreshHealth()
  if (!state.token) {
    requireTokenPanels()
    return
  }
  await runRefreshGroupWithRetry("full_refresh", [
    { name: "projects", run: () => refreshProjects() },
    { name: "tasks", run: () => refreshTasks() },
    { name: "held", run: () => refreshHeld() },
    { name: "schedules", run: () => refreshSchedulesRoute() },
    { name: "agents", run: () => refreshAgents() },
    { name: "agent_profiles", run: () => refreshAgentProfilesRoute() },
    { name: "profiles", run: () => refreshProfiles() },
    { name: "fleet", run: () => refreshFleet() },
    { name: "switch_policy", run: () => refreshSwitchPolicy() },
    { name: "switches", run: () => refreshSwitches() },
    { name: "secrets", run: () => refreshSecretsRoute() },
    { name: "memory", run: () => refreshMemoryEntries() },
    { name: "module", run: () => refreshModule() },
    { name: "executions", run: () => refreshExecutions() }
  ])
}

async function refreshCurrentRouteWithRetry(reason = "manual", attempts = 2) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await refreshCurrentRoute()
      return
    } catch (error) {
      if (attempt < attempts) {
        pushLog("warn", "ui", t("log_route_refresh_retry"), { reason, attempt, message: error?.message ?? t("error_generic") })
        await sleep(450 * attempt)
        continue
      }
      pushLog("error", "ui", error?.message ?? t("error_generic"), { reason, attempt, stage: "route_refresh_terminal" })
    }
  }
}

function syncAutoTimers() {
  for (const key of ["tasks", "agents", "history"]) {
    if (timers[key]) {
      clearInterval(timers[key])
      timers[key] = null
    }
  }

  if (state.auto.tasks) {
    timers.tasks = setInterval(
      () => runRefreshGroupWithRetry("tasks_autorefresh", [
        { name: "tasks", run: () => refreshTasks() },
        { name: "held", run: () => refreshHeld() }
      ]),
      AUTOREFRESH_INTERVAL_MS
    )
  }
  if (state.auto.agents) timers.agents = setInterval(() => refreshAgents().catch(() => {}), AUTOREFRESH_INTERVAL_MS)
  if (state.auto.history) timers.history = setInterval(() => refreshSwitches().catch(() => {}), AUTOREFRESH_INTERVAL_MS)
}

function setRoute(route, { persist = true, writeHash = true, log = true } = {}) {
  const next = normalizeRoute(route)
  const changed = state.route !== next
  state.route = next
  if (persist) setStorage(KEYS.route, state.route)
  if (writeHash) {
    const hash = `#/${state.route}`
    if (window.location.hash !== hash) window.location.hash = hash
  }
  renderRouteShell()
  if (log && changed) pushLog("info", "ui", t("log_route_changed"), { route: state.route })
}

function setSection(section, { persist = true, log = true } = {}) {
  const next = normalizeSection(section)
  const changed = state.section !== next
  state.section = next
  if (persist) setStorage(KEYS.section, state.section)
  renderAccountSection()
  if (log && changed) pushLog("info", "ui", t("log_account_section_changed"), { section: state.section })
}

function wireEntry() {
  ui = { langSelect: document.getElementById("lang-select"), themeSelect: document.getElementById("theme-select"), openConsole: document.getElementById("open-console") }
  applyTheme()
  applyI18n()
  ui.langSelect.value = state.lang
  ui.themeSelect.value = state.theme
  ui.langSelect.addEventListener("change", () => {
    state.lang = ui.langSelect.value === "en" ? "en" : "ru"
    setStorage(KEYS.lang, state.lang)
    applyI18n()
  })
  ui.themeSelect.addEventListener("change", () => {
    state.theme = ui.themeSelect.value === "light" ? "light" : "dark"
    setStorage(KEYS.theme, state.theme)
    applyTheme()
  })
}

function wireConsoleRefs() {
  ui = {
    routeLinks: Array.from(document.querySelectorAll("[data-route-link]")),
    screens: Array.from(document.querySelectorAll("[data-screen]")),
    quickbarRoute: document.getElementById("quickbar-route"),
    quickbarTitle: document.getElementById("quickbar-title"),
    quickbarSubtitle: document.getElementById("quickbar-subtitle"),
    kpiStrip: document.getElementById("kpi-strip"),
    tokenForm: document.getElementById("token-form"),
    adminToken: document.getElementById("admin-token"),
    tokenClear: document.getElementById("token-clear"),
    langSelect: document.getElementById("lang-select"),
    themeSelect: document.getElementById("theme-select"),
    quickRefreshRoute: document.getElementById("quick-refresh-route"),
    quickRefreshAll: document.getElementById("quick-refresh-all"),
    statTasks: document.getElementById("stat-tasks"), statHeld: document.getElementById("stat-held"), statProfiles: document.getElementById("stat-profiles"), statEvents: document.getElementById("stat-events"),
    refreshHealth: document.getElementById("refresh-health"), liveStatus: document.getElementById("live-status"), readyStatus: document.getElementById("ready-status"), dashboardSignals: document.getElementById("dashboard-signals"), dashboardSignalsState: document.getElementById("dashboard-signals-state"),
    projectsPanelState: document.getElementById("projects-panel-state"), refreshProjects: document.getElementById("refresh-projects"), projectCreateShell: document.getElementById("project-create-shell"), projectCreateForm: document.getElementById("project-create-form"), projectCreateKey: document.getElementById("project-create-key"), projectCreateName: document.getElementById("project-create-name"), projectCreateDescription: document.getElementById("project-create-description"), projectCreateGithubUrl: document.getElementById("project-create-github-url"), projectCreateWorkspacePath: document.getElementById("project-create-workspace-path"), projectFilterSearch: document.getElementById("project-filter-search"), projectFilterIncludeInactive: document.getElementById("project-filter-include-inactive"), projectsList: document.getElementById("projects-list"), projectDetailsEmpty: document.getElementById("project-details-empty"), projectDetailsContent: document.getElementById("project-details-content"), projectSummaryGrid: document.getElementById("project-summary-grid"), projectEditForm: document.getElementById("project-edit-form"), projectEditKey: document.getElementById("project-edit-key"), projectEditName: document.getElementById("project-edit-name"), projectEditDescription: document.getElementById("project-edit-description"), projectEditGithubUrl: document.getElementById("project-edit-github-url"), projectEditWorkspacePath: document.getElementById("project-edit-workspace-path"), projectEditActive: document.getElementById("project-edit-active"),
    toggleAutoRefreshTasks: document.getElementById("toggle-autorefresh-tasks"), tasksPanelState: document.getElementById("tasks-panel-state"), refreshTasks: document.getElementById("refresh-tasks"), taskCreateShell: document.getElementById("task-create-shell"), taskForm: document.getElementById("task-form"), taskTitle: document.getElementById("task-title"), taskDescription: document.getElementById("task-description"), taskProject: document.getElementById("task-project"), taskAgentProfile: document.getElementById("task-agent-profile"), taskAgentTemplate: document.getElementById("task-agent-template"), taskFilterSearch: document.getElementById("task-filter-search"), taskFilterProject: document.getElementById("task-filter-project"), taskFilterStatus: document.getElementById("task-filter-status"), taskFilterClear: document.getElementById("task-filter-clear"), tasksWaiting: document.getElementById("tasks-waiting"), tasksRunning: document.getElementById("tasks-running"), tasksCompleted: document.getElementById("tasks-completed"), tasksWaitingCount: document.getElementById("tasks-waiting-count"), tasksRunningCount: document.getElementById("tasks-running-count"), tasksCompletedCount: document.getElementById("tasks-completed-count"), heldPanelState: document.getElementById("held-panel-state"), refreshHeld: document.getElementById("refresh-held"), releaseHeld: document.getElementById("release-held"), heldSummary: document.getElementById("held-summary"), heldList: document.getElementById("held-list"), taskDetailsContent: document.getElementById("task-details-content"), cancelTask: document.getElementById("cancel-task"), schedulesPanelState: document.getElementById("schedules-panel-state"), refreshSchedules: document.getElementById("refresh-schedules"), refreshScheduleRuns: document.getElementById("refresh-schedule-runs"), scheduleCreateShell: document.getElementById("schedule-create-shell"), scheduleCreateForm: document.getElementById("schedule-create-form"), scheduleName: document.getElementById("schedule-name"), scheduleProject: document.getElementById("schedule-project"), scheduleCron: document.getElementById("schedule-cron"), scheduleTaskTitle: document.getElementById("schedule-task-title"), scheduleTaskDescription: document.getElementById("schedule-task-description"), scheduleTaskAgentProfile: document.getElementById("schedule-task-agent-profile"), scheduleTaskAgentTemplate: document.getElementById("schedule-task-agent-template"), scheduleTaskPriority: document.getElementById("schedule-task-priority"), schedulesList: document.getElementById("schedules-list"), scheduleRunsList: document.getElementById("schedule-runs-list"),
    toggleAutoRefreshAgents: document.getElementById("toggle-autorefresh-agents"), agentsPanelState: document.getElementById("agents-panel-state"), refreshAgentCards: document.getElementById("refresh-agent-cards"), agentsPreparing: document.getElementById("agents-preparing"), agentsRunning: document.getElementById("agents-running"), agentsRecent: document.getElementById("agents-recent"), agentsPreparingCount: document.getElementById("agents-preparing-count"), agentsRunningCount: document.getElementById("agents-running-count"), agentsRecentCount: document.getElementById("agents-recent-count"), agentInspectorEmpty: document.getElementById("agent-inspector-empty"), agentInspectorContent: document.getElementById("agent-inspector-content"), agentInspectorId: document.getElementById("agent-inspector-id"), agentInspectorStatus: document.getElementById("agent-inspector-status"), agentInspectorCapability: document.getElementById("agent-inspector-capability"), agentInspectorTemplate: document.getElementById("agent-inspector-template"), agentInspectorAccount: document.getElementById("agent-inspector-account"), agentInspectorTrace: document.getElementById("agent-inspector-trace"), agentInspectorExecMode: document.getElementById("agent-inspector-exec-mode"), agentInspectorCreated: document.getElementById("agent-inspector-created"), agentInspectorStarted: document.getElementById("agent-inspector-started"), agentInspectorEnded: document.getElementById("agent-inspector-ended"), agentInspectorCwd: document.getElementById("agent-inspector-cwd"), agentInspectorCwdSource: document.getElementById("agent-inspector-cwd-source"), agentInspectorMemory: document.getElementById("agent-inspector-memory"), agentInspectorResult: document.getElementById("agent-inspector-result"), agentInspectorPrompt: document.getElementById("agent-inspector-prompt"), agentInspectorLog: document.getElementById("agent-inspector-log"),
    agentProfilesPanelState: document.getElementById("agent-profiles-panel-state"), refreshAgentProfiles: document.getElementById("refresh-agent-profiles"), agentProfileCreateShell: document.getElementById("agent-profile-create-shell"), agentProfileCreateForm: document.getElementById("agent-profile-create-form"), agentProfileName: document.getElementById("agent-profile-name"), agentProfileRole: document.getElementById("agent-profile-role"), agentProfileSourcePolicy: document.getElementById("agent-profile-source-policy"), agentProfileDescription: document.getElementById("agent-profile-description"), agentProfileEnabled: document.getElementById("agent-profile-enabled"), agentProfileFilterSearch: document.getElementById("agent-profile-filter-search"), agentProfileFilterRole: document.getElementById("agent-profile-filter-role"), agentProfileFilterIncludeDisabled: document.getElementById("agent-profile-filter-include-disabled"), agentProfileFilterClear: document.getElementById("agent-profile-filter-clear"), agentProfilesList: document.getElementById("agent-profiles-list"), agentProfileDetailsEmpty: document.getElementById("agent-profile-details-empty"), agentProfileDetailsContent: document.getElementById("agent-profile-details-content"), agentProfileSummaryGrid: document.getElementById("agent-profile-summary-grid"), agentProfileEditForm: document.getElementById("agent-profile-edit-form"), agentProfileEditId: document.getElementById("agent-profile-edit-id"), agentProfileEditName: document.getElementById("agent-profile-edit-name"), agentProfileEditRole: document.getElementById("agent-profile-edit-role"), agentProfileEditSourcePolicy: document.getElementById("agent-profile-edit-source-policy"), agentProfileEditEnabled: document.getElementById("agent-profile-edit-enabled"), agentProfileEditDescription: document.getElementById("agent-profile-edit-description"), mcpServerCreateForm: document.getElementById("mcp-server-create-form"), mcpServerName: document.getElementById("mcp-server-name"), mcpServerTransport: document.getElementById("mcp-server-transport"), mcpServerOrigin: document.getElementById("mcp-server-origin"), mcpServerEndpoint: document.getElementById("mcp-server-endpoint"), mcpServerMeta: document.getElementById("mcp-server-meta"), mcpServerApproved: document.getElementById("mcp-server-approved"), agentProfileBindForm: document.getElementById("agent-profile-bind-form"), agentProfileBindServer: document.getElementById("agent-profile-bind-server"), agentProfileBindPriority: document.getElementById("agent-profile-bind-priority"), agentProfileBindRequired: document.getElementById("agent-profile-bind-required"), agentProfileBindConfig: document.getElementById("agent-profile-bind-config"), agentProfileBindingsList: document.getElementById("agent-profile-bindings-list"), agentProfileScriptWindowsType: document.getElementById("agent-profile-script-windows-type"), agentProfileScriptWindowsContent: document.getElementById("agent-profile-script-windows-content"), agentProfileScriptWindowsMeta: document.getElementById("agent-profile-script-windows-meta"), agentProfileScriptLinuxType: document.getElementById("agent-profile-script-linux-type"), agentProfileScriptLinuxContent: document.getElementById("agent-profile-script-linux-content"), agentProfileScriptLinuxMeta: document.getElementById("agent-profile-script-linux-meta"), agentProfileScriptMacosType: document.getElementById("agent-profile-script-macos-type"), agentProfileScriptMacosContent: document.getElementById("agent-profile-script-macos-content"), agentProfileScriptMacosMeta: document.getElementById("agent-profile-script-macos-meta"),
    accountSectionButtons: Array.from(document.querySelectorAll("[data-accounts-section]")), accountPanels: Array.from(document.querySelectorAll("[data-accounts-panel]")), profilesPanelState: document.getElementById("profiles-panel-state"), refreshProfiles: document.getElementById("refresh-profiles"), uploadForm: document.getElementById("upload-form"), profileLabel: document.getElementById("profile-label"), profileFile: document.getElementById("profile-file"), activeProfile: document.getElementById("active-profile"), profilesBody: document.getElementById("profiles-body"), limitsPanelState: document.getElementById("limits-panel-state"), refreshAccountFleet: document.getElementById("refresh-account-fleet"), accountFleet: document.getElementById("account-fleet"), switchPolicyState: document.getElementById("switch-policy-state"), switchPolicyForm: document.getElementById("switch-policy-form"), switchPolicyEnabled: document.getElementById("switch-policy-enabled"), switchPolicyEligible: document.getElementById("switch-policy-eligible"), switchPolicyFive: document.getElementById("switch-policy-five"), switchPolicyWeek: document.getElementById("switch-policy-week"), switchPolicyGuard: document.getElementById("switch-policy-guard"), switchPolicyProbe: document.getElementById("switch-policy-probe"), switchPolicyCooldown: document.getElementById("switch-policy-cooldown"), switchPolicyLast: document.getElementById("switch-policy-last"), toggleAutoRefreshEvents: document.getElementById("toggle-autorefresh-events"), eventsPanelState: document.getElementById("events-panel-state"), refreshSwitchEvents: document.getElementById("refresh-switch-events"), switchFilterSearch: document.getElementById("switch-filter-search"), switchFilterStatus: document.getElementById("switch-filter-status"), switchFilterProfile: document.getElementById("switch-filter-profile"), switchFilterClear: document.getElementById("switch-filter-clear"), switchEvents: document.getElementById("switch-events"),
    secretsPanelState: document.getElementById("secrets-panel-state"), refreshSecrets: document.getElementById("refresh-secrets"), secretCreateForm: document.getElementById("secret-create-form"), secretProject: document.getElementById("secret-project"), secretKey: document.getElementById("secret-key"), secretValue: document.getElementById("secret-value"), secretDescription: document.getElementById("secret-description"), secretBindRoles: document.getElementById("secret-bind-roles"), secretBindTemplates: document.getElementById("secret-bind-templates"), secretFilterSearch: document.getElementById("secret-filter-search"), secretsList: document.getElementById("secrets-list"),
    memoryPanelState: document.getElementById("memory-panel-state"), refreshMemory: document.getElementById("refresh-memory"), memoryForm: document.getElementById("memory-form"), memoryProject: document.getElementById("memory-project"), memoryRole: document.getElementById("memory-role"), memoryTitle: document.getElementById("memory-title"), memoryContent: document.getElementById("memory-content"), memoryList: document.getElementById("memory-list"),
    modulePanelState: document.getElementById("module-panel-state"), refreshModule: document.getElementById("refresh-module"), refreshExecutions: document.getElementById("refresh-executions"), moduleForm: document.getElementById("module-form"), moduleEnabled: document.getElementById("module-enabled"), moduleConfig: document.getElementById("module-config"), executionsList: document.getElementById("executions-list"),
    logsPanelState: document.getElementById("logs-panel-state"), logsClear: document.getElementById("logs-clear"), logFilterLevel: document.getElementById("log-filter-level"), logFilterScope: document.getElementById("log-filter-scope"), logFilterSearch: document.getElementById("log-filter-search"), logFilterClear: document.getElementById("log-filter-clear"), logsList: document.getElementById("logs-list"),
    confirmModal: document.getElementById("confirm-modal"), confirmModalTitle: document.getElementById("confirm-modal-title"), confirmModalMessage: document.getElementById("confirm-modal-message"), confirmModalConfirm: document.getElementById("confirm-modal-confirm"), confirmModalCancel: document.getElementById("confirm-modal-cancel")
  }
}

function wireConsoleHandlers() {
  ui.adminToken.value = state.token
  ui.langSelect.value = state.lang
  ui.themeSelect.value = state.theme
  ui.projectFilterSearch.value = state.projectFilters.search
  ui.projectFilterIncludeInactive.checked = state.projectFilters.includeInactive
  ui.toggleAutoRefreshTasks.checked = state.auto.tasks
  ui.toggleAutoRefreshAgents.checked = state.auto.agents
  ui.toggleAutoRefreshEvents.checked = state.auto.history
  ui.agentProfileFilterSearch.value = state.agentProfileFilters.search
  ui.agentProfileFilterIncludeDisabled.checked = state.agentProfileFilters.includeDisabled
  ui.secretFilterSearch.value = state.secretsFilters.search
  if (readStorage(KEYS.taskCollapsed) === "1") ui.taskCreateShell.open = false
  syncProjectBindings()

  ui.routeLinks.forEach((link) => link.addEventListener("click", async (event) => {
    event.preventDefault()
    const route = link.dataset.routeLink ?? "dashboard"
    setRoute(route, { persist: true, writeHash: true, log: true })
    await refreshCurrentRouteWithRetry("sidebar_navigation")
  }))

  window.addEventListener("hashchange", async () => {
    const route = routeFromHash(window.location.hash)
    if (route === state.route) return
    setRoute(route, { persist: true, writeHash: false, log: true })
    await refreshCurrentRouteWithRetry("hash_navigation")
  })

  ui.tokenForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    state.token = ui.adminToken.value.trim()
    if (state.token) {
      setStorage(KEYS.token, state.token)
      pushLog("success", "ui", t("log_token_saved"))
    } else {
      removeStorage(KEYS.token)
      pushLog("warn", "ui", t("log_token_cleared"))
    }
    await refreshCurrentRouteWithRetry("token_update")
  })

  ui.tokenClear.addEventListener("click", async () => {
    state.token = ""
    ui.adminToken.value = ""
    removeStorage(KEYS.token)
    pushLog("info", "ui", t("log_token_cleared"))
    requireTokenPanels()
    await refreshHealth()
  })

  ui.langSelect.addEventListener("change", () => {
    state.lang = ui.langSelect.value === "en" ? "en" : "ru"
    setStorage(KEYS.lang, state.lang)
    pushLog("info", "ui", t("log_language_changed"), { lang: state.lang })
    applyI18n()
  })

  ui.themeSelect.addEventListener("change", () => {
    state.theme = ui.themeSelect.value === "light" ? "light" : "dark"
    setStorage(KEYS.theme, state.theme)
    applyTheme()
    pushLog("info", "ui", t("log_theme_changed"), { theme: state.theme })
  })

  ui.quickRefreshRoute.addEventListener("click", async () => refreshCurrentRouteWithRetry("quick_refresh"))
  ui.quickRefreshAll.addEventListener("click", async () => refreshAll())
  ui.refreshHealth.addEventListener("click", async () => refreshHealth())

  ui.refreshProjects.addEventListener("click", async () => state.token ? refreshProjects() : requireTokenPanels())
  ui.projectFilterSearch.addEventListener("input", () => {
    state.projectFilters.search = ui.projectFilterSearch.value
    saveJson(KEYS.projectFilters, state.projectFilters)
    renderProjects(state.projects)
  })
  ui.projectFilterIncludeInactive.addEventListener("change", async () => {
    state.projectFilters.includeInactive = ui.projectFilterIncludeInactive.checked
    saveJson(KEYS.projectFilters, state.projectFilters)
    if (!state.token) return requireTokenPanels()
    await refreshProjects()
  })

  ui.projectsList.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-project-key]")
    if (!card) return
    const key = card.dataset.projectKey
    if (!key || key === state.selectedProjectKey) return
    state.selectedProjectKey = key
    state.projectSummary = null
    renderProjects(state.projects)
    pushLog("info", "ui", t("log_project_selected"), { key })
    if (!state.token) return requireTokenPanels()
    await withPanel(ui.projectsPanelState, "system", async () => {
      await refreshProjectSummary()
    })
  })

  ui.projectCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()

    const payload = {
      key: ui.projectCreateKey.value.trim(),
      name: ui.projectCreateName.value.trim(),
      description: toNullableString(ui.projectCreateDescription.value),
      github_url: toNullableString(ui.projectCreateGithubUrl.value),
      workspace_path: toNullableString(ui.projectCreateWorkspacePath.value)
    }

    const created = await requestJson("/api/projects", { method: "POST", json: payload })
    state.selectedProjectKey = created?.key ?? payload.key
    state.projectSummary = null
    pushLog("success", "ui", t("log_project_created"), { key: state.selectedProjectKey })
    ui.projectCreateForm.reset()
    await refreshProjects()
  })

  ui.projectEditForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()
    if (!state.selectedProjectKey) return

    const payload = {
      name: ui.projectEditName.value.trim(),
      description: toNullableString(ui.projectEditDescription.value),
      github_url: toNullableString(ui.projectEditGithubUrl.value),
      workspace_path: toNullableString(ui.projectEditWorkspacePath.value),
      is_active: ui.projectEditActive.checked
    }

    await requestJson(`/api/projects/${encodeURIComponent(state.selectedProjectKey)}`, { method: "PATCH", json: payload })
    pushLog("success", "ui", t("log_project_updated"), { key: state.selectedProjectKey })
    await refreshProjects()
  })

  ui.toggleAutoRefreshTasks.addEventListener("change", () => {
    state.auto.tasks = ui.toggleAutoRefreshTasks.checked
    saveJson(KEYS.auto, state.auto)
    syncAutoTimers()
  })

  ui.toggleAutoRefreshAgents.addEventListener("change", () => {
    state.auto.agents = ui.toggleAutoRefreshAgents.checked
    saveJson(KEYS.auto, state.auto)
    syncAutoTimers()
  })

  ui.toggleAutoRefreshEvents.addEventListener("change", () => {
    state.auto.history = ui.toggleAutoRefreshEvents.checked
    saveJson(KEYS.auto, state.auto)
    syncAutoTimers()
  })

  ui.taskFilterSearch.addEventListener("input", () => {
    state.taskFilters.search = ui.taskFilterSearch.value
    saveJson(KEYS.taskFilters, state.taskFilters)
    renderTasks(state.tasks)
  })
  ui.taskFilterProject.addEventListener("change", () => {
    state.taskFilters.project = ui.taskFilterProject.value
    saveJson(KEYS.taskFilters, state.taskFilters)
    renderTasks(state.tasks)
  })
  ui.taskFilterStatus.addEventListener("change", () => {
    state.taskFilters.status = ui.taskFilterStatus.value
    saveJson(KEYS.taskFilters, state.taskFilters)
    renderTasks(state.tasks)
  })
  ui.taskFilterClear.addEventListener("click", () => {
    state.taskFilters = { search: "", project: "all", status: "all" }
    saveJson(KEYS.taskFilters, state.taskFilters)
    renderTasks(state.tasks)
  })

  const onTaskClick = (event) => {
    const card = event.target.closest("[data-task-id]")
    if (!card) return
    state.selectedTaskId = card.dataset.taskId
    renderTasks(state.tasks)
  }
  ui.tasksWaiting.addEventListener("click", onTaskClick)
  ui.tasksRunning.addEventListener("click", onTaskClick)
  ui.tasksCompleted.addEventListener("click", onTaskClick)

  ui.refreshTasks.addEventListener("click", async () => state.token ? refreshTasks() : requireTokenPanels())

  ui.cancelTask?.addEventListener("click", async () => {
    if (!state.token) return requireTokenPanels()
    if (!state.selectedTaskId) return
    const reasonInput = window.prompt(t("task_cancel_prompt"))
    if (reasonInput === null) return
    const reason = reasonInput.trim()
    await requestJson(`/api/tasks/${encodeURIComponent(state.selectedTaskId)}/cancel`, {
      method: "POST",
      json: {
        reason: reason || null
      }
    })
    pushLog("success", "ui", t("log_task_cancelled"), { task_id: state.selectedTaskId })
    await refreshTasks()
  })

  ui.taskForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()

    const payload = {
      title: ui.taskTitle.value.trim(),
      description: ui.taskDescription.value.trim(),
      project_id: ui.taskProject.value.trim(),
      agent_profile_id: ui.taskAgentProfile.value.trim(),
      agent_template_id: ui.taskAgentTemplate.value.trim()
    }
    await requestJson("/api/tasks", { method: "POST", json: payload })
    pushLog("success", "ui", t("log_task_created"), { title: payload.title, project_id: payload.project_id })
    ui.taskTitle.value = ""
    ui.taskDescription.value = ""
    if (readStorage(KEYS.taskCollapsed) !== "1") {
      setStorage(KEYS.taskCollapsed, "1")
      ui.taskCreateShell.open = false
    }
    await refreshTasks()
  })

  ui.refreshHeld.addEventListener("click", async () => state.token ? refreshHeld() : requireTokenPanels())
  ui.releaseHeld.addEventListener("click", async () => {
    if (!state.token) return requireTokenPanels()
    await requestJson("/api/queue/held/release", { method: "POST" })
    pushLog("success", "ui", t("log_held_released"))
    await Promise.allSettled([refreshHeld(), refreshTasks()])
  })

  ui.refreshSchedules.addEventListener("click", async () => state.token ? refreshSchedulesRoute() : requireTokenPanels())
  ui.refreshScheduleRuns.addEventListener("click", async () => {
    if (!state.token) return requireTokenPanels()
    await withPanel(ui.schedulesPanelState, "system", async () => {
      await refreshScheduleRuns()
    })
  })

  ui.scheduleCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()

    const payload = {
      name: ui.scheduleName.value.trim(),
      scope: "project",
      project_id: ui.scheduleProject.value.trim(),
      rule_ast: {
        predicate: "time.cron",
        value: ui.scheduleCron.value.trim()
      },
      overlap_policy: "one_active_skip",
      misfire_policy: "recompute_due_on_restart",
      task_title: ui.scheduleTaskTitle.value.trim(),
      task_description: ui.scheduleTaskDescription.value.trim(),
      task_agent_profile_id: ui.scheduleTaskAgentProfile.value.trim(),
      task_agent_template_id: ui.scheduleTaskAgentTemplate.value.trim(),
      task_priority: toIntegerInRange(ui.scheduleTaskPriority.value, 100, 1, 100000)
    }

    const created = await requestJson("/api/schedules", { method: "POST", json: payload })
    state.selectedScheduleId = created?.id ?? state.selectedScheduleId
    pushLog("success", "ui", t("log_schedule_created"), { id: created?.id ?? "n/a", name: payload.name })
    if (ui.scheduleCreateShell.open) ui.scheduleCreateShell.open = false
    await refreshSchedulesRoute()
  })

  ui.schedulesList.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-schedule-id]")
    if (!card) return

    const scheduleId = card.dataset.scheduleId
    if (!scheduleId) return

    const actionButton = event.target.closest("button[data-schedule-action]")
    state.selectedScheduleId = scheduleId

    if (!actionButton) {
      renderSchedules(state.schedules)
      if (state.token) {
        await withPanel(ui.schedulesPanelState, "system", async () => {
          await refreshScheduleRuns()
        })
      }
      return
    }

    if (!state.token) return requireTokenPanels()
    const action = actionButton.dataset.scheduleAction

    if (action === "trigger") {
      const run = await requestJson(`/api/schedules/${encodeURIComponent(scheduleId)}/trigger`, {
        method: "POST",
        json: { dry_run_context: {} }
      })
      pushLog("success", "ui", t("log_schedule_action"), {
        action,
        schedule_id: scheduleId,
        run_id: run?.id ?? "n/a",
        created_task_id: run?.created_task_id ?? null
      })
      await Promise.allSettled([refreshSchedulesRoute(), refreshTasks()])
      return
    }

    if (action === "evaluate") {
      const result = await requestJson(`/api/schedules/${encodeURIComponent(scheduleId)}/evaluate`, {
        method: "POST",
        json: { dry_run_context: {} }
      })
      pushLog("info", "ui", t("log_schedule_action"), {
        action,
        schedule_id: scheduleId,
        matched: result?.matched === true
      })
      await refreshScheduleRuns()
      return
    }

    if (action === "enable" || action === "disable") {
      await requestJson(`/api/schedules/${encodeURIComponent(scheduleId)}/${action}`, { method: "POST" })
      pushLog("success", "ui", t("log_schedule_action"), { action, schedule_id: scheduleId })
      await refreshSchedulesRoute()
      return
    }

    if (action === "delete") {
      await requestRaw(`/api/schedules/${encodeURIComponent(scheduleId)}`, { method: "DELETE" })
      pushLog("success", "ui", t("log_schedule_action"), { action, schedule_id: scheduleId })
      if (state.selectedScheduleId === scheduleId) state.selectedScheduleId = null
      await refreshSchedulesRoute()
    }
  })

  ui.refreshAgentCards.addEventListener("click", async () => state.token ? refreshAgents() : requireTokenPanels())
  const onAgentClick = (event) => {
    const card = event.target.closest("[data-agent-id]")
    if (!card) return
    state.selectedAgentId = card.dataset.agentId
    state.selectedAgentDetails = null
    renderAgents(state.agents)
    void refreshSelectedAgentDetails()
  }
  ui.agentsPreparing.addEventListener("click", onAgentClick)
  ui.agentsRunning.addEventListener("click", onAgentClick)
  ui.agentsRecent.addEventListener("click", onAgentClick)

  ui.refreshAgentProfiles.addEventListener("click", async () => state.token ? refreshAgentProfilesRoute() : requireTokenPanels())
  ui.agentProfileFilterSearch.addEventListener("input", () => {
    state.agentProfileFilters.search = ui.agentProfileFilterSearch.value
    saveJson(KEYS.agentProfileFilters, state.agentProfileFilters)
    renderAgentProfiles(state.agentProfiles)
  })
  ui.agentProfileFilterRole.addEventListener("change", () => {
    state.agentProfileFilters.role = ui.agentProfileFilterRole.value
    saveJson(KEYS.agentProfileFilters, state.agentProfileFilters)
    renderAgentProfiles(state.agentProfiles)
  })
  ui.agentProfileFilterIncludeDisabled.addEventListener("change", () => {
    state.agentProfileFilters.includeDisabled = ui.agentProfileFilterIncludeDisabled.checked
    saveJson(KEYS.agentProfileFilters, state.agentProfileFilters)
    renderAgentProfiles(state.agentProfiles)
  })
  ui.agentProfileFilterClear.addEventListener("click", () => {
    state.agentProfileFilters = { search: "", role: "all", includeDisabled: true }
    saveJson(KEYS.agentProfileFilters, state.agentProfileFilters)
    renderAgentProfiles(state.agentProfiles)
  })

  ui.agentProfilesList.addEventListener("click", async (event) => {
    const card = event.target.closest("[data-agent-profile-id]")
    if (!card) return
    const profileId = card.dataset.agentProfileId
    if (!profileId || profileId === state.selectedAgentProfileId) return
    state.selectedAgentProfileId = profileId
    state.agentProfileBindings = []
    state.agentProfileScripts = []
    renderAgentProfiles(state.agentProfiles)
    pushLog("info", "ui", t("log_agent_profile_selected"), { id: profileId })
    if (!state.token) return requireTokenPanels()
    await withPanel(ui.agentProfilesPanelState, "system", async () => refreshSelectedAgentProfileContext())
  })

  ui.agentProfileCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()

    const payload = {
      name: ui.agentProfileName.value.trim(),
      role: ui.agentProfileRole.value.trim(),
      source_policy: ui.agentProfileSourcePolicy.value,
      description: toNullableString(ui.agentProfileDescription.value),
      is_enabled: ui.agentProfileEnabled.checked
    }
    const created = await requestJson("/api/agent-profiles", { method: "POST", json: payload })
    state.selectedAgentProfileId = created?.id ?? null
    pushLog("success", "ui", t("log_agent_profile_created"), {
      id: created?.id ?? "n/a"
    })
    ui.agentProfileName.value = ""
    ui.agentProfileRole.value = "reviewer"
    ui.agentProfileDescription.value = ""
    ui.agentProfileEnabled.checked = true
    await refreshAgentProfilesRoute()
  })

  ui.agentProfileEditForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()
    if (!state.selectedAgentProfileId) return

    const payload = {
      name: ui.agentProfileEditName.value.trim(),
      role: ui.agentProfileEditRole.value.trim(),
      source_policy: ui.agentProfileEditSourcePolicy.value,
      description: toNullableString(ui.agentProfileEditDescription.value),
      is_enabled: ui.agentProfileEditEnabled.checked
    }
    await requestJson(`/api/agent-profiles/${encodeURIComponent(state.selectedAgentProfileId)}`, { method: "PATCH", json: payload })
    pushLog("success", "ui", t("log_agent_profile_updated"), { id: state.selectedAgentProfileId })
    await refreshAgentProfilesRoute()
  })

  ui.mcpServerCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()

    let metaJson = null
    try {
      metaJson = parseJsonObjectInput(ui.mcpServerMeta.value, { allowNull: true })
    } catch {
      pushLog("error", "ui", t("agent_profile_error_meta_json"))
      return
    }

    const payload = {
      name: ui.mcpServerName.value.trim(),
      transport: ui.mcpServerTransport.value,
      endpoint_or_command: ui.mcpServerEndpoint.value.trim(),
      origin_type: ui.mcpServerOrigin.value,
      is_approved: ui.mcpServerApproved.checked,
      meta_json: metaJson
    }
    const created = await requestJson("/api/mcp/servers", { method: "POST", json: payload })
    pushLog("success", "ui", t("log_agent_profile_server_created"), { id: created?.id ?? "n/a", name: payload.name })
    ui.mcpServerName.value = ""
    ui.mcpServerEndpoint.value = ""
    ui.mcpServerMeta.value = ""
    ui.mcpServerApproved.checked = true
    await refreshAgentProfilesRoute()
    if (created?.id && ui.agentProfileBindServer) ui.agentProfileBindServer.value = created.id
  })

  ui.agentProfileBindForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()
    if (!state.selectedAgentProfileId) return

    const serverId = ui.agentProfileBindServer.value
    if (!serverId) return

    let configJson = null
    try {
      configJson = parseJsonObjectInput(ui.agentProfileBindConfig.value, { allowNull: true })
    } catch {
      pushLog("error", "ui", t("agent_profile_error_config_json"))
      return
    }

    const rawPriority = Number(ui.agentProfileBindPriority.value)
    const payload = {
      is_required: ui.agentProfileBindRequired.checked,
      priority: Number.isFinite(rawPriority) ? Math.max(0, Math.min(1000, Math.round(rawPriority))) : 100,
      config_json: configJson
    }

    await requestJson(`/api/agent-profiles/${encodeURIComponent(state.selectedAgentProfileId)}/mcp-servers/${encodeURIComponent(serverId)}`, {
      method: "POST",
      json: payload
    })
    pushLog("success", "ui", t("log_agent_profile_server_bound"), {
      profile_id: state.selectedAgentProfileId,
      server_id: serverId
    })
    ui.agentProfileBindConfig.value = ""
    await refreshSelectedAgentProfileContext()
    renderAgentProfiles(state.agentProfiles)
  })

  ui.agentProfileBindingsList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-agent-profile-unbind]")
    if (!button) return
    if (!state.token) return requireTokenPanels()
    if (!state.selectedAgentProfileId) return

    const serverId = button.dataset.agentProfileUnbind
    if (!serverId) return

    await requestJson(`/api/agent-profiles/${encodeURIComponent(state.selectedAgentProfileId)}/mcp-servers/${encodeURIComponent(serverId)}`, {
      method: "DELETE"
    })
    pushLog("success", "ui", t("log_agent_profile_server_unbound"), {
      profile_id: state.selectedAgentProfileId,
      server_id: serverId
    })
    await refreshSelectedAgentProfileContext()
    renderAgentProfiles(state.agentProfiles)
  })

  document.querySelectorAll("[data-agent-profile-script-save]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!state.token) return requireTokenPanels()
      if (!state.selectedAgentProfileId) return
      const os = button.getAttribute("data-agent-profile-script-save")
      if (!os) return

      let typeNode
      let contentNode
      if (os === "windows") {
        typeNode = ui.agentProfileScriptWindowsType
        contentNode = ui.agentProfileScriptWindowsContent
      } else if (os === "linux") {
        typeNode = ui.agentProfileScriptLinuxType
        contentNode = ui.agentProfileScriptLinuxContent
      } else {
        typeNode = ui.agentProfileScriptMacosType
        contentNode = ui.agentProfileScriptMacosContent
      }

      const content = contentNode.value.trim()
      if (!content) {
        pushLog("warn", "ui", t("agent_profile_error_script_empty"), { os })
        return
      }

      await requestJson(`/api/agent-profiles/${encodeURIComponent(state.selectedAgentProfileId)}/scripts/${encodeURIComponent(os)}`, {
        method: "PUT",
        json: {
          script_type: typeNode.value,
          content
        }
      })
      pushLog("success", "ui", t("log_agent_profile_script_saved"), {
        profile_id: state.selectedAgentProfileId,
        os
      })
      await refreshSelectedAgentProfileContext()
      renderAgentProfiles(state.agentProfiles)
    })
  })

  ui.accountSectionButtons.forEach((btn) => btn.addEventListener("click", async () => {
    setSection(btn.dataset.accountsSection ?? "profiles", { persist: true, log: true })
    if (state.route === "accounts") await refreshCurrentRouteWithRetry("accounts_section_change")
  }))

  ui.refreshProfiles.addEventListener("click", async () => state.token ? refreshProfiles() : requireTokenPanels())
  ui.uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()
    const file = ui.profileFile.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("label", ui.profileLabel.value.trim())
    formData.append("file", file)
    await requestJson("/api/auth-profiles/chatgpt/upload", { method: "POST", body: formData })
    pushLog("success", "ui", t("log_profile_uploaded"), { label: ui.profileLabel.value.trim() })
    ui.profileLabel.value = ""
    ui.profileFile.value = ""
    await Promise.allSettled([refreshProfiles(), refreshFleet(), refreshSwitches()])
  })

  ui.profilesBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-profile-action]")
    if (!button) return
    if (!state.token) return requireTokenPanels()
    const action = button.dataset.profileAction
    const id = button.dataset.profileId
    if (!id) return

    if (action === "delete") {
      const profile = findAuthProfileById(id) ?? { id, label: id }
      const confirmed = await confirmProfileDelete(profile)
      if (!confirmed) return
      await requestRaw(`/api/auth-profiles/chatgpt/${id}`, { method: "DELETE" })
      pushLog("success", "ui", t("log_profile_deleted"), { profile_id: id, source: "profiles" })
      await Promise.allSettled([refreshProfiles(), refreshFleet(), refreshSwitches()])
      return
    }

    const route = action === "activate" ? `/api/auth-profiles/chatgpt/${id}/activate` : `/api/auth-profiles/chatgpt/${id}/deactivate`
    await requestJson(route, { method: "POST" })
    pushLog("success", "ui", t("log_profile_action"), { action, profile_id: id })
    await Promise.allSettled([refreshProfiles(), refreshFleet(), refreshSwitches()])
  })

  ui.refreshAccountFleet.addEventListener("click", async () => {
    if (!state.token) return requireTokenPanels()
    await runRefreshGroupWithRetry("accounts_limits_manual", [
      { name: "fleet", run: () => refreshFleet() },
      { name: "switch_policy", run: () => refreshSwitchPolicy() }
    ])
  })

  ui.switchPolicyEligible.addEventListener("change", () => {
    const selectedIds = Array.from(ui.switchPolicyEligible.querySelectorAll("input[data-switch-policy-profile]:checked"))
      .map((node) => node.getAttribute("data-switch-policy-profile") || "")
      .filter(Boolean)
    state.switchPolicy.config.eligible_profile_ids = selectedIds
  })

  ui.switchPolicyForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()

    const eligibleIds = Array.from(ui.switchPolicyEligible.querySelectorAll("input[data-switch-policy-profile]:checked"))
      .map((node) => node.getAttribute("data-switch-policy-profile") || "")
      .filter(Boolean)
    const enabled = ui.switchPolicyEnabled.checked
    if (enabled && eligibleIds.length === 0) {
      pushLog("warn", "ui", t("switch_policy_error_eligible_required"))
      return
    }

    const configJson = {
      eligible_profile_ids: eligibleIds,
      five_hour_remaining_percent_lt: toIntegerInRange(ui.switchPolicyFive.value, 10, 0, 100),
      weekly_remaining_percent_lt: toIntegerInRange(ui.switchPolicyWeek.value, 5, 0, 100),
      reset_guard_hours: toIntegerInRange(ui.switchPolicyGuard.value, 3, 0, 720),
      probe_interval_sec: toIntegerInRange(ui.switchPolicyProbe.value, 60, 5, 3600),
      switch_cooldown_sec: toIntegerInRange(ui.switchPolicyCooldown.value, 120, 0, 3600)
    }

    await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}`, {
      method: "PATCH",
      json: {
        is_enabled: enabled,
        config_json: configJson
      }
    })
    pushLog("success", "ui", t("log_switch_policy_saved"), {
      enabled,
      eligible_count: eligibleIds.length
    })

    await runRefreshGroupWithRetry("accounts_limits_policy_save", [
      { name: "switch_policy", run: () => refreshSwitchPolicy() },
      { name: "fleet", run: () => refreshFleet() }
    ])
  })

  ui.accountFleet.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-fleet-action]")
    if (!button) return
    if (!state.token) return requireTokenPanels()

    const action = button.dataset.fleetAction
    const id = button.dataset.profileId
    if (!id) return

    if (action === "history") {
      setSection("history", { persist: true, log: true })
      state.switchFilters.profile = id
      state.switchFilters.status = "all"
      state.switchFilters.search = ""
      saveJson(KEYS.switchFilters, state.switchFilters)
      await refreshSwitches()
      return
    }

    if (action === "delete") {
      const profile = findAuthProfileById(id) ?? { id, label: id }
      const confirmed = await confirmProfileDelete(profile)
      if (!confirmed) return
      await requestRaw(`/api/auth-profiles/chatgpt/${id}`, { method: "DELETE" })
      pushLog("success", "ui", t("log_profile_deleted"), { profile_id: id, source: "limits" })
      await Promise.allSettled([refreshProfiles(), refreshFleet(), refreshSwitches()])
      return
    }

    const route = action === "activate"
      ? `/api/auth-profiles/chatgpt/${id}/activate`
      : `/api/auth-profiles/chatgpt/${id}/deactivate`
    await requestJson(route, { method: "POST" })
    pushLog("success", "ui", t("log_profile_action"), { action, profile_id: id, source: "limits" })
    await Promise.allSettled([refreshProfiles(), refreshFleet(), refreshSwitches()])
  })
  ui.refreshSwitchEvents.addEventListener("click", async () => state.token ? refreshSwitches() : requireTokenPanels())

  ui.switchFilterSearch.addEventListener("input", () => {
    state.switchFilters.search = ui.switchFilterSearch.value
    saveJson(KEYS.switchFilters, state.switchFilters)
    renderSwitches(state.switches)
  })
  ui.switchFilterStatus.addEventListener("change", async () => {
    state.switchFilters.status = ui.switchFilterStatus.value
    saveJson(KEYS.switchFilters, state.switchFilters)
    await refreshSwitches()
  })
  ui.switchFilterProfile.addEventListener("change", async () => {
    state.switchFilters.profile = ui.switchFilterProfile.value
    saveJson(KEYS.switchFilters, state.switchFilters)
    await refreshSwitches()
  })
  ui.switchFilterClear.addEventListener("click", async () => {
    state.switchFilters = { search: "", status: "all", profile: "all" }
    saveJson(KEYS.switchFilters, state.switchFilters)
    await refreshSwitches()
  })
  ui.switchEvents.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-switch-profile]")
    if (!button) return
    const profileId = button.dataset.switchProfile
    if (!profileId) return
    state.switchFilters.profile = profileId
    saveJson(KEYS.switchFilters, state.switchFilters)
    await refreshSwitches()
  })

  ui.refreshSecrets.addEventListener("click", async () => state.token ? refreshSecretsRoute() : requireTokenPanels())
  ui.secretProject.addEventListener("change", async () => {
    state.secretsFilters.project = ui.secretProject.value
    saveJson(KEYS.secretsFilters, state.secretsFilters)
    if (!state.token) {
      renderSecrets(state.secrets)
      return
    }
    await refreshSecretsRoute()
  })
  ui.secretFilterSearch.addEventListener("input", () => {
    state.secretsFilters.search = ui.secretFilterSearch.value
    saveJson(KEYS.secretsFilters, state.secretsFilters)
    renderSecrets(state.secrets)
  })
  ui.secretCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()

    const projectKey = ui.secretProject.value.trim()
    if (!projectKey) {
      pushLog("error", "ui", t("error_secret_project_required"))
      return
    }

    const bindRoles = parseCsvList(ui.secretBindRoles.value)
    const bindTemplates = parseCsvList(ui.secretBindTemplates.value)
    const payload = {
      key: ui.secretKey.value.trim(),
      value: ui.secretValue.value,
      description: toNullableString(ui.secretDescription.value),
      bind_roles: bindRoles,
      bind_template_ids: bindTemplates
    }

    await requestJson(`/api/projects/${encodeURIComponent(projectKey)}/secrets`, { method: "POST", json: payload })
    pushLog("success", "ui", t("log_secret_created"), { project_id: projectKey, key: payload.key })
    ui.secretKey.value = ""
    ui.secretValue.value = ""
    ui.secretDescription.value = ""
    ui.secretBindRoles.value = ""
    ui.secretBindTemplates.value = ""
    await refreshSecretsRoute()
  })
  ui.secretsList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-secret-action]")
    const card = event.target.closest("[data-secret-id]")
    if (!button || !card) return
    if (!state.token) return requireTokenPanels()

    const action = button.dataset.secretAction
    const secretId = card.dataset.secretId
    const projectKey = card.dataset.secretProject ?? state.secretsFilters.project
    const isActive = card.dataset.secretActive === "true"
    if (!action || !secretId || !projectKey) return

    if (action === "rotate") {
      const value = prompt(t("secrets_prompt_rotate"))?.trim()
      if (!value) return
      await requestJson(
        `/api/projects/${encodeURIComponent(projectKey)}/secrets/${encodeURIComponent(secretId)}/rotate`,
        { method: "POST", json: { value } }
      )
      pushLog("success", "ui", t("log_secret_rotated"), { project_id: projectKey, secret_id: secretId })
      await refreshSecretsRoute()
      return
    }

    if (action === "revoke") {
      await requestJson(
        `/api/projects/${encodeURIComponent(projectKey)}/secrets/${encodeURIComponent(secretId)}/revoke`,
        { method: "POST" }
      )
      pushLog("success", "ui", t("log_secret_revoked"), { project_id: projectKey, secret_id: secretId })
      await refreshSecretsRoute()
      return
    }

    if (action === "activate" || action === "deactivate") {
      await requestJson(
        `/api/projects/${encodeURIComponent(projectKey)}/secrets/${encodeURIComponent(secretId)}`,
        { method: "PATCH", json: { is_active: action === "activate" ? true : false } }
      )
      pushLog("success", "ui", t("log_secret_updated"), {
        project_id: projectKey,
        secret_id: secretId,
        is_active: action === "activate"
      })
      await refreshSecretsRoute()
      return
    }

    if (action === "bind-role" || action === "unbind-role") {
      const role = prompt(t("secrets_prompt_role"), isActive ? "reviewer" : "")?.trim()
      if (!role) return
      const method = action === "bind-role" ? "POST" : "DELETE"
      await requestJson(
        `/api/projects/${encodeURIComponent(projectKey)}/secrets/${encodeURIComponent(secretId)}/bindings/roles/${encodeURIComponent(role)}`,
        { method }
      )
      pushLog("success", "ui", t("log_secret_binding_updated"), {
        project_id: projectKey,
        secret_id: secretId,
        role,
        action
      })
      await refreshSecretsRoute()
      return
    }

    if (action === "bind-template" || action === "unbind-template") {
      const templateId = prompt(t("secrets_prompt_template"))?.trim()
      if (!templateId) return
      const method = action === "bind-template" ? "POST" : "DELETE"
      await requestJson(
        `/api/projects/${encodeURIComponent(projectKey)}/secrets/${encodeURIComponent(secretId)}/bindings/templates/${encodeURIComponent(templateId)}`,
        { method }
      )
      pushLog("success", "ui", t("log_secret_binding_updated"), {
        project_id: projectKey,
        secret_id: secretId,
        template_id: templateId,
        action
      })
      await refreshSecretsRoute()
    }
  })

  ui.refreshMemory.addEventListener("click", async () => state.token ? refreshMemoryEntries() : requireTokenPanels())
  ui.memoryForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()
    const payload = { project_id: ui.memoryProject.value.trim(), agent_role: ui.memoryRole.value.trim(), title: ui.memoryTitle.value.trim(), content: ui.memoryContent.value.trim() }
    await requestJson("/api/memory/entries", { method: "POST", json: payload })
    pushLog("success", "ui", t("log_memory_created"), { project_id: payload.project_id, agent_role: payload.agent_role, title: payload.title })
    ui.memoryTitle.value = ""
    ui.memoryContent.value = ""
    await refreshMemoryEntries()
  })

  ui.memoryList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-memory-id]")
    if (!button) return
    if (!state.token) return requireTokenPanels()
    const id = button.dataset.memoryId
    const next = button.dataset.memoryNext === "true"
    await requestJson(`/api/memory/entries/${id}`, { method: "PATCH", json: { is_active: next } })
    pushLog("success", "ui", t("log_memory_toggled"), { id, is_active: next })
    await refreshMemoryEntries()
  })

  ui.refreshModule.addEventListener("click", async () => state.token ? refreshModule() : requireTokenPanels())
  ui.refreshExecutions.addEventListener("click", async () => state.token ? refreshExecutions() : requireTokenPanels())
  ui.moduleForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!state.token) return requireTokenPanels()
    let config
    try {
      config = JSON.parse(ui.moduleConfig.value || "{}")
    } catch {
      pushLog("error", "ui", "CONFIG_JSON parse error")
      return
    }
    await requestJson(`/api/custom-modules/${SWITCH_MODULE_KEY}`, { method: "PATCH", json: { is_enabled: ui.moduleEnabled.checked, config_json: config } })
    pushLog("success", "ui", t("log_module_updated"), { enabled: ui.moduleEnabled.checked })
    await Promise.allSettled([refreshModule(), refreshExecutions()])
  })

  ui.logsClear.addEventListener("click", () => {
    state.logs = []
    renderLogs()
    setPanelState(ui.logsPanelState, "idle")
    pushLog("info", "ui", t("log_logs_cleared"))
  })

  ui.logFilterLevel.addEventListener("change", () => {
    state.logFilters.level = ui.logFilterLevel.value
    saveJson(KEYS.logFilters, state.logFilters)
    renderLogs()
  })
  ui.logFilterScope.addEventListener("change", () => {
    state.logFilters.scope = ui.logFilterScope.value
    saveJson(KEYS.logFilters, state.logFilters)
    renderLogs()
  })
  ui.logFilterSearch.addEventListener("input", () => {
    state.logFilters.search = ui.logFilterSearch.value
    saveJson(KEYS.logFilters, state.logFilters)
    renderLogs()
  })
  ui.logFilterClear.addEventListener("click", () => {
    state.logFilters = { level: "all", scope: "all", search: "" }
    saveJson(KEYS.logFilters, state.logFilters)
    renderLogs()
  })
}

function loadState() {
  state.lang = readStorage(KEYS.lang) === "en" ? "en" : "ru"
  state.theme = readStorage(KEYS.theme) === "light" ? "light" : "dark"
  state.token = readStorage(KEYS.token) ?? ""
  state.route = normalizeRoute(readStorage(KEYS.route) ?? "dashboard")
  state.section = normalizeSection(readStorage(KEYS.section) ?? "profiles")
  state.auto = { ...state.auto, ...loadJson(KEYS.auto, state.auto) }
  state.projectFilters = { ...state.projectFilters, ...loadJson(KEYS.projectFilters, state.projectFilters) }
  state.projectFilters.includeInactive = state.projectFilters.includeInactive !== false
  state.taskFilters = { ...state.taskFilters, ...loadJson(KEYS.taskFilters, state.taskFilters) }
  state.switchFilters = { ...state.switchFilters, ...loadJson(KEYS.switchFilters, state.switchFilters) }
  state.secretsFilters = { ...state.secretsFilters, ...loadJson(KEYS.secretsFilters, state.secretsFilters) }
  if (typeof state.secretsFilters.project !== "string") state.secretsFilters.project = ""
  if (typeof state.secretsFilters.search !== "string") state.secretsFilters.search = ""
  state.logFilters = { ...state.logFilters, ...loadJson(KEYS.logFilters, state.logFilters) }
  state.agentProfileFilters = { ...state.agentProfileFilters, ...loadJson(KEYS.agentProfileFilters, state.agentProfileFilters) }
  state.agentProfileFilters.includeDisabled = state.agentProfileFilters.includeDisabled !== false
}

async function initConsole() {
  wireConsoleRefs()
  applyTheme()
  applyI18n()
  wireConsoleHandlers()

  const hashRoute = routeFromHash(window.location.hash)
  const hasHash = Boolean(window.location.hash)
  const initial = hasHash ? hashRoute : state.route
  setRoute(initial, { persist: true, writeHash: !hasHash, log: false })
  setSection(state.section, { persist: true, log: false })

  syncAutoTimers()
  pushLog("info", "ui", "Console initialized", { route: state.route, lang: state.lang, theme: state.theme })
  await refreshCurrentRouteWithRetry("console_init")
  updateStats()
}

function bootstrap() {
  loadState()
  applyTheme()
  if (state.page === "entry") return wireEntry()
  initConsole().catch((error) => console.error(error))
}

bootstrap()
