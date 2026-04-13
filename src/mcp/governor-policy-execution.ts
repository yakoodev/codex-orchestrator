import type { BindAgentProfileMcpServerInput, OrchestratorApiClient } from "./api-client";
import { OrchestratorApiError } from "./api-client";
import type { GovernorDecision } from "./governor-policy";
import {
  asAgentProfileScriptOs,
  asAgentProfileScriptType,
  asBooleanValue,
  asRecord,
  asIntegerValue,
  asStringValue,
  extractRuntimeDependencyKey,
  getAgentRequestPayload,
  hasMcpServerHint,
  hasScriptSetHint,
  inferServerNameFromRuntimeDependency,
  inferServerNameFromToolName,
  mapGovernorError,
  RUNTIME_DEPENDENCY_SCRIPT_HINTS,
  withAgentRequestPayload
} from "./governor-policy";

async function executeMcpServerAttachPolicy(
  apiClient: OrchestratorApiClient,
  request: Record<string, unknown>,
  traceId: string
): Promise<GovernorDecision> {
  const requestPayload = getAgentRequestPayload(request);
  const profileId =
    asStringValue(request["agent_profile_id"]) ??
    asStringValue(requestPayload["agent_profile_id"]) ??
    asStringValue(requestPayload["profile_id"]);

  if (!profileId) {
    return {
      finalStatus: "blocked_agent",
      reason: "agent_profile_id_required"
    };
  }

  const requestedServerId =
    asStringValue(requestPayload["mcp_server_id"]) ?? asStringValue(requestPayload["server_id"]);
  const requestedServerName =
    asStringValue(requestPayload["mcp_server_name"]) ?? asStringValue(requestPayload["server_name"]);
  const includeUnapproved =
    asBooleanValue(requestPayload["include_unapproved"]) ??
    asBooleanValue(requestPayload["allow_unapproved"]) ??
    false;

  let resolvedServerId = requestedServerId;
  let resolvedServerName: string | null = null;

  if (!resolvedServerId) {
    if (!requestedServerName) {
      return {
        finalStatus: "blocked_agent",
        reason: "mcp_server_id_or_name_required",
        metadata: {
          profile_id: profileId
        }
      };
    }

    const servers = await apiClient.listMcpServers({
      include_unapproved: includeUnapproved
    });
    const match = servers.items.find((server) => {
      const serverRecord = asRecord(server);
      const name = asStringValue(serverRecord["name"]);
      return name === requestedServerName;
    });

    if (!match) {
      return {
        finalStatus: "blocked_agent",
        reason: "mcp_server_not_found",
        metadata: {
          profile_id: profileId,
          requested_server_name: requestedServerName,
          include_unapproved: includeUnapproved
        }
      };
    }

    const matchRecord = asRecord(match);
    resolvedServerId = asStringValue(matchRecord["id"]);
    resolvedServerName = asStringValue(matchRecord["name"]);
    if (!resolvedServerId) {
      return {
        finalStatus: "blocked_agent",
        reason: "mcp_server_missing_id",
        metadata: {
          profile_id: profileId,
          requested_server_name: requestedServerName
        }
      };
    }
  }

  const priorityCandidate = requestPayload["priority"];
  let priority: number | undefined;
  if (priorityCandidate !== undefined) {
    const parsedPriority = asIntegerValue(priorityCandidate);
    if (parsedPriority === null || parsedPriority < 0 || parsedPriority > 1_000) {
      return {
        finalStatus: "blocked_agent",
        reason: "invalid_priority",
        metadata: {
          profile_id: profileId,
          server_id: resolvedServerId
        }
      };
    }
    priority = parsedPriority;
  }

  const isRequiredCandidate = requestPayload["is_required"];
  const parsedIsRequired =
    isRequiredCandidate === undefined ? undefined : asBooleanValue(isRequiredCandidate);
  if (isRequiredCandidate !== undefined && parsedIsRequired === null) {
    return {
      finalStatus: "blocked_agent",
      reason: "invalid_is_required",
      metadata: {
        profile_id: profileId,
        server_id: resolvedServerId
      }
    };
  }
  const isRequired = parsedIsRequired ?? undefined;

  const configCandidate = requestPayload["config_json"];
  let configJson: Record<string, unknown> | null | undefined;
  if (configCandidate !== undefined) {
    if (configCandidate === null) {
      configJson = null;
    } else if (
      typeof configCandidate === "object" &&
      !Array.isArray(configCandidate)
    ) {
      configJson = configCandidate as Record<string, unknown>;
    } else {
      return {
        finalStatus: "blocked_agent",
        reason: "invalid_config_json",
        metadata: {
          profile_id: profileId,
          server_id: resolvedServerId
        }
      };
    }
  }

  const bindInput: BindAgentProfileMcpServerInput = {
    ...(isRequired === undefined ? {} : { is_required: isRequired }),
    ...(priority === undefined ? {} : { priority }),
    ...(configJson === undefined ? {} : { config_json: configJson })
  };

  try {
    const binding = await apiClient.bindAgentProfileMcpServer(
      profileId,
      resolvedServerId,
      bindInput,
      traceId
    );

    return {
      finalStatus: "resolved_by_agent",
      reason: "mcp_server_attached",
      metadata: {
        profile_id: profileId,
        server_id: resolvedServerId,
        server_name: resolvedServerName ?? requestedServerName ?? null,
        binding
      }
    };
  } catch (error) {
    if (
      error instanceof OrchestratorApiError &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return {
        finalStatus: "blocked_agent",
        reason: "mcp_server_attach_rejected",
        metadata: {
          profile_id: profileId,
          server_id: resolvedServerId,
          server_name: resolvedServerName ?? requestedServerName ?? null,
          error: mapGovernorError(error)
        }
      };
    }

    throw error;
  }
}

async function executeScriptSetPolicy(
  apiClient: OrchestratorApiClient,
  request: Record<string, unknown>,
  traceId: string
): Promise<GovernorDecision> {
  const requestPayload = getAgentRequestPayload(request);
  const profileId =
    asStringValue(request["agent_profile_id"]) ??
    asStringValue(requestPayload["agent_profile_id"]) ??
    asStringValue(requestPayload["profile_id"]);
  if (!profileId) {
    return {
      finalStatus: "blocked_agent",
      reason: "agent_profile_id_required"
    };
  }

  const os = asAgentProfileScriptOs(requestPayload["os"]);
  if (!os) {
    return {
      finalStatus: "blocked_agent",
      reason: "script_os_required",
      metadata: {
        profile_id: profileId
      }
    };
  }

  const content = asStringValue(requestPayload["content"]);
  if (!content) {
    return {
      finalStatus: "blocked_agent",
      reason: "script_content_required",
      metadata: {
        profile_id: profileId,
        os
      }
    };
  }

  const scriptTypeCandidate = requestPayload["script_type"];
  const scriptType =
    scriptTypeCandidate === undefined ? undefined : asAgentProfileScriptType(scriptTypeCandidate);
  if (scriptTypeCandidate !== undefined && !scriptType) {
    return {
      finalStatus: "blocked_agent",
      reason: "invalid_script_type",
      metadata: {
        profile_id: profileId,
        os
      }
    };
  }

  try {
    const script = await apiClient.upsertAgentProfileScript(
      profileId,
      os,
      {
        ...(scriptType ? { script_type: scriptType } : {}),
        content
      },
      traceId
    );
    return {
      finalStatus: "resolved_by_agent",
      reason: "script_set_updated",
      metadata: {
        profile_id: profileId,
        os,
        script
      }
    };
  } catch (error) {
    if (
      error instanceof OrchestratorApiError &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return {
        finalStatus: "blocked_agent",
        reason: "script_set_rejected",
        metadata: {
          profile_id: profileId,
          os,
          error: mapGovernorError(error)
        }
      };
    }

    throw error;
  }
}

async function executeMcpToolAclPolicy(
  apiClient: OrchestratorApiClient,
  request: Record<string, unknown>,
  traceId: string
): Promise<GovernorDecision> {
  const requestPayload = getAgentRequestPayload(request);
  const toolName = asStringValue(requestPayload["tool_name"]);
  let patchedRequest = request;

  if (!hasMcpServerHint(requestPayload)) {
    const inferredServerName = inferServerNameFromToolName(toolName);
    if (!inferredServerName) {
      return {
        finalStatus: "blocked_agent",
        reason: "mcp_tool_acl_policy_unavailable",
        metadata: {
          tool_name: toolName,
          hint: "Provide mcp_server_id/mcp_server_name or supported tool prefix"
        }
      };
    }

    patchedRequest = withAgentRequestPayload(request, {
      mcp_server_name: inferredServerName
    });
  }

  const attachDecision = await executeMcpServerAttachPolicy(apiClient, patchedRequest, traceId);
  if (attachDecision.finalStatus === "resolved_by_agent") {
    return {
      finalStatus: "resolved_by_agent",
      reason: "mcp_tool_acl_satisfied_by_server_attach",
      metadata: {
        tool_name: toolName,
        attach_result: attachDecision.metadata ?? null
      }
    };
  }

  return {
    finalStatus: "blocked_agent",
    reason: "mcp_tool_acl_blocked_server_attach",
    metadata: {
      tool_name: toolName,
      attach_result: attachDecision.metadata ?? null
    }
  };
}

async function executeRuntimeDependencyPolicy(
  apiClient: OrchestratorApiClient,
  request: Record<string, unknown>,
  traceId: string
): Promise<GovernorDecision> {
  const requestPayload = getAgentRequestPayload(request);
  const dependencyKey = extractRuntimeDependencyKey(requestPayload);

  if (hasMcpServerHint(requestPayload)) {
    const attachDecision = await executeMcpServerAttachPolicy(apiClient, request, traceId);
    return attachDecision.finalStatus === "resolved_by_agent"
      ? {
          finalStatus: "resolved_by_agent",
          reason: "runtime_dependency_satisfied_by_mcp_server",
          metadata: {
            dependency: dependencyKey,
            attach_result: attachDecision.metadata ?? null
          }
        }
      : {
          finalStatus: "blocked_agent",
          reason: "runtime_dependency_blocked_mcp_server",
          metadata: {
            dependency: dependencyKey,
            attach_result: attachDecision.metadata ?? null
          }
        };
  }

  if ((dependencyKey && RUNTIME_DEPENDENCY_SCRIPT_HINTS.has(dependencyKey)) || hasScriptSetHint(requestPayload)) {
    const scriptDecision = await executeScriptSetPolicy(apiClient, request, traceId);
    return scriptDecision.finalStatus === "resolved_by_agent"
      ? {
          finalStatus: "resolved_by_agent",
          reason: "runtime_dependency_satisfied_by_script_set",
          metadata: {
            dependency: dependencyKey,
            script_result: scriptDecision.metadata ?? null
          }
        }
      : {
          finalStatus: "blocked_agent",
          reason: "runtime_dependency_blocked_script_set",
          metadata: {
            dependency: dependencyKey,
            script_result: scriptDecision.metadata ?? null
          }
        };
  }

  const inferredServerName = inferServerNameFromRuntimeDependency(requestPayload);
  if (inferredServerName) {
    const attachDecision = await executeMcpServerAttachPolicy(
      apiClient,
      withAgentRequestPayload(request, { mcp_server_name: inferredServerName }),
      traceId
    );
    return attachDecision.finalStatus === "resolved_by_agent"
      ? {
          finalStatus: "resolved_by_agent",
          reason: "runtime_dependency_satisfied_by_inferred_server",
          metadata: {
            dependency: dependencyKey,
            inferred_server_name: inferredServerName,
            attach_result: attachDecision.metadata ?? null
          }
        }
      : {
          finalStatus: "blocked_agent",
          reason: "runtime_dependency_blocked_inferred_server",
          metadata: {
            dependency: dependencyKey,
            inferred_server_name: inferredServerName,
            attach_result: attachDecision.metadata ?? null
          }
      };
  }

  if (asBooleanValue(requestPayload["governor_auto_resolve"]) === true) {
    return {
      finalStatus: "resolved_by_agent",
      reason: "explicit_auto_resolve_flag",
      metadata: {
        dependency: dependencyKey
      }
    };
  }

  return {
    finalStatus: "blocked_agent",
    reason: "runtime_dependency_policy_unavailable",
    metadata: {
      dependency: dependencyKey
    }
  };
}

export async function executeGovernorDecision(
  apiClient: OrchestratorApiClient,
  request: Record<string, unknown>,
  decision: GovernorDecision,
  traceId: string
): Promise<GovernorDecision> {
  if (decision.finalStatus !== "resolved_by_agent") {
    return decision;
  }

  if (decision.reason === "policy_mcp_server_attach") {
    return executeMcpServerAttachPolicy(apiClient, request, traceId);
  }

  if (decision.reason === "policy_script_set") {
    return executeScriptSetPolicy(apiClient, request, traceId);
  }

  if (decision.reason === "policy_mcp_tool_acl") {
    return executeMcpToolAclPolicy(apiClient, request, traceId);
  }

  if (decision.reason === "policy_runtime_dependency") {
    return executeRuntimeDependencyPolicy(apiClient, request, traceId);
  }

  return decision;
}

