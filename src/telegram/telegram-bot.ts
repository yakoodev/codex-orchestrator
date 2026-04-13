import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import Redis from "ioredis";
import type { AppConfig } from "../config";
import {
  asString,
  buildNotificationTextFromEnvelope,
  buildTelegramMethodUrl,
  isUpdateAuthorized,
  normalizeCommand,
  parseStreamFieldsToRecord,
  readTelegramState,
  sleep,
  TELEGRAM_NOTIFICATION_TOPICS,
  writeTelegramState
} from "./telegram-bot-helpers";
import type { EventEnvelope, TelegramUpdate } from "./telegram-bot-helpers";
import { type ApiCallMethod, type ApiCallResult, executeTelegramCommand } from "./telegram-command";
import { TelegramHttpTransport, type TelegramTransport } from "./telegram-transport";

export { executeTelegramCommand } from "./telegram-command";

interface TelegramBotRunnerDeps {
  config: AppConfig;
  app: Pick<FastifyInstance, "inject" | "log">;
}

class TelegramBotRunner {
  private readonly transport: TelegramTransport;
  private readonly allowedChatIds: Set<string>;
  private readonly allowedUserIds: Set<string>;
  private readonly notificationDebounceMs = 5000;
  private running = false;
  private updatesLoopPromise: Promise<void> | null = null;
  private notificationsLoopPromise: Promise<void> | null = null;
  private lastUpdateId = 0;
  private lastStreamId = "$";
  private readonly lastNotificationByTopic = new Map<string, number>();
  private redis: Redis | null = null;

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
        "Telegram adapter enabled without whitelist; running in discovery mode (updates ignored, ids only in logs)"
      );
    }
    if (this.running) {
      return;
    }

    const persistedState = await readTelegramState(this.deps.config.telegramStateFilePath);
    this.lastUpdateId = persistedState.lastUpdateId;
    this.lastStreamId = persistedState.lastStreamId;
    this.running = true;
    this.updatesLoopPromise = this.pollLoop();

    try {
      this.redis = new Redis(this.deps.config.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1
      });
      await this.redis.connect();
      this.notificationsLoopPromise = this.pollNotificationsLoop();
    } catch (error) {
      this.deps.app.log.error(
        { err: error },
        "Telegram notifications bridge is unavailable; command polling stays active"
      );
      if (this.redis) {
        await this.redis.quit().catch(() => undefined);
      }
      this.redis = null;
      this.notificationsLoopPromise = null;
    }

    this.deps.app.log.info(
      {
        last_update_id: this.lastUpdateId,
        last_stream_id: this.lastStreamId,
        polling_timeout_sec: this.deps.config.telegramPollingTimeoutSec
      },
      "Telegram adapter started"
    );
  }

  public async stop(): Promise<void> {
    this.running = false;
    if (this.updatesLoopPromise) {
      await this.updatesLoopPromise;
      this.updatesLoopPromise = null;
    }
    if (this.notificationsLoopPromise) {
      await this.notificationsLoopPromise;
      this.notificationsLoopPromise = null;
    }
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
      this.redis = null;
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
          await this.persistTelegramState().catch((error: unknown) => {
            this.deps.app.log.error(
              { err: error, update_id: this.lastUpdateId },
              "Failed to persist telegram update offset"
            );
          });
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

  private async pollNotificationsLoop(): Promise<void> {
    if (!this.redis) {
      return;
    }
    if (this.allowedChatIds.size === 0) {
      this.deps.app.log.info(
        "Telegram notifications bridge is disabled because TG_ALLOWED_CHAT_IDS is empty"
      );
      return;
    }

    const minBackoff = Math.max(200, this.deps.config.telegramBackoffMinMs);
    const maxBackoff = Math.max(minBackoff, this.deps.config.telegramBackoffMaxMs);
    let currentBackoff = minBackoff;

    while (this.running && this.redis) {
      try {
        const xreadResult = (await this.redis.xread(
          "COUNT",
          50,
          "BLOCK",
          10000,
          "STREAMS",
          this.deps.config.redisStreamKey,
          this.lastStreamId
        )) as [string, [string, string[]][]][] | null;

        if (!xreadResult || xreadResult.length === 0) {
          continue;
        }

        for (const [, entries] of xreadResult) {
          for (const [entryId, fields] of entries) {
            this.lastStreamId = entryId;
            await this.persistTelegramState().catch((error: unknown) => {
              this.deps.app.log.error(
                { err: error, stream_id: this.lastStreamId },
                "Failed to persist telegram stream offset"
              );
            });

            const fieldRecord = parseStreamFieldsToRecord(fields);
            const eventJson = fieldRecord["event"];
            if (!eventJson) {
              continue;
            }

            let envelope: EventEnvelope;
            try {
              envelope = JSON.parse(eventJson) as EventEnvelope;
            } catch {
              continue;
            }

            const eventType = asString(envelope.event_type);
            if (!eventType || !TELEGRAM_NOTIFICATION_TOPICS.has(eventType)) {
              continue;
            }
            if (!this.shouldSendTopicNotification(eventType)) {
              continue;
            }

            const text = buildNotificationTextFromEnvelope(envelope);
            if (!text) {
              continue;
            }
            await this.broadcastToAllowedChats(text);
          }
        }

        currentBackoff = minBackoff;
      } catch (error) {
        this.deps.app.log.error(
          { err: error, backoff_ms: currentBackoff },
          "Telegram notifications polling failed; continuing with backoff"
        );
        await sleep(currentBackoff);
        currentBackoff = Math.min(maxBackoff, currentBackoff * 2);
      }
    }
  }

  private shouldSendTopicNotification(topic: string): boolean {
    const now = Date.now();
    const lastSentAt = this.lastNotificationByTopic.get(topic);
    if (lastSentAt != null && now - lastSentAt < this.notificationDebounceMs) {
      return false;
    }
    this.lastNotificationByTopic.set(topic, now);
    return true;
  }

  private async broadcastToAllowedChats(text: string): Promise<void> {
    await Promise.all(
      [...this.allowedChatIds].map(async (chatId) => {
        try {
          await this.transport.sendMessage(chatId, text);
        } catch (error) {
          this.deps.app.log.error({ err: error, chat_id: chatId }, "Failed to send telegram notification");
        }
      })
    );
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

  private async persistTelegramState(): Promise<void> {
    await writeTelegramState(this.deps.config.telegramStateFilePath, {
      lastUpdateId: this.lastUpdateId,
      lastStreamId: this.lastStreamId
    });
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
  normalizeCommand,
  buildNotificationTextFromEnvelope,
  buildTelegramMethodUrl
};
