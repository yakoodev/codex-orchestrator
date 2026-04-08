import http from "node:http";
import https from "node:https";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ProxyAgent } from "proxy-agent";
import type { AppConfig } from "../config";

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramUser {
  id: number;
}

interface TelegramChat {
  id: number;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

interface ApiCallResult {
  statusCode: number;
  body: unknown;
}

type ApiCallMethod = "GET" | "POST";

interface TelegramBotRunnerDeps {
  config: AppConfig;
  app: Pick<FastifyInstance, "inject" | "log">;
}

interface TelegramTransport {
  getUpdates(offset: number, timeoutSec: number): Promise<TelegramUpdate[]>;
  sendMessage(chatId: string, text: string): Promise<void>;
}

interface TelegramStatePayload {
  last_update_id: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeCommand(text: string): { command: string; args: string[] } {
  const normalized = text.trim();
  if (!normalized) {
    return { command: "", args: [] };
  }

  const chunks = normalized.split(/\s+/);
  const rawCommand = chunks[0]?.toLowerCase() ?? "";
  const command = rawCommand.split("@")[0] ?? rawCommand;
  const args = chunks.slice(1);
  return { command, args };
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function truncateTelegramMessage(text: string): string {
  if (text.length <= 4000) {
    return text;
  }

  return `${text.slice(0, 3997)}...`;
}

function formatDateTimeMskFromAny(value: unknown): string {
  let date: Date | null = null;
  if (typeof value === "number" && Number.isFinite(value)) {
    date = new Date(value * 1000);
  } else if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function toRecordId(value: unknown): string | null {
  const direct = asString(value);
  if (direct) {
    return direct;
  }

  const numeric = asNumber(value);
  if (numeric != null) {
    return String(Math.trunc(numeric));
  }

  return null;
}

async function readTelegramState(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as TelegramStatePayload;
    const updateId = asNumber(parsed?.last_update_id);
    if (updateId == null) {
      return 0;
    }
    return Math.max(0, Math.trunc(updateId));
  } catch {
    return 0;
  }
}

async function writeTelegramState(filePath: string, lastUpdateId: number): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tempPath = `${filePath}.tmp`;
  const payload: TelegramStatePayload = {
    last_update_id: Math.max(0, Math.trunc(lastUpdateId))
  };
  await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

function isUpdateAuthorized(
  options: {
    allowedChatIds: Set<string>;
    allowedUserIds: Set<string>;
  },
  update: TelegramUpdate
): boolean {
  const message = update.message ?? update.edited_message;
  if (!message) {
    return false;
  }

  const chatId = String(message.chat.id);
  const userId = message.from ? String(message.from.id) : null;

  const hasChatWhitelist = options.allowedChatIds.size > 0;
  const hasUserWhitelist = options.allowedUserIds.size > 0;

  const chatAllowed = hasChatWhitelist && options.allowedChatIds.has(chatId);
  const userAllowed = userId != null && hasUserWhitelist && options.allowedUserIds.has(userId);

  if (!hasChatWhitelist && !hasUserWhitelist) {
    return false;
  }

  return chatAllowed || userAllowed;
}

function normalizeProxyUrl(proxyUrl: string | null): string | null {
  if (!proxyUrl) {
    return null;
  }

  const lower = proxyUrl.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("socks5://")
  ) {
    return proxyUrl;
  }

  return null;
}

class TelegramHttpTransport implements TelegramTransport {
  private readonly proxyAgent: ProxyAgent | undefined;
  private readonly baseUrl: URL;

  public constructor(
    private readonly botToken: string,
    apiBaseUrl: string,
    proxyUrl: string | null
  ) {
    this.baseUrl = new URL(apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`);
    const normalizedProxy = normalizeProxyUrl(proxyUrl);
    if (normalizedProxy) {
      this.proxyAgent = new ProxyAgent({
        getProxyForUrl: () => normalizedProxy
      });
    }
  }

  public async getUpdates(offset: number, timeoutSec: number): Promise<TelegramUpdate[]> {
    const result = await this.request<TelegramUpdate[]>("getUpdates", {
      offset,
      timeout: timeoutSec,
      allowed_updates: ["message", "edited_message"]
    });

    return result;
  }

  public async sendMessage(chatId: string, text: string): Promise<void> {
    await this.request("sendMessage", {
      chat_id: chatId,
      text: truncateTelegramMessage(text),
      disable_web_page_preview: true
    });
  }

  private async request<T = Record<string, unknown>>(
    methodName: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    const endpoint = new URL(`bot${this.botToken}/${methodName}`, this.baseUrl);
    const body = JSON.stringify(payload);
    const responseText = await this.postJson(endpoint, body);

    let parsed: TelegramApiResponse<T>;
    try {
      parsed = JSON.parse(responseText) as TelegramApiResponse<T>;
    } catch (error) {
      throw new Error(
        `Telegram API returned non-JSON response for ${methodName}: ${
          error instanceof Error ? error.message : "unknown_error"
        }`
      );
    }

    if (!parsed.ok) {
      throw new Error(
        `Telegram API error for ${methodName}: ${parsed.description ?? "unknown_error"}`
      );
    }

    if (parsed.result === undefined) {
      throw new Error(`Telegram API missing result for ${methodName}`);
    }

    return parsed.result;
  }

  private async postJson(url: URL, body: string): Promise<string> {
    const timeoutMs = 45_000;
    const options: https.RequestOptions = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body)
      },
      timeout: timeoutMs
    };

    if (this.proxyAgent) {
      options.agent = this.proxyAgent;
    }

    return new Promise<string>((resolve, reject) => {
      const requester = url.protocol === "https:" ? https.request : http.request;
      const req = requester(url, options, (res) => {
        let payload = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          payload += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(
                `Telegram HTTP ${res.statusCode}: ${payload.slice(0, 500)}`
              )
            );
            return;
          }

          resolve(payload);
        });
      });

      req.on("timeout", () => {
        req.destroy(new Error("Telegram request timeout"));
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(body);
      req.end();
    });
  }
}

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
      "/stop <id>",
      "/replan <id> <message>",
      "/approve <id>",
      "/reject <id> [reason]",
      "/artifacts <task_id>",
      "/logs <worker_id>",
      "/limit",
      "/switch-status",
      "/held",
      "/switch-history"
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
    "/stop": "stop",
    "/approve": "approve"
  };

  if (Object.hasOwn(simpleActions, command)) {
    const taskId = args[0];
    if (!taskId) {
      return `Использование: ${command} <id>`;
    }
    const action = simpleActions[command];
    const response = await callApi(
      "POST",
      `/api/tasks/${encodeURIComponent(taskId)}/${action}`
    );
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
    const response = await callApi(
      "POST",
      `/api/tasks/${encodeURIComponent(taskId)}/reject`,
      payload
    );
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
    const response = await callApi(
      "POST",
      `/api/tasks/${encodeURIComponent(taskId)}/replan`,
      { reason }
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return `OK: /replan ${taskId}`;
    }
    return `Ошибка /replan: HTTP ${response.statusCode}`;
  }

  if (command === "/artifacts") {
    const taskId = args[0];
    if (!taskId) {
      return "Использование: /artifacts <task_id>";
    }
    const response = await callApi(
      "GET",
      `/api/tasks/${encodeURIComponent(taskId)}/artifacts`
    );
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
    const response = await callApi(
      "GET",
      `/api/workers/${encodeURIComponent(workerId)}/logs`
    );
    if (response.statusCode !== 200) {
      return `Ошибка /logs: HTTP ${response.statusCode}`;
    }
    const lines = asArray(asObject(response.body)?.["lines"]) ?? [];
    if (lines.length === 0) {
      return `Логи worker ${workerId} пусты.`;
    }
    const printable = lines
      .slice(0, 20)
      .map((line) => (typeof line === "string" ? line : JSON.stringify(line)));
    return printable.join("\n");
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

  if (command === "/say") {
    return "Команда /say пока не поддерживается в API-only контуре.";
  }

  return "Неизвестная команда. Используйте /help";
}

class TelegramBotRunner {
  private readonly transport: TelegramTransport;
  private readonly allowedChatIds: Set<string>;
  private readonly allowedUserIds: Set<string>;
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private lastUpdateId = 0;

  public constructor(private readonly deps: TelegramBotRunnerDeps) {
    this.transport = new TelegramHttpTransport(
      deps.config.telegramBotToken ?? "",
      deps.config.telegramApiBaseUrl,
      deps.config.telegramProxyUrl
    );
    this.allowedChatIds = new Set(deps.config.telegramAllowedChatIds);
    this.allowedUserIds = new Set(deps.config.telegramAllowedUserIds);
  }

  public async start(): Promise<void> {
    if (!this.deps.config.telegramEnabled) {
      this.deps.app.log.info("Telegram adapter is disabled");
      return;
    }
    if (!this.deps.config.telegramBotToken) {
      this.deps.app.log.warn("Telegram adapter enabled, but TG_BOT_TOKEN is empty");
      return;
    }
    if (this.allowedChatIds.size === 0 && this.allowedUserIds.size === 0) {
      this.deps.app.log.warn(
        "Telegram adapter enabled, but no whitelist is configured (TG_ALLOWED_CHAT_IDS / TG_ALLOWED_USER_IDS)"
      );
      return;
    }
    if (this.running) {
      return;
    }

    this.lastUpdateId = await readTelegramState(this.deps.config.telegramStateFilePath);
    this.running = true;
    this.loopPromise = this.pollLoop();
    this.deps.app.log.info(
      {
        last_update_id: this.lastUpdateId,
        polling_timeout_sec: this.deps.config.telegramPollingTimeoutSec
      },
      "Telegram adapter started"
    );
  }

  public async stop(): Promise<void> {
    this.running = false;
    if (this.loopPromise) {
      await this.loopPromise;
      this.loopPromise = null;
    }
  }

  private async pollLoop(): Promise<void> {
    const minBackoff = Math.max(200, this.deps.config.telegramBackoffMinMs);
    const maxBackoff = Math.max(minBackoff, this.deps.config.telegramBackoffMaxMs);
    let currentBackoff = minBackoff;

    while (this.running) {
      try {
        const updates = await this.transport.getUpdates(
          this.lastUpdateId + 1,
          Math.max(1, this.deps.config.telegramPollingTimeoutSec)
        );

        for (const update of updates) {
          if (!this.running) {
            break;
          }
          if (update.update_id <= this.lastUpdateId) {
            continue;
          }

          try {
            await this.processUpdate(update);
          } catch (error) {
            this.deps.app.log.error(
              { err: error, update_id: update.update_id },
              "Failed to process telegram update"
            );
          }

          this.lastUpdateId = update.update_id;
          await writeTelegramState(this.deps.config.telegramStateFilePath, this.lastUpdateId).catch(
            (error: unknown) => {
              this.deps.app.log.error(
                { err: error, update_id: this.lastUpdateId },
                "Failed to persist telegram update offset"
              );
            }
          );
        }

        currentBackoff = minBackoff;
      } catch (error) {
        this.deps.app.log.error(
          { err: error, backoff_ms: currentBackoff },
          "Telegram polling failed; continuing with backoff"
        );
        await sleep(currentBackoff);
        currentBackoff = Math.min(maxBackoff, currentBackoff * 2);
      }
    }
  }

  private async processUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message ?? update.edited_message;
    if (!message || !message.text) {
      return;
    }

    if (
      !isUpdateAuthorized(
        {
          allowedChatIds: this.allowedChatIds,
          allowedUserIds: this.allowedUserIds
        },
        update
      )
    ) {
      this.deps.app.log.warn(
        {
          update_id: update.update_id,
          chat_id: message.chat.id,
          user_id: message.from?.id ?? null
        },
        "Unauthorized telegram update ignored"
      );
      return;
    }

    const chatId = String(message.chat.id);
    const reply = await executeTelegramCommand({
      text: message.text,
      callApi: (method, url, payload) => this.callApi(method, url, payload)
    });

    await this.transport.sendMessage(chatId, reply);
  }

  private async callApi(
    method: ApiCallMethod,
    url: string,
    payload?: unknown
  ): Promise<ApiCallResult> {
    const injectOptions: {
      method: ApiCallMethod;
      url: string;
      payload?: unknown;
      headers: Record<string, string>;
    } = {
      method,
      url,
      headers: {
        "x-admin-token": this.deps.config.adminToken,
        "x-trace-id": `telegram-${randomUUID()}`
      }
    };

    if (payload !== undefined) {
      injectOptions.payload = payload;
    }

    const response = (await (this.deps.app.inject(
      injectOptions as never
    ) as unknown as Promise<{
      statusCode: number;
      body: string;
      json(): unknown;
    }>)) as {
      statusCode: number;
      body: string;
      json(): unknown;
    };

    let body: unknown = null;
    if (response.body) {
      try {
        body = response.json();
      } catch {
        body = response.body;
      }
    }

    return {
      statusCode: response.statusCode,
      body
    };
  }
}

export interface TelegramBotController {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createTelegramBotController(deps: TelegramBotRunnerDeps): TelegramBotController {
  const runner = new TelegramBotRunner(deps);
  return {
    start: () => runner.start(),
    stop: () => runner.stop()
  };
}

export const telegramCommandInternals = {
  normalizeCommand
};
