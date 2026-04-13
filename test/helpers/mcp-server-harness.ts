import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { vi } from "vitest";
import {
  OrchestratorApiError,
  type OrchestratorApiClient
} from "../../src/mcp/api-client";
import { createOrchestratorMcpServer } from "../../src/mcp/server";

export interface ApiClientMock extends OrchestratorApiClient {
  listAgentTemplates: ReturnType<typeof vi.fn>;
  listAgentProfiles: ReturnType<typeof vi.fn>;
  listDelegationCapabilities: ReturnType<typeof vi.fn>;
  listTasks: ReturnType<typeof vi.fn>;
  createTask: ReturnType<typeof vi.fn>;
  cancelTask: ReturnType<typeof vi.fn>;
  createAgentRequest: ReturnType<typeof vi.fn>;
  listOpenAgentRequests: ReturnType<typeof vi.fn>;
  resolveAgentRequest: ReturnType<typeof vi.fn>;
  listMcpServers: ReturnType<typeof vi.fn>;
  bindAgentProfileMcpServer: ReturnType<typeof vi.fn>;
  upsertAgentProfileScript: ReturnType<typeof vi.fn>;
  evaluateMcpToolAccess: ReturnType<typeof vi.fn>;
  listAuthProfiles: ReturnType<typeof vi.fn>;
  getAuthProfileLimits: ReturnType<typeof vi.fn>;
}

export function createApiClientMock(): ApiClientMock {
  return {
    listAgentTemplates: vi.fn(),
    listAgentProfiles: vi.fn(),
    listDelegationCapabilities: vi.fn(),
    listTasks: vi.fn(),
    createTask: vi.fn(),
    cancelTask: vi.fn(),
    createAgentRequest: vi.fn(),
    listOpenAgentRequests: vi.fn(),
    resolveAgentRequest: vi.fn(),
    listMcpServers: vi.fn(),
    bindAgentProfileMcpServer: vi.fn(),
    upsertAgentProfileScript: vi.fn(),
    evaluateMcpToolAccess: vi.fn(),
    listAuthProfiles: vi.fn(),
    getAuthProfileLimits: vi.fn()
  };
}

export interface McpHarness {
  apiClientMock: ApiClientMock;
  server: ReturnType<typeof createOrchestratorMcpServer>;
  client: Client;
  close: () => Promise<void>;
}

export async function createMcpHarness(options?: {
  authz?: {
    mcp_api_key?: string;
    agent_profile_id?: string;
    actor?: string;
  };
}): Promise<McpHarness> {
  const apiClientMock = createApiClientMock();
  const server = createOrchestratorMcpServer({
    apiClient: apiClientMock,
    serverName: "test-mcp",
    serverVersion: "1.0.0",
    authz: options?.authz
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    apiClientMock,
    server,
    client,
    close: async () => {
      await Promise.allSettled([client.close(), server.close()]);
    }
  };
}

type CallToolResult = Awaited<ReturnType<Client["callTool"]>>;

export function readStructuredContent(result: CallToolResult): Record<string, unknown> {
  if (!("structuredContent" in result) || !result.structuredContent) {
    throw new Error("structuredContent is missing");
  }

  if (typeof result.structuredContent !== "object" || Array.isArray(result.structuredContent)) {
    throw new Error("structuredContent must be an object");
  }

  return result.structuredContent as Record<string, unknown>;
}

export function readErrorPayload(result: CallToolResult): Record<string, unknown> {
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

export { OrchestratorApiError };
