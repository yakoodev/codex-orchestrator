import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type ApiClientMock,
  createMcpHarness,
  readStructuredContent
} from "./helpers/mcp-server-harness";

describe("MCP Governor policies", () => {
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

  it("автоматически привязывает MCP server для mcp_server_attach заявки", async () => {
    apiClientMock.listOpenAgentRequests.mockResolvedValue({
      items: [
        {
          id: "agent-request-attach-1",
          status: "open",
          type: "mcp_server_attach",
          agent_profile_id: "profile-1",
          request_payload: {
            mcp_server_id: "server-browser",
            priority: 40
          }
        }
      ]
    });
    apiClientMock.bindAgentProfileMcpServer.mockResolvedValue({
      id: "binding-1",
      agent_profile_id: "profile-1",
      mcp_server_id: "server-browser",
      priority: 40
    });
    apiClientMock.resolveAgentRequest
      .mockResolvedValueOnce({
        id: "agent-request-attach-1",
        status: "in_progress"
      })
      .mockResolvedValueOnce({
        id: "agent-request-attach-1",
        status: "resolved_by_agent"
      });

    const result = await client.callTool({
      name: "orchestrator.governor_process_open_agent_requests",
      arguments: {
        governor_id: "governor-main"
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.bindAgentProfileMcpServer).toHaveBeenCalledTimes(1);
    expect(apiClientMock.bindAgentProfileMcpServer.mock.calls[0]?.[0]).toBe("profile-1");
    expect(apiClientMock.bindAgentProfileMcpServer.mock.calls[0]?.[1]).toBe("server-browser");
    expect(apiClientMock.bindAgentProfileMcpServer.mock.calls[0]?.[2]).toEqual({
      priority: 40
    });

    expect(apiClientMock.resolveAgentRequest).toHaveBeenCalledTimes(2);
    expect(apiClientMock.resolveAgentRequest.mock.calls[1]?.[1]).toMatchObject({
      status: "resolved_by_agent",
      claimed_by_governor_id: "governor-main",
      resolved_by: "governor-main",
      resolution_payload: expect.objectContaining({
        decision_reason: "mcp_server_attached"
      })
    });
  });

  it("автоматически обновляет script_set для profile через governor policy", async () => {
    apiClientMock.listOpenAgentRequests.mockResolvedValue({
      items: [
        {
          id: "agent-request-script-1",
          status: "open",
          type: "script_set",
          agent_profile_id: "profile-2",
          request_payload: {
            os: "linux",
            script_type: "shell",
            content: "echo smoke"
          }
        }
      ]
    });
    apiClientMock.upsertAgentProfileScript.mockResolvedValue({
      id: "script-1",
      os: "linux",
      script_type: "shell"
    });
    apiClientMock.resolveAgentRequest
      .mockResolvedValueOnce({
        id: "agent-request-script-1",
        status: "in_progress"
      })
      .mockResolvedValueOnce({
        id: "agent-request-script-1",
        status: "resolved_by_agent"
      });

    const result = await client.callTool({
      name: "orchestrator.governor_process_open_agent_requests",
      arguments: {
        governor_id: "governor-main"
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.upsertAgentProfileScript).toHaveBeenCalledTimes(1);
    expect(apiClientMock.upsertAgentProfileScript.mock.calls[0]?.[0]).toBe("profile-2");
    expect(apiClientMock.upsertAgentProfileScript.mock.calls[0]?.[1]).toBe("linux");
    expect(apiClientMock.upsertAgentProfileScript.mock.calls[0]?.[2]).toEqual({
      script_type: "shell",
      content: "echo smoke"
    });
    expect(apiClientMock.resolveAgentRequest.mock.calls[1]?.[1]).toMatchObject({
      status: "resolved_by_agent",
      resolution_payload: expect.objectContaining({
        decision_reason: "script_set_updated"
      })
    });
  });

  it("автоматически обрабатывает mcp_tool_acl через привязку server по tool-name", async () => {
    apiClientMock.listOpenAgentRequests.mockResolvedValue({
      items: [
        {
          id: "agent-request-acl-1",
          status: "open",
          type: "mcp_tool_acl",
          agent_profile_id: "profile-3",
          request_payload: {
            tool_name: "browser.navigate"
          }
        }
      ]
    });
    apiClientMock.listMcpServers.mockResolvedValue({
      items: [{ id: "server-browser", name: "browser-mcp" }]
    });
    apiClientMock.bindAgentProfileMcpServer.mockResolvedValue({
      id: "binding-2",
      agent_profile_id: "profile-3",
      mcp_server_id: "server-browser"
    });
    apiClientMock.resolveAgentRequest
      .mockResolvedValueOnce({
        id: "agent-request-acl-1",
        status: "in_progress"
      })
      .mockResolvedValueOnce({
        id: "agent-request-acl-1",
        status: "resolved_by_agent"
      });

    const result = await client.callTool({
      name: "orchestrator.governor_process_open_agent_requests",
      arguments: {
        governor_id: "governor-main"
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.listMcpServers).toHaveBeenCalledWith({
      include_unapproved: false
    });
    expect(apiClientMock.bindAgentProfileMcpServer).toHaveBeenCalledTimes(1);
    expect(apiClientMock.bindAgentProfileMcpServer.mock.calls[0]?.[0]).toBe("profile-3");
    expect(apiClientMock.bindAgentProfileMcpServer.mock.calls[0]?.[1]).toBe("server-browser");
  });

  it("автоматически обрабатывает runtime_dependency через inferred server binding", async () => {
    apiClientMock.listOpenAgentRequests.mockResolvedValue({
      items: [
        {
          id: "agent-request-runtime-1",
          status: "open",
          type: "runtime_dependency",
          agent_profile_id: "profile-4",
          request_payload: {
            dependency_type: "browser_mcp"
          }
        }
      ]
    });
    apiClientMock.listMcpServers.mockResolvedValue({
      items: [{ id: "server-browser", name: "browser-mcp" }]
    });
    apiClientMock.bindAgentProfileMcpServer.mockResolvedValue({
      id: "binding-3",
      agent_profile_id: "profile-4",
      mcp_server_id: "server-browser"
    });
    apiClientMock.resolveAgentRequest
      .mockResolvedValueOnce({
        id: "agent-request-runtime-1",
        status: "in_progress"
      })
      .mockResolvedValueOnce({
        id: "agent-request-runtime-1",
        status: "resolved_by_agent"
      });

    const result = await client.callTool({
      name: "orchestrator.governor_process_open_agent_requests",
      arguments: {
        governor_id: "governor-main"
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.bindAgentProfileMcpServer).toHaveBeenCalledTimes(1);
    expect(apiClientMock.bindAgentProfileMcpServer.mock.calls[0]?.[0]).toBe("profile-4");
    expect(apiClientMock.bindAgentProfileMcpServer.mock.calls[0]?.[1]).toBe("server-browser");
  });

  it("блокирует mcp_tool_acl без server hints как policy_unavailable", async () => {
    apiClientMock.listOpenAgentRequests.mockResolvedValue({
      items: [
        {
          id: "agent-request-acl-2",
          status: "open",
          type: "mcp_tool_acl",
          agent_profile_id: "profile-5",
          request_payload: {
            tool_name: "unknown.tool"
          }
        }
      ]
    });
    apiClientMock.resolveAgentRequest
      .mockResolvedValueOnce({
        id: "agent-request-acl-2",
        status: "in_progress"
      })
      .mockResolvedValueOnce({
        id: "agent-request-acl-2",
        status: "blocked_agent"
      });

    const result = await client.callTool({
      name: "orchestrator.governor_process_open_agent_requests",
      arguments: {
        governor_id: "governor-main"
      }
    });

    expect(result.isError).toBeFalsy();
    expect(apiClientMock.bindAgentProfileMcpServer).not.toHaveBeenCalled();
    expect(apiClientMock.resolveAgentRequest.mock.calls[1]?.[1]).toMatchObject({
      status: "blocked_agent",
      resolution_payload: expect.objectContaining({
        decision_reason: "mcp_tool_acl_policy_unavailable"
      })
    });
  });
});
