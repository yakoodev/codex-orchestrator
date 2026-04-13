import http from "node:http";
import https from "node:https";
import { ProxyAgent } from "proxy-agent";
import {
  buildTelegramMethodUrl,
  normalizeProxyUrl,
  truncateTelegramMessage
} from "./telegram-bot-helpers";
import type { TelegramUpdate } from "./telegram-bot-helpers";

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface TelegramTransport {
  getUpdates(offset: number, timeoutSec: number): Promise<TelegramUpdate[]>;
  sendMessage(chatId: string, text: string): Promise<void>;
}

export class TelegramHttpTransport implements TelegramTransport {
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
    return this.request<TelegramUpdate[]>("getUpdates", {
      offset,
      timeout: timeoutSec,
      allowed_updates: ["message", "edited_message"]
    });
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
    const endpoint = buildTelegramMethodUrl(this.baseUrl, this.botToken, methodName);
    const responseText = await this.postJson(endpoint, JSON.stringify(payload));

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
      throw new Error(`Telegram API error for ${methodName}: ${parsed.description ?? "unknown_error"}`);
    }
    if (parsed.result === undefined) {
      throw new Error(`Telegram API missing result for ${methodName}`);
    }

    return parsed.result;
  }

  private async postJson(url: URL, body: string): Promise<string> {
    const options: https.RequestOptions = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body)
      },
      timeout: 45_000
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
            reject(new Error(`Telegram HTTP ${res.statusCode}: ${payload.slice(0, 500)}`));
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
