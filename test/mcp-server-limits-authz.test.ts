import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type ApiClientMock,
  OrchestratorApiError,
  createMcpHarness,
  readErrorPayload,
  readStructuredContent
} from "./helpers/mcp-server-harness";

describe("MCP limits + authz", () => {
  let apiClientMock: ApiClientMock;
  let client: Awaited<ReturnType<typeof createMcpHarness>>["client"];
  let closeHarness: (() => Promise<void>) | null = null;

  beforeEach(async () => {
    const harness = await createMcpHarness();
    apiClientMock = harness.apiClientMock;
    client = harness.client;
    closeHarness = harness.close;
  });

  afterEach(async () => {
    if (closeHarness) {
      await closeHarness();
      closeHarness = null;
    }
  });

  it("возвращает fleet snapshot с частичными ошибками в orchestrator.get_limits", async () => {
    apiClientMock.listAuthProfiles.mockResolvedValue({
      items: [
        { id: "profile-1", label: "p1", status: "active" },
        { id: "profile-2", label: "p2", status: "inactive" }
      ]
    });
    apiClientMock.getAuthProfileLimits.mockImplementation(async (profileId: string) => {
      if (profileId === "profile-2") {
        throw new OrchestratorApiError({
          error: "limits unavailable",
          code: "RATE_LIMITS_UNAVAILABLE",
          statusCode: 502,
          method: "GET",
          path: `/api/auth-profiles/chatgpt/${profileId}/limits`
        });
      }

      return {
        profile: {
          id: profileId,
          label: "p1",
          status: "active"
        },
        rate_limits: {
          source: "openai_app_server_rpc"
        }
      };
    });

    const result = await client.callTool({
      name: "orchestrator.get_limits",
      arguments: {
        include_inactive: true
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.listAuthProfiles).toHaveBeenCalledTimes(1);
    expect(apiClientMock.getAuthProfileLimits).toHaveBeenCalledTimes(2);

    const content = readStructuredContent(result);
    expect(content["requested_profiles"]).toBe(2);
    expect(content["successful_profiles"]).toBe(1);
    expect(content["failed_profiles"]).toBe(1);
    const errors = content["errors"];
    expect(Array.isArray(errors)).toBe(true);
    expect((errors as unknown[]).length).toBe(1);
  });

  it("маппит upstream ошибки в единый ErrorResponse формат", async () => {
    apiClientMock.listTasks.mockRejectedValue(
      new OrchestratorApiError({
        error: "forbidden",
        code: "FORBIDDEN",
        statusCode: 403,
        method: "GET",
        path: "/api/tasks"
      })
    );

    const result = await client.callTool({
      name: "orchestrator.list_tasks",
      arguments: {
        status: "NEW"
      }
    });

    expect(result.isError).toBe(true);
    const content = readErrorPayload(result);
    expect(content["error"]).toBe("forbidden");
    expect(content["code"]).toBe("FORBIDDEN");
    expect(content["status_code"]).toBe(403);
  });

  it("проверяет MCP authz перед вызовом tool в authz-режиме", async () => {
    if (closeHarness) {
      await closeHarness();
      closeHarness = null;
    }

    const authzHarness = await createMcpHarness({
      authz: {
        mcp_api_key: "mcpk_secret",
        agent_profile_id: "profile-1"
      }
    });
    apiClientMock = authzHarness.apiClientMock;
    client = authzHarness.client;
    closeHarness = authzHarness.close;

    apiClientMock.evaluateMcpToolAccess.mockResolvedValue({ allowed: true });
    apiClientMock.listTasks.mockResolvedValue({
      items: [{ id: "task-1", status: "NEW" }]
    });

    const result = await client.callTool({
      name: "orchestrator.list_tasks",
      arguments: { status: "NEW" }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.evaluateMcpToolAccess).toHaveBeenCalledTimes(1);
    expect(apiClientMock.evaluateMcpToolAccess.mock.calls[0]?.[0]).toMatchObject({
      api_key: "mcpk_secret",
      tool_name: "orchestrator.list_tasks",
      agent_profile_id: "profile-1"
    });
    expect(apiClientMock.listTasks).toHaveBeenCalledTimes(1);
  });

  it("блокирует tool при MCP authz deny", async () => {
    if (closeHarness) {
      await closeHarness();
      closeHarness = null;
    }

    const authzHarness = await createMcpHarness({
      authz: {
        mcp_api_key: "mcpk_secret"
      }
    });
    apiClientMock = authzHarness.apiClientMock;
    client = authzHarness.client;
    closeHarness = authzHarness.close;

    apiClientMock.evaluateMcpToolAccess.mockRejectedValue(
      new OrchestratorApiError({
        error: "forbidden by acl",
        code: "MCP_TOOL_FORBIDDEN",
        statusCode: 403,
        method: "POST",
        path: "/api/mcp/authz/evaluate"
      })
    );

    const result = await client.callTool({
      name: "orchestrator.list_tasks",
      arguments: {}
    });

    expect(result.isError).toBe(true);
    expect(apiClientMock.evaluateMcpToolAccess).toHaveBeenCalledTimes(1);
    expect(apiClientMock.listTasks).not.toHaveBeenCalled();
    const content = readErrorPayload(result);
    expect(content["code"]).toBe("MCP_TOOL_FORBIDDEN");
    expect(content["status_code"]).toBe(403);
  });
});
