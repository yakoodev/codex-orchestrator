import { setTimeout as delay } from "node:timers/promises";

export interface AuthProfileListResponse {
  items: Array<Record<string, unknown>>;
}

export interface AgentTemplatesResponse {
  items: Array<Record<string, unknown>>;
}

export interface DelegationCapabilitiesResponse {
  items: Array<Record<string, unknown>>;
}

export interface TasksResponse {
  items: Array<Record<string, unknown>>;
}

export interface McpServersResponse {
  items: Array<Record<string, unknown>>;
}

export interface AgentProfilesResponse {
  items: Array<Record<string, unknown>>;
}

export type AgentRequestType =
  | "mcp_server_attach"
  | "mcp_tool_acl"
  | "script_set"
  | "runtime_dependency"
  | "other";

export type AgentRequestStatus =
  | "open"
  | "in_progress"
  | "resolved_by_agent"
  | "blocked_agent"
  | "resolved_manual"
  | "rejected_manual";

export interface AgentRequestCreateInput {
  type: AgentRequestType;
  priority?: number;
  project_id: string;
  task_id: string;
  agent_run_id?: string | null;
  agent_profile_id?: string | null;
  agent_template_id?: string | null;
  requested_by_agent_id?: string | null;
  title: string;
  reason: string;
  request_payload?: Record<string, unknown> | null;
}

export interface AgentRequestResolveInput {
  status: "in_progress" | "blocked_agent" | "resolved_by_agent" | "resolved_manual" | "rejected_manual";
  resolution_payload?: Record<string, unknown> | null;
  claimed_by_governor_id?: string | null;
  resolved_by?: string | null;
}

export interface AgentRequestsResponse {
  items: Array<Record<string, unknown>>;
}

export interface BindAgentProfileMcpServerInput {
  is_required?: boolean;
  priority?: number;
  config_json?: Record<string, unknown> | null;
}

export type AgentProfileScriptOs = "windows" | "linux" | "macos";
export type AgentProfileScriptType = "instruction" | "shell";

export interface UpsertAgentProfileScriptInput {
  script_type?: AgentProfileScriptType;
  content: string;
}

export interface EvaluateMcpToolAccessInput {
  api_key: string;
  tool_name: string;
  agent_profile_id?: string;
  agent_template_id?: string;
  actor?: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  project_id: string;
  agent_profile_id: string;
  agent_template_id: string;
  priority?: number;
}

export interface HttpOrchestratorApiClientOptions {
  baseUrl: string;
  adminToken: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

export interface OrchestratorApiClient {
  listAgentTemplates(): Promise<AgentTemplatesResponse>;
  listAgentProfiles(options?: {
    role?: string;
    include_disabled?: boolean;
    limit?: number;
  }): Promise<AgentProfilesResponse>;
  listDelegationCapabilities(): Promise<DelegationCapabilitiesResponse>;
  listTasks(options?: { status?: string }): Promise<TasksResponse>;
  createTask(input: CreateTaskRequest, traceId: string): Promise<Record<string, unknown>>;
  cancelTask(
    taskId: string,
    input: {
      reason?: string | null;
    },
    traceId: string
  ): Promise<Record<string, unknown>>;
  createAgentRequest(input: AgentRequestCreateInput, traceId: string): Promise<Record<string, unknown>>;
  listOpenAgentRequests(options?: {
    project_id?: string;
    task_id?: string;
    agent_profile_id?: string;
    agent_template_id?: string;
    type?: AgentRequestType;
    include_in_progress?: boolean;
    limit?: number;
  }): Promise<AgentRequestsResponse>;
  resolveAgentRequest(
    requestId: string,
    input: AgentRequestResolveInput,
    traceId: string
  ): Promise<Record<string, unknown>>;
  listMcpServers(options?: { include_unapproved?: boolean }): Promise<McpServersResponse>;
  bindAgentProfileMcpServer(
    profileId: string,
    serverId: string,
    input: BindAgentProfileMcpServerInput,
    traceId: string
  ): Promise<Record<string, unknown>>;
  upsertAgentProfileScript(
    profileId: string,
    os: AgentProfileScriptOs,
    input: UpsertAgentProfileScriptInput,
    traceId: string
  ): Promise<Record<string, unknown>>;
  evaluateMcpToolAccess(
    input: EvaluateMcpToolAccessInput,
    traceId?: string
  ): Promise<Record<string, unknown>>;
  listAuthProfiles(): Promise<AuthProfileListResponse>;
  getAuthProfileLimits(profileId: string): Promise<Record<string, unknown>>;
}

interface RequestOptions {
  method: "GET" | "POST" | "PUT";
  path: string;
  traceId?: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
}

interface ErrorResponse {
  error?: unknown;
  code?: unknown;
}

export class OrchestratorApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly method: string;
  public readonly path: string;
  public readonly details: unknown;

  constructor(options: {
    error: string;
    code: string;
    statusCode: number;
    method: string;
    path: string;
    details?: unknown;
  }) {
    super(options.error);
    this.name = "OrchestratorApiError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.method = options.method;
    this.path = options.path;
    this.details = options.details ?? null;
  }
}

function normalizeBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim();
  if (!trimmed) {
    throw new Error("MCP_API_BASE_URL is required");
  }

  return trimmed.replace(/\/+$/, "");
}

function parseIntWithFallback(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function maybeErrorResponse(payload: unknown): ErrorResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  return {
    error: candidate["error"],
    code: candidate["code"]
  };
}

function getRetryableErrorCode(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

export function createHttpOrchestratorApiClient(
  options: HttpOrchestratorApiClientOptions
): OrchestratorApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const adminToken = options.adminToken.trim();
  if (!adminToken) {
    throw new Error("MCP_ADMIN_TOKEN (or ADMIN_TOKEN) is required");
  }

  const timeoutMs = Math.max(1_000, parseIntWithFallback(options.timeoutMs, 15_000));
  const maxRetries = Math.max(0, parseIntWithFallback(options.maxRetries, 1));
  const fetchImpl = options.fetchImpl ?? fetch;

  async function requestJson<T>(request: RequestOptions): Promise<T> {
    const url = new URL(request.path, `${baseUrl}/`);
    if (request.query) {
      for (const [key, value] of Object.entries(request.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    let attempt = 0;
    while (true) {
      attempt += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(url, {
          method: request.method,
          headers: {
            "X-Admin-Token": adminToken,
            ...(request.traceId ? { "X-Trace-Id": request.traceId } : {}),
            ...(request.body ? { "Content-Type": "application/json" } : {}),
            "Accept": "application/json"
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
          signal: controller.signal
        });

        const textBody = await response.text();
        let payload: unknown = null;
        if (textBody) {
          try {
            payload = JSON.parse(textBody) as unknown;
          } catch {
            payload = textBody;
          }
        }

        if (!response.ok) {
          const parsedError = maybeErrorResponse(payload);
          const errorMessage =
            typeof parsedError?.error === "string"
              ? parsedError.error
              : `HTTP ${response.status} from ${request.method} ${request.path}`;
          const errorCode =
            typeof parsedError?.code === "string" ? parsedError.code : "UPSTREAM_HTTP_ERROR";

          const apiError = new OrchestratorApiError({
            error: errorMessage,
            code: errorCode,
            statusCode: response.status,
            method: request.method,
            path: request.path,
            details: payload
          });

          if (getRetryableErrorCode(response.status) && attempt <= maxRetries + 1) {
            await delay(Math.min(750, 250 * attempt));
            continue;
          }

          throw apiError;
        }

        if (!payload || typeof payload !== "object") {
          return {} as T;
        }

        return payload as T;
      } catch (error) {
        const isAbortError =
          error instanceof DOMException
            ? error.name === "AbortError"
            : (error as { name?: string } | null)?.name === "AbortError";

        if (isAbortError) {
          const timeoutError = new OrchestratorApiError({
            error: `Timeout after ${timeoutMs}ms for ${request.method} ${request.path}`,
            code: "UPSTREAM_TIMEOUT",
            statusCode: 504,
            method: request.method,
            path: request.path
          });

          if (attempt <= maxRetries + 1) {
            await delay(Math.min(750, 250 * attempt));
            continue;
          }

          throw timeoutError;
        }

        if (error instanceof OrchestratorApiError) {
          throw error;
        }

        const fallbackError = new OrchestratorApiError({
          error: error instanceof Error ? error.message : "Unknown upstream error",
          code: "UPSTREAM_REQUEST_FAILED",
          statusCode: 502,
          method: request.method,
          path: request.path,
          details: error
        });

        if (attempt <= maxRetries + 1) {
          await delay(Math.min(750, 250 * attempt));
          continue;
        }

        throw fallbackError;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  return {
    listAgentTemplates: () =>
      requestJson<AgentTemplatesResponse>({
        method: "GET",
        path: "/api/agents/templates"
      }),

    listAgentProfiles: (listOptions) =>
      requestJson<AgentProfilesResponse>({
        method: "GET",
        path: "/api/agent-profiles",
        query: {
          role: listOptions?.role,
          include_disabled:
            typeof listOptions?.include_disabled === "boolean"
              ? (listOptions.include_disabled ? "true" : "false")
              : undefined,
          limit:
            typeof listOptions?.limit === "number" ? String(listOptions.limit) : undefined
        }
      }),

    listDelegationCapabilities: () =>
      requestJson<DelegationCapabilitiesResponse>({
        method: "GET",
        path: "/api/delegation/capabilities"
      }),

    listTasks: (listOptions) =>
      requestJson<TasksResponse>({
        method: "GET",
        path: "/api/tasks",
        query: {
          status: listOptions?.status
        }
      }),

    createTask: (input, traceId) =>
      requestJson<Record<string, unknown>>({
        method: "POST",
        path: "/api/tasks",
        body: input,
        traceId
      }),

    cancelTask: (taskId, input, traceId) =>
      requestJson<Record<string, unknown>>({
        method: "POST",
        path: `/api/tasks/${encodeURIComponent(taskId)}/cancel`,
        body: input,
        traceId
      }),

    createAgentRequest: (input, traceId) =>
      requestJson<Record<string, unknown>>({
        method: "POST",
        path: "/api/agent-requests",
        body: input,
        traceId
      }),

    listOpenAgentRequests: (listOptions) =>
      requestJson<AgentRequestsResponse>({
        method: "GET",
        path: "/api/agent-requests",
        query: {
          project_id: listOptions?.project_id,
          task_id: listOptions?.task_id,
          agent_profile_id: listOptions?.agent_profile_id,
          agent_template_id: listOptions?.agent_template_id,
          type: listOptions?.type,
          open_pool: "true",
          include_in_progress: listOptions?.include_in_progress ? "true" : undefined,
          limit:
            typeof listOptions?.limit === "number" ? String(listOptions.limit) : undefined
        }
      }),

    resolveAgentRequest: (requestId, input, traceId) =>
      requestJson<Record<string, unknown>>({
        method: "POST",
        path: `/api/agent-requests/${encodeURIComponent(requestId)}/resolve`,
        body: input,
        traceId
      }),

    listMcpServers: (listOptions) =>
      requestJson<McpServersResponse>({
        method: "GET",
        path: "/api/mcp/servers",
        query: {
          include_unapproved: listOptions?.include_unapproved ? "true" : undefined
        }
      }),

    bindAgentProfileMcpServer: (profileId, serverId, input, traceId) =>
      requestJson<Record<string, unknown>>({
        method: "POST",
        path: `/api/agent-profiles/${encodeURIComponent(profileId)}/mcp-servers/${encodeURIComponent(serverId)}`,
        body: input,
        traceId
      }),

    upsertAgentProfileScript: (profileId, os, input, traceId) =>
      requestJson<Record<string, unknown>>({
        method: "PUT",
        path: `/api/agent-profiles/${encodeURIComponent(profileId)}/scripts/${encodeURIComponent(os)}`,
        body: input,
        traceId
      }),

    evaluateMcpToolAccess: (input, traceId) =>
      requestJson<Record<string, unknown>>({
        method: "POST",
        path: "/api/mcp/authz/evaluate",
        body: input,
        traceId
      }),

    listAuthProfiles: () =>
      requestJson<AuthProfileListResponse>({
        method: "GET",
        path: "/api/auth-profiles/chatgpt"
      }),

    getAuthProfileLimits: (profileId) =>
      requestJson<Record<string, unknown>>({
        method: "GET",
        path: `/api/auth-profiles/chatgpt/${encodeURIComponent(profileId)}/limits`
      })
  };
}
