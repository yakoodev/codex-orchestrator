import { describe, expect, it } from "vitest";
import {
  executeTelegramCommand,
  telegramCommandInternals
} from "../src/telegram/telegram-bot";

describe("telegram command handler", () => {
  it("normalizes command with bot suffix", () => {
    const parsed = telegramCommandInternals.normalizeCommand("/tasks@mybot NEW");
    expect(parsed.command).toBe("/tasks");
    expect(parsed.args).toEqual(["NEW"]);
  });

  it("formats /tasks list", async () => {
    const response = await executeTelegramCommand({
      text: "/tasks",
      callApi: async (method, url) => {
        expect(method).toBe("GET");
        expect(url).toBe("/api/tasks");
        return {
          statusCode: 200,
          body: {
            items: [
              { id: "task-1", status: "NEW", title: "First task" },
              { id: "task-2", status: "WAITING_LIMIT", title: "Second task" }
            ]
          }
        };
      }
    });

    expect(response).toContain("task-1");
    expect(response).toContain("First task");
    expect(response).toContain("WAITING_LIMIT");
  });

  it("formats /memory list", async () => {
    const response = await executeTelegramCommand({
      text: "/memory web-ui reviewer all",
      callApi: async (method, url) => {
        expect(method).toBe("GET");
        expect(url).toBe("/api/memory/entries?project_id=web-ui&agent_role=reviewer&limit=20");
        return {
          statusCode: 200,
          body: {
            items: [
              { id: "memory-1", title: "GUI summary", is_active: true },
              { id: "memory-2", title: "Footer note", is_active: false }
            ]
          }
        };
      }
    });

    expect(response).toContain("Memory entries: 2");
    expect(response).toContain("memory-1");
    expect(response).toContain("active");
    expect(response).toContain("inactive");
  });

  it("routes /memory-add to create endpoint", async () => {
    const calls: Array<{ method: string; url: string; payload: unknown }> = [];

    const response = await executeTelegramCommand({
      text: "/memory-add web-ui reviewer GUI note || Always validate sticky header",
      callApi: async (method, url, payload) => {
        calls.push({ method, url, payload });
        return { statusCode: 201, body: { id: "memory-55" } };
      }
    });

    expect(calls).toEqual([
      {
        method: "POST",
        url: "/api/memory/entries",
        payload: {
          project_id: "web-ui",
          agent_role: "reviewer",
          title: "GUI note",
          content: "Always validate sticky header"
        }
      }
    ]);
    expect(response).toBe("OK: /memory-add memory-55");
  });

  it("routes /memory-enable and /memory-disable", async () => {
    const calls: Array<{ method: string; url: string; payload: unknown }> = [];

    const enableResponse = await executeTelegramCommand({
      text: "/memory-enable memory-1",
      callApi: async (method, url, payload) => {
        calls.push({ method, url, payload });
        return { statusCode: 200, body: { id: "memory-1" } };
      }
    });
    const disableResponse = await executeTelegramCommand({
      text: "/memory-disable memory-1",
      callApi: async (method, url, payload) => {
        calls.push({ method, url, payload });
        return { statusCode: 200, body: { id: "memory-1" } };
      }
    });

    expect(calls).toEqual([
      {
        method: "PATCH",
        url: "/api/memory/entries/memory-1",
        payload: { is_active: true }
      },
      {
        method: "PATCH",
        url: "/api/memory/entries/memory-1",
        payload: { is_active: false }
      }
    ]);
    expect(enableResponse).toBe("OK: /memory-enable memory-1");
    expect(disableResponse).toBe("OK: /memory-disable memory-1");
  });

  it("returns limits based on active profile", async () => {
    const calls: string[] = [];

    const response = await executeTelegramCommand({
      text: "/limit",
      callApi: async (method, url) => {
        calls.push(`${method} ${url}`);
        if (url === "/api/auth-profiles/chatgpt/active") {
          return {
            statusCode: 200,
            body: { id: "profile-1", label: "main" }
          };
        }

        if (url === "/api/auth-profiles/chatgpt/profile-1/limits") {
          return {
            statusCode: 200,
            body: {
              rate_limits: {
                primary: {
                  remaining_percent: 78,
                  resets_at_utc: "2026-04-08T00:52:00.000Z"
                },
                secondary: {
                  remaining_percent: 67,
                  resets_at_utc: "2026-04-14T11:32:00.000Z"
                }
              }
            }
          };
        }

        return { statusCode: 500, body: {} };
      }
    });

    expect(calls).toEqual([
      "GET /api/auth-profiles/chatgpt/active",
      "GET /api/auth-profiles/chatgpt/profile-1/limits"
    ]);
    expect(response).toContain("remaining=78%");
    expect(response).toContain("remaining=67%");
  });

  it("returns usage when /replan arguments are missing", async () => {
    const response = await executeTelegramCommand({
      text: "/replan task-1",
      callApi: async () => ({ statusCode: 500, body: {} })
    });

    expect(response).toBe("Использование: /replan <id> <message>");
  });

  it("routes /say to api endpoint", async () => {
    const calls: Array<{ method: string; url: string; payload: unknown }> = [];

    const response = await executeTelegramCommand({
      text: "/say task-1 hello",
      callApi: async (method, url, payload) => {
        calls.push({ method, url, payload });
        return { statusCode: 202, body: { accepted: true } };
      }
    });

    expect(calls).toEqual([
      {
        method: "POST",
        url: "/api/tasks/task-1/say",
        payload: { message: "hello" }
      }
    ]);
    expect(response).toBe("OK: /say task-1");
  });

  it("returns usage when /say args are missing", async () => {
    const response = await executeTelegramCommand({
      text: "/say task-1",
      callApi: async () => ({ statusCode: 500, body: {} })
    });

    expect(response).toBe("Использование: /say <id> <message>");
  });

  it("formats redis stream notification envelopes", () => {
    const text = telegramCommandInternals.buildNotificationTextFromEnvelope({
      event_type: "queue.hold_started",
      timestamp: "2026-04-08T10:00:00.000Z",
      payload: {
        held_count: 3
      }
    });

    expect(text).toContain("queue: hold_started");
    expect(text).toContain("held_count=3");
  });

  it("builds telegram api method url for tokens with colon", () => {
    const endpoint = telegramCommandInternals.buildTelegramMethodUrl(
      new URL("https://api.telegram.org/"),
      "8598004064:AAGuUs5BzbFvi1ovHIyysrSle97JqPuN5vA",
      "getUpdates"
    );

    expect(endpoint.protocol).toBe("https:");
    expect(endpoint.toString()).toBe(
      "https://api.telegram.org/bot8598004064:AAGuUs5BzbFvi1ovHIyysrSle97JqPuN5vA/getUpdates"
    );
  });
});
