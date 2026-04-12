import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHttpOrchestratorApiClient } from "./api-client";
import { createOrchestratorMcpServer } from "./server";

interface McpRuntimeConfig {
  apiBaseUrl: string;
  adminToken: string;
  mcpApiKey: string | null;
  agentProfileId: string | null;
  serverName: string;
  serverVersion: string;
  requestTimeoutMs: number;
  maxRetries: number;
}

function readInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function loadMcpRuntimeConfig(env: NodeJS.ProcessEnv = process.env): McpRuntimeConfig {
  const adminToken = env["MCP_ADMIN_TOKEN"]?.trim() || env["ADMIN_TOKEN"]?.trim() || "";
  if (!adminToken) {
    throw new Error("MCP_ADMIN_TOKEN (or ADMIN_TOKEN) is required for MCP bridge startup");
  }

  return {
    apiBaseUrl:
      env["MCP_API_BASE_URL"]?.trim() ||
      env["ORCHESTRATOR_API_BASE_URL"]?.trim() ||
      "http://localhost:8080",
    adminToken,
    mcpApiKey: env["MCP_API_KEY"]?.trim() || null,
    agentProfileId: env["MCP_AGENT_PROFILE_ID"]?.trim() || null,
    serverName: env["MCP_SERVER_NAME"]?.trim() || "codex-orchestrator-mcp",
    serverVersion: env["MCP_SERVER_VERSION"]?.trim() || "0.1.0",
    requestTimeoutMs: Math.max(1_000, readInt(env["MCP_REQUEST_TIMEOUT_MS"], 15_000)),
    maxRetries: Math.max(0, readInt(env["MCP_API_MAX_RETRIES"], 1))
  };
}

async function main(): Promise<void> {
  const config = loadMcpRuntimeConfig();
  const apiClient = createHttpOrchestratorApiClient({
    baseUrl: config.apiBaseUrl,
    adminToken: config.adminToken,
    timeoutMs: config.requestTimeoutMs,
    maxRetries: config.maxRetries
  });

  const server = createOrchestratorMcpServer({
    apiClient,
    serverName: config.serverName,
    serverVersion: config.serverVersion,
    authz: {
      mcp_api_key: config.mcpApiKey ?? undefined,
      agent_profile_id: config.agentProfileId ?? undefined,
      actor: "mcp_bridge"
    }
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);

  let isShuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    await Promise.allSettled([server.close(), transport.close()]);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });

  console.error(
    `[MCP] ${config.serverName}@${config.serverVersion} started, upstream=${config.apiBaseUrl}, authz=${config.mcpApiKey ? "enabled" : "legacy-admin-only"}`
  );
}

void main().catch((error) => {
  console.error("[MCP] Failed to start server", error);
  process.exit(1);
});
