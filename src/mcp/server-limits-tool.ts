import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import { OrchestratorApiError } from "./api-client";
import {
  asStringValue,
  extractProfileSummary,
  toToolError,
  toToolSuccess
} from "./server-shared";
import type { RegisterMcpToolOptions } from "./server-shared";

export function registerLimitsTool(options: RegisterMcpToolOptions): void {
  const { server, apiClient, authorizeToolCall } = options;

  server.registerTool(
    "orchestrator.get_limits",
    {
      description:
        "Получить live rate limits по конкретному auth profile или по набору профилей (fleet snapshot).",
      inputSchema: {
        profile_id: z.string().min(1).optional(),
        include_inactive: z.boolean().optional(),
        limit_profiles: z.number().int().min(1).max(100).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall("orchestrator.get_limits", input);
        if (authError) {
          return authError;
        }

        const profileId = asStringValue(input.profile_id);
        if (profileId) {
          const limits = await apiClient.getAuthProfileLimits(profileId);
          return toToolSuccess(`Loaded limits for profile ${profileId}`, {
            requested_profiles: 1,
            successful_profiles: 1,
            failed_profiles: 0,
            items: [limits],
            errors: []
          });
        }

        const includeInactive = input.include_inactive ?? true;
        const profilesResponse = await apiClient.listAuthProfiles();
        const profiles = profilesResponse.items
          .map((item) => ({
            raw: item,
            profile: extractProfileSummary(item)
          }))
          .filter(
            (
              item
            ): item is {
              raw: Record<string, unknown>;
              profile: { id: string; label: string | null; status: string | null };
            } => item.profile !== null
          )
          .filter((item) => includeInactive || item.profile.status === "active")
          .slice(0, input.limit_profiles ?? profilesResponse.items.length);

        const limitsResults = await Promise.all(
          profiles.map(async ({ raw, profile }) => {
            try {
              const limits = await apiClient.getAuthProfileLimits(profile.id);
              return {
                ok: true as const,
                item: { profile, limits, profile_raw: raw }
              };
            } catch (error) {
              return { ok: false as const, error, profile };
            }
          })
        );

        const items = limitsResults.filter((result) => result.ok).map((result) => result.item);
        const errors = limitsResults
          .filter(
            (
              result
            ): result is {
              ok: false;
              error: unknown;
              profile: { id: string; label: string | null; status: string | null };
            } => !result.ok
          )
          .map((result) => {
            if (result.error instanceof OrchestratorApiError) {
              return {
                profile_id: result.profile.id,
                profile_label: result.profile.label,
                profile_status: result.profile.status,
                error: result.error.message,
                code: result.error.code,
                status_code: result.error.statusCode
              };
            }

            return {
              profile_id: result.profile.id,
              profile_label: result.profile.label,
              profile_status: result.profile.status,
              error: result.error instanceof Error ? result.error.message : "Unknown limits error",
              code: "INTERNAL_ERROR"
            };
          });

        return toToolSuccess(`Loaded limits for ${items.length}/${profiles.length} profiles`, {
          requested_profiles: profiles.length,
          successful_profiles: items.length,
          failed_profiles: errors.length,
          items,
          errors
        });
      } catch (error) {
        return toToolError(error);
      }
    }
  );
}
