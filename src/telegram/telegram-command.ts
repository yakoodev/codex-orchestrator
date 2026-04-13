import {
  asArray,
  asNumber,
  asObject,
  asString,
  formatDateTimeMskFromAny,
  normalizeCommand,
  toRecordId
} from "./telegram-bot-helpers";

export interface ApiCallResult {
  statusCode: number;
  body: unknown;
}

export type ApiCallMethod = "GET" | "POST" | "PATCH";

export async function executeTelegramCommand(options: {
  text: string;
  callApi: (method: ApiCallMethod, url: string, payload?: unknown) => Promise<ApiCallResult>;
}): Promise<string> {
  const { text, callApi } = options;
  const { command, args } = normalizeCommand(text);

  if (!command.startsWith("/")) {
    return "Неизвестная команда. Используйте /help";
  }

  if (command === "/help" || command === "/start") {
    return [
      "Доступные команды:",
      "/tasks [status]",
      "/task <id>",
      "/pause <id>",
      "/resume <id>",
      "/cancel <id>",
      "/replan <id> <message>",
      "/say <id> <message>",
      "/approve <id>",
      "/reject <id> [reason]",
      "/artifacts <task_id>",
      "/logs <worker_id>",
      "/limit",
      "/switch-status",
      "/held",
      "/switch-history",
      "/memory <project_id> <agent_role> [active|inactive|all]",
      "/memory-add <project_id> <agent_role> <title> || <content>",
      "/memory-enable <memory_id>",
      "/memory-disable <memory_id>"
    ].join("\n");
  }

  if (command === "/tasks") {
    const status = args[0];
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const response = await callApi("GET", `/api/tasks${query}`);
    if (response.statusCode !== 200) {
      return `Ошибка /tasks: HTTP ${response.statusCode}`;
    }
    const items = asArray(asObject(response.body)?.["items"]) ?? [];
    if (items.length === 0) {
      return "Список задач пуст.";
    }
    const lines = items.slice(0, 10).map((item) => {
      const record = asObject(item);
      if (!record) {
        return "- invalid_task";
      }
      const id = toRecordId(record["id"]) ?? "n/a";
      const taskStatus = asString(record["status"]) ?? "n/a";
      const title = asString(record["title"]) ?? "без заголовка";
      return `- ${id} | ${taskStatus} | ${title}`;
    });
    return lines.join("\n");
  }

  if (command === "/task") {
    const taskId = args[0];
    if (!taskId) {
      return "Использование: /task <id>";
    }
    const response = await callApi("GET", `/api/tasks/${encodeURIComponent(taskId)}`);
    if (response.statusCode === 404) {
      return `Задача ${taskId} не найдена.`;
    }
    if (response.statusCode !== 200) {
      return `Ошибка /task: HTTP ${response.statusCode}`;
    }
    const task = asObject(response.body);
    if (!task) {
      return `Задача ${taskId}: некорректный ответ API`;
    }
    return [
      `id: ${toRecordId(task["id"]) ?? "n/a"}`,
      `status: ${asString(task["status"]) ?? "n/a"}`,
      `title: ${asString(task["title"]) ?? "n/a"}`,
      `priority: ${asNumber(task["priority"]) ?? "n/a"}`
    ].join("\n");
  }

  const simpleActions: Record<string, string> = {
    "/pause": "pause",
    "/resume": "resume",
    "/cancel": "cancel",
    "/stop": "cancel",
    "/approve": "approve"
  };
  if (Object.hasOwn(simpleActions, command)) {
    const taskId = args[0];
    if (!taskId) {
      return `Использование: ${command} <id>`;
    }
    const action = simpleActions[command];
    const response = await callApi("POST", `/api/tasks/${encodeURIComponent(taskId)}/${action}`);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return `OK: ${command} ${taskId}`;
    }
    return `Ошибка ${command}: HTTP ${response.statusCode}`;
  }

  if (command === "/reject") {
    const taskId = args[0];
    if (!taskId) {
      return "Использование: /reject <id> [reason]";
    }
    const reason = args.slice(1).join(" ").trim();
    const payload = reason ? { reason } : {};
    const response = await callApi("POST", `/api/tasks/${encodeURIComponent(taskId)}/reject`, payload);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return `OK: /reject ${taskId}`;
    }
    return `Ошибка /reject: HTTP ${response.statusCode}`;
  }

  if (command === "/replan") {
    const taskId = args[0];
    const reason = args.slice(1).join(" ").trim();
    if (!taskId || !reason) {
      return "Использование: /replan <id> <message>";
    }
    const response = await callApi("POST", `/api/tasks/${encodeURIComponent(taskId)}/replan`, { reason });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return `OK: /replan ${taskId}`;
    }
    return `Ошибка /replan: HTTP ${response.statusCode}`;
  }

  if (command === "/say") {
    const taskId = args[0];
    const message = args.slice(1).join(" ").trim();
    if (!taskId || !message) {
      return "Использование: /say <id> <message>";
    }
    const response = await callApi("POST", `/api/tasks/${encodeURIComponent(taskId)}/say`, { message });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return `OK: /say ${taskId}`;
    }
    if (response.statusCode === 404) {
      return `Задача ${taskId} не найдена.`;
    }
    return `Ошибка /say: HTTP ${response.statusCode}`;
  }

  if (command === "/artifacts") {
    const taskId = args[0];
    if (!taskId) {
      return "Использование: /artifacts <task_id>";
    }
    const response = await callApi("GET", `/api/tasks/${encodeURIComponent(taskId)}/artifacts`);
    if (response.statusCode !== 200) {
      return `Ошибка /artifacts: HTTP ${response.statusCode}`;
    }
    const items = asArray(asObject(response.body)?.["items"]) ?? [];
    if (items.length === 0) {
      return `Для задачи ${taskId} артефактов нет.`;
    }
    const lines = items.slice(0, 10).map((item) => {
      const artifact = asObject(item);
      if (!artifact) {
        return "- invalid_artifact";
      }
      return `- ${toRecordId(artifact["id"]) ?? "n/a"} | ${asString(artifact["type"]) ?? "n/a"} | ${
        asString(artifact["path"]) ?? "n/a"
      }`;
    });
    return lines.join("\n");
  }

  if (command === "/logs") {
    const workerId = args[0];
    if (!workerId) {
      return "Использование: /logs <worker_id>";
    }
    const response = await callApi("GET", `/api/workers/${encodeURIComponent(workerId)}/logs`);
    if (response.statusCode !== 200) {
      return `Ошибка /logs: HTTP ${response.statusCode}`;
    }
    const lines = asArray(asObject(response.body)?.["lines"]) ?? [];
    if (lines.length === 0) {
      return `Логи worker ${workerId} пусты.`;
    }
    return lines
      .slice(0, 20)
      .map((line) => (typeof line === "string" ? line : JSON.stringify(line)))
      .join("\n");
  }

  if (command === "/memory") {
    const projectId = args[0];
    const agentRole = args[1];
    const stateArg = (args[2] ?? "active").toLowerCase();
    if (!projectId || !agentRole || !["active", "inactive", "all"].includes(stateArg)) {
      return "Использование: /memory <project_id> <agent_role> [active|inactive|all]";
    }

    const params = new URLSearchParams();
    params.set("project_id", projectId);
    params.set("agent_role", agentRole);
    params.set("limit", "20");
    if (stateArg !== "all") {
      params.set("is_active", stateArg === "active" ? "true" : "false");
    }

    const response = await callApi("GET", `/api/memory/entries?${params.toString()}`);
    if (response.statusCode !== 200) {
      return `Ошибка /memory: HTTP ${response.statusCode}`;
    }

    const items = asArray(asObject(response.body)?.["items"]) ?? [];
    if (items.length === 0) {
      return `Память пуста для project=${projectId}, role=${agentRole}, state=${stateArg}.`;
    }

    const lines = items.slice(0, 10).map((item) => {
      const entry = asObject(item);
      if (!entry) {
        return "- invalid_memory_entry";
      }
      const id = toRecordId(entry["id"]) ?? "n/a";
      const title = asString(entry["title"]) ?? "без заголовка";
      const isActive = entry["is_active"] === true ? "active" : "inactive";
      return `- ${id} | ${isActive} | ${title}`;
    });

    return [
      `Memory entries: ${items.length} (project=${projectId}, role=${agentRole}, state=${stateArg})`,
      ...lines
    ].join("\n");
  }

  if (command === "/memory-add") {
    const projectId = args[0];
    const agentRole = args[1];
    const tail = args.slice(2).join(" ").trim();
    if (!projectId || !agentRole || !tail.includes("||")) {
      return "Использование: /memory-add <project_id> <agent_role> <title> || <content>";
    }

    const delimiterIndex = tail.indexOf("||");
    const title = tail.slice(0, delimiterIndex).trim();
    const content = tail.slice(delimiterIndex + 2).trim();
    if (!title || !content) {
      return "Использование: /memory-add <project_id> <agent_role> <title> || <content>";
    }

    const response = await callApi("POST", "/api/memory/entries", {
      project_id: projectId,
      agent_role: agentRole,
      title,
      content
    });
    if (response.statusCode !== 201) {
      return `Ошибка /memory-add: HTTP ${response.statusCode}`;
    }

    const created = asObject(response.body);
    const id = toRecordId(created?.["id"]) ?? "n/a";
    return `OK: /memory-add ${id}`;
  }

  if (command === "/memory-enable" || command === "/memory-disable") {
    const memoryId = args[0];
    if (!memoryId) {
      return `Использование: ${command} <memory_id>`;
    }

    const response = await callApi("PATCH", `/api/memory/entries/${encodeURIComponent(memoryId)}`, {
      is_active: command === "/memory-enable"
    });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return `OK: ${command} ${memoryId}`;
    }
    if (response.statusCode === 404) {
      return `Память ${memoryId} не найдена.`;
    }
    return `Ошибка ${command}: HTTP ${response.statusCode}`;
  }

  if (command === "/held") {
    const response = await callApi("GET", "/api/queue/held");
    if (response.statusCode !== 200) {
      return `Ошибка /held: HTTP ${response.statusCode}`;
    }
    const items = asArray(asObject(response.body)?.["items"]) ?? [];
    if (items.length === 0) {
      return "Held queue пуста.";
    }
    const lines = items.slice(0, 10).map((item) => {
      const task = asObject(item);
      if (!task) {
        return "- invalid_task";
      }
      return `- ${toRecordId(task["id"]) ?? "n/a"} | ${asString(task["title"]) ?? "n/a"} | ${
        asString(task["status"]) ?? "n/a"
      }`;
    });
    return [`Held: ${items.length}`, ...lines].join("\n");
  }

  if (command === "/switch-history") {
    const response = await callApi("GET", "/api/auth-profiles/chatgpt/switch-events");
    if (response.statusCode !== 200) {
      return `Ошибка /switch-history: HTTP ${response.statusCode}`;
    }
    const items = asArray(asObject(response.body)?.["items"]) ?? [];
    if (items.length === 0) {
      return "История переключений пустая.";
    }
    const lines = items.slice(0, 10).map((item) => {
      const event = asObject(item);
      if (!event) {
        return "- invalid_event";
      }
      return `- ${toRecordId(event["id"]) ?? "n/a"} | ${
        asString(event["reason"]) ?? "n/a"
      } | ${asString(event["status"]) ?? "n/a"} | ${formatDateTimeMskFromAny(event["started_at"])}`;
    });
    return lines.join("\n");
  }

  if (command === "/switch-status") {
    const [activeResponse, heldResponse] = await Promise.all([
      callApi("GET", "/api/auth-profiles/chatgpt/active"),
      callApi("GET", "/api/queue/held")
    ]);
    const heldItems = asArray(asObject(heldResponse.body)?.["items"]) ?? [];
    let activeLine = "active_profile: none";
    if (activeResponse.statusCode === 200) {
      const active = asObject(activeResponse.body);
      const id = toRecordId(active?.["id"]) ?? "n/a";
      const label = asString(active?.["label"]) ?? "n/a";
      activeLine = `active_profile: ${id} (${label})`;
    }
    return [activeLine, `held_tasks: ${heldItems.length}`].join("\n");
  }

  if (command === "/limit") {
    const activeResponse = await callApi("GET", "/api/auth-profiles/chatgpt/active");
    if (activeResponse.statusCode === 404) {
      return "Активный auth-профиль не выбран.";
    }
    if (activeResponse.statusCode !== 200) {
      return `Ошибка /limit: active profile HTTP ${activeResponse.statusCode}`;
    }

    const active = asObject(activeResponse.body);
    const profileId = toRecordId(active?.["id"]);
    if (!profileId) {
      return "Ошибка /limit: active profile id не найден.";
    }

    const limitsResponse = await callApi(
      "GET",
      `/api/auth-profiles/chatgpt/${encodeURIComponent(profileId)}/limits`
    );
    if (limitsResponse.statusCode !== 200) {
      return `Ошибка /limit: limits HTTP ${limitsResponse.statusCode}`;
    }

    const rateLimits = asObject(asObject(limitsResponse.body)?.["rate_limits"]);
    const primary = asObject(rateLimits?.["primary"]);
    const secondary = asObject(rateLimits?.["secondary"]);
    const primaryRemaining = asNumber(primary?.["remaining_percent"]);
    const secondaryRemaining = asNumber(secondary?.["remaining_percent"]);
    return [
      `profile: ${profileId}`,
      `5h: remaining=${primaryRemaining ?? "n/a"}% update=${formatDateTimeMskFromAny(
        primary?.["resets_at_utc"] ?? primary?.["resets_at_unix"]
      )}`,
      `week: remaining=${secondaryRemaining ?? "n/a"}% update=${formatDateTimeMskFromAny(
        secondary?.["resets_at_utc"] ?? secondary?.["resets_at_unix"]
      )}`
    ].join("\n");
  }

  return "Неизвестная команда. Используйте /help";
}
