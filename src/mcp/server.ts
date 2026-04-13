import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { OrchestratorApiClient } from "./api-client";
import { registerAgentRequestTools } from "./server-agent-request-tools";
import { registerLimitsTool } from "./server-limits-tool";
import {
  asRecord,
  asStringValue,
  toToolError,
  type AuthorizeToolCall
} from "./server-shared";
import { registerTaskTools } from "./server-task-tools";

export interface CreateOrchestratorMcpServerOptions {
  apiClient: OrchestratorApiClient;
  serverName?: string;
  serverVersion?: string;
  authz?: {
    mcp_api_key?: string;
    agent_profile_id?: string;
    actor?: string;
  };
}

const DEFAULT_SERVER_NAME = "codex-orchestrator-mcp";
const DEFAULT_SERVER_VERSION = "0.1.0";

export function createOrchestratorMcpServer(
  options: CreateOrchestratorMcpServerOptions
): McpServer {
  const server = new McpServer({
    name: options.serverName ?? DEFAULT_SERVER_NAME,
    version: options.serverVersion ?? DEFAULT_SERVER_VERSION
  });

  const authzApiKey = asStringValue(options.authz?.mcp_api_key);
  const authzAgentProfileId = asStringValue(options.authz?.agent_profile_id);
  const authzActor = asStringValue(options.authz?.actor) ?? "mcp_bridge";

  const authorizeToolCall: AuthorizeToolCall = async (
    toolName: string,
    toolInput?: unknown
  ): Promise<CallToolResult | null> => {
    if (!authzApiKey) {
      return null;
    }

    const inputRecord = asRecord(toolInput);
    const traceId = asStringValue(inputRecord["trace_id"]) ?? randomUUID();

    try {
      await options.apiClient.evaluateMcpToolAccess(
        {
          api_key: authzApiKey,
          tool_name: toolName,
          agent_profile_id: authzAgentProfileId ?? undefined,
          actor: authzActor
        },
        traceId
      );
      return null;
    } catch (error) {
      return toToolError(error);
    }
  };

  const registerOptions = {
    server,
    apiClient: options.apiClient,
    authorizeToolCall
  };

  registerTaskTools(registerOptions);
  registerAgentRequestTools(registerOptions);
  registerLimitsTool(registerOptions);

  return server;
}
