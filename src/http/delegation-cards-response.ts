import type { DelegationRequestEntity, Persistence } from "../runtime/contracts";

const MAX_DELEGATION_LOG_LENGTH = 12_000;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimToLimit(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function extractDelegationPrompt(payload: Record<string, unknown>): string | null {
  const prompt = asNonEmptyString(payload["prompt"]);
  if (prompt) {
    return prompt;
  }

  return asNonEmptyString(payload["task"]);
}

export async function buildDelegationCardsResponse(options: {
  persistence: Persistence;
  limit: number;
}): Promise<{
  preparing: Record<string, unknown>[];
  running: Record<string, unknown>[];
  recent: Record<string, unknown>[];
}> {
  const [delegations, agentProfiles, fallbackActiveProfile] = await Promise.all([
    options.persistence.listDelegationRequests({ limit: options.limit }),
    options.persistence.listAgentProfiles({ include_disabled: true, limit: 500 }),
    options.persistence.getActiveAuthProfile()
  ]);

  const agentProfileMap = new Map(agentProfiles.map((profile) => [profile.id, profile]));

  const profileIds = new Set<string>();
  for (const delegation of delegations) {
    const profileId = delegation.selected_auth_profile_id;
    if (profileId) {
      profileIds.add(profileId);
    }
  }

  const profileMap = new Map<
    string,
    Awaited<ReturnType<Persistence["getAuthProfileRuntimeById"]>>
  >();
  await Promise.all(
    Array.from(profileIds).map(async (profileId) => {
      const profile = await options.persistence.getAuthProfileRuntimeById(profileId);
      if (profile) {
        profileMap.set(profileId, profile);
      }
    })
  );

  const toCard = (delegation: DelegationRequestEntity): Record<string, unknown> => {
    const targetProfile = delegation.target_agent_profile_id
      ? agentProfileMap.get(delegation.target_agent_profile_id) ?? null
      : null;

    const selectedProfileId = delegation.selected_auth_profile_id;
    const selectedProfile = selectedProfileId ? profileMap.get(selectedProfileId) ?? null : null;
    const fallbackProfile =
      !selectedProfile && fallbackActiveProfile
        ? {
            id: fallbackActiveProfile.id,
            label: fallbackActiveProfile.label,
            status: fallbackActiveProfile.status
          }
        : null;
    const account = selectedProfile ?? fallbackProfile;

    const prompt = delegation.input_prompt ?? extractDelegationPrompt(delegation.payload);
    const rawLog = delegation.execution_log ?? delegation.result_summary ?? null;
    const logPreview = rawLog ? trimToLimit(rawLog, MAX_DELEGATION_LOG_LENGTH) : null;

    return {
      id: delegation.id,
      status: delegation.status,
      capability: delegation.capability,
      prompt,
      trace_id: delegation.trace_id,
      created_at: delegation.created_at,
      started_at: delegation.started_at,
      ended_at: delegation.ended_at,
      target_profile: targetProfile
        ? {
            id: targetProfile.id,
            name: targetProfile.name,
            role: targetProfile.role,
            model: targetProfile.model
          }
        : null,
      account: account
        ? {
            id: account.id,
            label: account.label,
            status: account.status
          }
        : null,
      execution_mode: delegation.execution_mode,
      log_preview: logPreview
    };
  };

  const preparingStatuses: DelegationRequestEntity["status"][] = ["requested", "accepted"];
  const runningStatuses: DelegationRequestEntity["status"][] = ["running"];
  const recentStatuses: DelegationRequestEntity["status"][] = ["completed", "failed", "cancelled"];

  return {
    preparing: delegations
      .filter((delegation) => preparingStatuses.includes(delegation.status))
      .map((delegation) => toCard(delegation)),
    running: delegations
      .filter((delegation) => runningStatuses.includes(delegation.status))
      .map((delegation) => toCard(delegation)),
    recent: delegations
      .filter((delegation) => recentStatuses.includes(delegation.status))
      .slice(0, 20)
      .map((delegation) => toCard(delegation))
  };
}

