import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DispatchAgentRequest,
  OrchestratorApiError,
  type OrchestratorApiClient
} from "../src/mcp/api-client";
import { createOrchestratorMcpServer } from "../src/mcp/server";

interface ApiClientMock extends OrchestratorApiClient {
  listAgentTemplates: ReturnType<typeof vi.fn>;
  listDelegationCapabilities: ReturnType<typeof vi.fn>;
  listTasks: ReturnType<typeof vi.fn>;
  dispatchAgent: ReturnType<typeof vi.fn>;
  listAuthProfiles: ReturnType<typeof vi.fn>;
  getAuthProfileLimits: ReturnType<typeof vi.fn>;
}

function createApiClientMock(): ApiClientMock {
  return {
    listAgentTemplates: vi.fn(),
    listDelegationCapabilities: vi.fn(),
    listTasks: vi.fn(),
    dispatchAgent: vi.fn(),
    listAuthProfiles: vi.fn(),
    getAuthProfileLimits: vi.fn()
  };
}

type CallToolResult = Awaited<ReturnType<Client["callTool"]>>;

function readStructuredContent(result: CallToolResult): Record<string, unknown> {
  if (!("structuredContent" in result) || !result.structuredContent) {
    throw new Error("structuredContent is missing");
  }

  if (typeof result.structuredContent !== "object" || Array.isArray(result.structuredContent)) {
    throw new Error("structuredContent must be an object");
  }

  return result.structuredContent as Record<string, unknown>;
}

function readErrorPayload(result: CallToolResult): Record<string, unknown> {
  if ("structuredContent" in result && result.structuredContent) {
    if (typeof result.structuredContent === "object" && !Array.isArray(result.structuredContent)) {
      return result.structuredContent as Record<string, unknown>;
    }
  }

  if (!("content" in result) || !Array.isArray(result.content)) {
    throw new Error("error payload is missing");
  }

  const firstItem = result.content[0];
  if (!firstItem || firstItem.type !== "text") {
    throw new Error("error text payload is missing");
  }

  const parsed = JSON.parse(firstItem.text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("error payload is not an object");
  }

  return parsed as Record<string, unknown>;
}

describe("MCP Bridge Server", () => {
  let apiClientMock: ApiClientMock;
  let server: ReturnType<typeof createOrchestratorMcpServer>;
  let client: Client;

  beforeEach(async () => {
    apiClientMock = createApiClientMock();

    server = createOrchestratorMcpServer({
      apiClient: apiClientMock,
      serverName: "test-mcp",
      serverVersion: "1.0.0"
    });

    client = new Client({
      name: "test-client",
      version: "1.0.0"
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await Promise.allSettled([client.close(), server.close()]);
  });

  it("регистрирует обязательные MCP инструменты", async () => {
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "orchestrator.list_agents",
        "orchestrator.list_tasks",
        "orchestrator.dispatch_agent",
        "orchestrator.get_limits"
      ])
    );
  });

  it("возвращает templates и capabilities через orchestrator.list_agents", async () => {
    apiClientMock.listAgentTemplates.mockResolvedValue({
      items: [{ id: "tpl-1", role: "reviewer" }]
    });
    apiClientMock.listDelegationCapabilities.mockResolvedValue({
      items: [{ capability: "reviewer", agent_template_ids: ["tpl-1"] }]
    });

    const result = await client.callTool({
      name: "orchestrator.list_agents"
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.listAgentTemplates).toHaveBeenCalledTimes(1);
    expect(apiClientMock.listDelegationCapabilities).toHaveBeenCalledTimes(1);

    const content = readStructuredContent(result);
    expect(content["totals"]).toEqual({
      templates: 1,
      capabilities: 1
    });
  });

  it("поддерживает фильтр status и limit в orchestrator.list_tasks", async () => {
    apiClientMock.listTasks.mockResolvedValue({
      items: [
        { id: "task-1", status: "NEW" },
        { id: "task-2", status: "NEW" },
        { id: "task-3", status: "NEW" }
      ]
    });

    const result = await client.callTool({
      name: "orchestrator.list_tasks",
      arguments: {
        status: "NEW",
        limit: 2
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.listTasks).toHaveBeenCalledWith({ status: "NEW" });

    const content = readStructuredContent(result);
    expect(content["status"]).toBe("NEW");
    expect(content["total"]).toBe(3);
    expect(content["returned"]).toBe(2);

    const items = content["items"];
    expect(Array.isArray(items)).toBe(true);
    expect((items as unknown[]).length).toBe(2);
  });

  it("использует idempotency_key для детерминированного trace_id в orchestrator.dispatch_agent", async () => {
    apiClientMock.dispatchAgent.mockResolvedValue({ id: "dlg-1", status: "accepted" });

    const dispatchArgs: DispatchAgentRequest = {
      requester_task_id: "task-1",
      capability: "reviewer",
      target_selector: {},
      payload: {
        prompt: "run review"
      },
      priority: 100
    };

    const result = await client.callTool({
      name: "orchestrator.dispatch_agent",
      arguments: {
        ...dispatchArgs,
        idempotency_key: "same-input"
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.dispatchAgent).toHaveBeenCalledTimes(1);

    const [, traceIdArg] = apiClientMock.dispatchAgent.mock.calls[0] as [
      DispatchAgentRequest,
      string
    ];
    expect(traceIdArg.startsWith("mcp-idempotency-")).toBe(true);

    const content = readStructuredContent(result);
    expect(content["trace_id"]).toBe(traceIdArg);
    expect(content["idempotency_key"]).toBe("same-input");
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
});
