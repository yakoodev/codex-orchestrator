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
  createAgentRequest: ReturnType<typeof vi.fn>;
  listOpenAgentRequests: ReturnType<typeof vi.fn>;
  resolveAgentRequest: ReturnType<typeof vi.fn>;
  listAuthProfiles: ReturnType<typeof vi.fn>;
  getAuthProfileLimits: ReturnType<typeof vi.fn>;
}

function createApiClientMock(): ApiClientMock {
  return {
    listAgentTemplates: vi.fn(),
    listDelegationCapabilities: vi.fn(),
    listTasks: vi.fn(),
    dispatchAgent: vi.fn(),
    createAgentRequest: vi.fn(),
    listOpenAgentRequests: vi.fn(),
    resolveAgentRequest: vi.fn(),
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
        "orchestrator.create_agent_request",
        "orchestrator.list_open_agent_requests",
        "orchestrator.resolve_agent_request",
        "orchestrator.governor_process_open_agent_requests",
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

  it("создает универсальную заявку через orchestrator.create_agent_request", async () => {
    apiClientMock.createAgentRequest.mockResolvedValue({
      id: "agent-request-1",
      status: "open",
      type: "runtime_dependency"
    });

    const result = await client.callTool({
      name: "orchestrator.create_agent_request",
      arguments: {
        type: "runtime_dependency",
        project_id: "web-ui",
        task_id: "task-1",
        title: "Need browser access",
        reason: "No browser MCP in current profile",
        request_payload: { server: "browser-mcp" }
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.createAgentRequest).toHaveBeenCalledTimes(1);

    const [payloadArg, traceIdArg] = apiClientMock.createAgentRequest.mock.calls[0] as [
      Record<string, unknown>,
      string
    ];
    expect(payloadArg["project_id"]).toBe("web-ui");
    expect(payloadArg["task_id"]).toBe("task-1");
    expect(typeof traceIdArg).toBe("string");
    expect(traceIdArg.length).toBeGreaterThan(10);

    const content = readStructuredContent(result);
    expect(content["request"]).toEqual({
      id: "agent-request-1",
      status: "open",
      type: "runtime_dependency"
    });
  });

  it("возвращает open-пул заявок через orchestrator.list_open_agent_requests", async () => {
    apiClientMock.listOpenAgentRequests.mockResolvedValue({
      items: [
        { id: "agent-request-1", status: "open" },
        { id: "agent-request-2", status: "blocked_agent" }
      ]
    });

    const result = await client.callTool({
      name: "orchestrator.list_open_agent_requests",
      arguments: {
        project_id: "web-ui",
        include_in_progress: true,
        limit: 20
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.listOpenAgentRequests).toHaveBeenCalledWith({
      project_id: "web-ui",
      task_id: undefined,
      agent_profile_id: undefined,
      agent_template_id: undefined,
      type: undefined,
      include_in_progress: true,
      limit: 20
    });

    const content = readStructuredContent(result);
    expect(content["total"]).toBe(2);
    expect(content["open_pool_statuses"]).toEqual(["open", "blocked_agent", "in_progress"]);
  });

  it("обновляет статус заявки через orchestrator.resolve_agent_request", async () => {
    apiClientMock.resolveAgentRequest.mockResolvedValue({
      id: "agent-request-1",
      status: "blocked_agent"
    });

    const result = await client.callTool({
      name: "orchestrator.resolve_agent_request",
      arguments: {
        request_id: "agent-request-1",
        status: "blocked_agent",
        resolution_payload: { reason: "waiting_for_manual_approval" },
        claimed_by_governor_id: "governor-main"
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.resolveAgentRequest).toHaveBeenCalledTimes(1);
    expect(apiClientMock.resolveAgentRequest.mock.calls[0]?.[0]).toBe("agent-request-1");
    expect(apiClientMock.resolveAgentRequest.mock.calls[0]?.[1]).toEqual({
      status: "blocked_agent",
      resolution_payload: { reason: "waiting_for_manual_approval" },
      claimed_by_governor_id: "governor-main",
      resolved_by: undefined
    });

    const content = readStructuredContent(result);
    expect(content["request"]).toEqual({
      id: "agent-request-1",
      status: "blocked_agent"
    });
  });

  it("выполняет dry-run governor цикла без изменения статусов", async () => {
    apiClientMock.listOpenAgentRequests.mockResolvedValue({
      items: [
        {
          id: "agent-request-open-1",
          status: "open",
          type: "runtime_dependency",
          request_payload: { governor_auto_resolve: true }
        },
        {
          id: "agent-request-blocked-1",
          status: "blocked_agent",
          type: "other",
          request_payload: {}
        }
      ]
    });

    const result = await client.callTool({
      name: "orchestrator.governor_process_open_agent_requests",
      arguments: {
        project_id: "web-ui",
        dry_run: true
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.listOpenAgentRequests).toHaveBeenCalledWith({
      project_id: "web-ui",
      task_id: undefined,
      agent_profile_id: undefined,
      agent_template_id: undefined,
      type: undefined,
      include_in_progress: false,
      limit: undefined
    });
    expect(apiClientMock.resolveAgentRequest).not.toHaveBeenCalled();

    const content = readStructuredContent(result);
    expect(content["dry_run"]).toBe(true);
    expect(content["total_candidates"]).toBe(2);
    expect(content["processed"]).toBe(0);
    expect(content["skipped"]).toBe(1);
    const actions = content["actions"];
    expect(Array.isArray(actions)).toBe(true);
    expect((actions as Array<Record<string, unknown>>)[0]?.["planned_final_status"]).toBe(
      "resolved_by_agent"
    );
  });

  it("обрабатывает open-заявку governor циклом с claim -> finalize", async () => {
    apiClientMock.listOpenAgentRequests.mockResolvedValue({
      items: [
        {
          id: "agent-request-open-2",
          status: "open",
          type: "runtime_dependency",
          request_payload: { governor_auto_resolve: true }
        }
      ]
    });
    apiClientMock.resolveAgentRequest
      .mockResolvedValueOnce({
        id: "agent-request-open-2",
        status: "in_progress"
      })
      .mockResolvedValueOnce({
        id: "agent-request-open-2",
        status: "resolved_by_agent"
      });

    const result = await client.callTool({
      name: "orchestrator.governor_process_open_agent_requests",
      arguments: {
        governor_id: "governor-main",
        limit: 10
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.resolveAgentRequest).toHaveBeenCalledTimes(2);
    expect(apiClientMock.resolveAgentRequest.mock.calls[0]?.[0]).toBe("agent-request-open-2");
    expect(apiClientMock.resolveAgentRequest.mock.calls[0]?.[1]).toMatchObject({
      status: "in_progress",
      claimed_by_governor_id: "governor-main"
    });
    expect(apiClientMock.resolveAgentRequest.mock.calls[1]?.[1]).toMatchObject({
      status: "resolved_by_agent",
      claimed_by_governor_id: "governor-main",
      resolved_by: "governor-main"
    });

    const content = readStructuredContent(result);
    expect(content["processed"]).toBe(1);
    expect(content["claimed"]).toBe(1);
    expect(content["resolved_by_agent"]).toBe(1);
    expect(content["blocked_agent"]).toBe(0);
    expect(content["errors"]).toBe(0);
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
