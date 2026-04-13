import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type ApiClientMock,
  createMcpHarness,
  readStructuredContent
} from "./helpers/mcp-server-harness";

describe("MCP Bridge Server", () => {
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

  it("регистрирует обязательные MCP инструменты", async () => {
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "orchestrator.list_agents",
        "orchestrator.list_agent_profiles",
        "orchestrator.list_tasks",
        "orchestrator.create_task",
        "orchestrator.cancel_task",
        "orchestrator.create_agent_request",
        "orchestrator.list_open_agent_requests",
        "orchestrator.resolve_agent_request",
        "orchestrator.governor_process_open_agent_requests",
        "orchestrator.get_limits"
      ])
    );
  });

  it("возвращает profiles и capabilities через orchestrator.list_agents", async () => {
    apiClientMock.listAgentProfiles.mockResolvedValue({
      items: [{ id: "profile-1", role: "reviewer", is_enabled: true }]
    });
    apiClientMock.listDelegationCapabilities.mockResolvedValue({
      items: [{ capability: "reviewer", agent_profile_ids: ["profile-1"] }]
    });

    const result = await client.callTool({ name: "orchestrator.list_agents" });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.listAgentProfiles).toHaveBeenCalledTimes(1);
    expect(apiClientMock.listDelegationCapabilities).toHaveBeenCalledTimes(1);

    const content = readStructuredContent(result);
    expect(content["totals"]).toEqual({
      profiles: 1,
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
      arguments: { status: "NEW", limit: 2 }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.listTasks).toHaveBeenCalledWith({ status: "NEW" });
    const content = readStructuredContent(result);
    expect(content["status"]).toBe("NEW");
    expect(content["total"]).toBe(3);
    expect(content["returned"]).toBe(2);
    expect(Array.isArray(content["items"])).toBe(true);
    expect((content["items"] as unknown[]).length).toBe(2);
  });

  it("возвращает глобальные профили через orchestrator.list_agent_profiles", async () => {
    apiClientMock.listAgentProfiles.mockResolvedValue({
      items: [
        {
          id: "profile-1",
          name: "reviewer-default",
          role: "reviewer",
          description: "review profile",
          source_policy: "catalog_only",
          is_enabled: true
        }
      ]
    });

    const result = await client.callTool({
      name: "orchestrator.list_agent_profiles",
      arguments: {
        role: "reviewer",
        include_disabled: false,
        limit: 50
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.listAgentProfiles).toHaveBeenCalledWith({
      role: "reviewer",
      include_disabled: false,
      limit: 50
    });
    const content = readStructuredContent(result);
    expect(content["total"]).toBe(1);
    expect(Array.isArray(content["items"])).toBe(true);
  });

  it("использует idempotency_key для детерминированного trace_id в orchestrator.create_task", async () => {
    apiClientMock.createTask.mockResolvedValue({ id: "task-1", status: "NEW" });

    const result = await client.callTool({
      name: "orchestrator.create_task",
      arguments: {
        title: "Smoke task",
        description: "Run smoke",
        project_id: "web-ui",
        agent_profile_id: "profile-1",
        priority: 100,
        idempotency_key: "same-input"
      }
    });

    expect(result.isError).toBeFalsy();
    const [, traceIdArg] = apiClientMock.createTask.mock.calls[0] as [Record<string, unknown>, string];
    expect(traceIdArg.startsWith("mcp-idempotency-")).toBe(true);
    const content = readStructuredContent(result);
    expect(content["trace_id"]).toBe(traceIdArg);
    expect(content["idempotency_key"]).toBe("same-input");
  });

  it("возвращает validation error если create_task вызван без agent_profile_id", async () => {
    const result = await client.callTool({
      name: "orchestrator.create_task",
      arguments: {
        title: "Smoke task",
        description: "Run smoke",
        project_id: "web-ui",
        priority: 100
      }
    });

    expect(result.isError).toBe(true);
    expect(apiClientMock.createTask).not.toHaveBeenCalled();
  });

  it("отменяет задачу через orchestrator.cancel_task", async () => {
    apiClientMock.cancelTask.mockResolvedValue({ id: "task-1", status: "CANCELLED" });

    const result = await client.callTool({
      name: "orchestrator.cancel_task",
      arguments: {
        task_id: "task-1",
        reason: "manual cancel",
        idempotency_key: "cancel-same-input"
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.cancelTask).toHaveBeenCalledTimes(1);
    expect(apiClientMock.cancelTask.mock.calls[0]?.[0]).toBe("task-1");
    expect(apiClientMock.cancelTask.mock.calls[0]?.[1]).toEqual({ reason: "manual cancel" });
    const traceIdArg = apiClientMock.cancelTask.mock.calls[0]?.[2] as string;
    expect(traceIdArg.startsWith("mcp-idempotency-")).toBe(true);
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
  });
});
