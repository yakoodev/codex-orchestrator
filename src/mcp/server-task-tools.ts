import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import { TASK_STATUSES } from "../types";
import {
  asRecord,
  normalizeCreateTaskInput,
  resolveTraceId,
  toToolError,
  toToolSuccess
} from "./server-shared";
import type { RegisterMcpToolOptions } from "./server-shared";

export function registerTaskTools(options: RegisterMcpToolOptions): void {
  const { server, apiClient, authorizeToolCall } = options;

  server.registerTool(
    "orchestrator.list_agents",
    {
      description:
        "Получить доступные agent profiles и capability map оркестратора через текущий REST API."
    },
    async (): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall("orchestrator.list_agents");
        if (authError) {
          return authError;
        }

        const [profilesResponse, capabilitiesResponse] = await Promise.all([
          apiClient.listAgentProfiles({ include_disabled: false, limit: 500 }),
          apiClient.listDelegationCapabilities()
        ]);

        const structuredContent = {
          profiles: profilesResponse.items,
          capabilities: capabilitiesResponse.items,
          totals: {
            profiles: profilesResponse.items.length,
            capabilities: capabilitiesResponse.items.length
          }
        };

        return toToolSuccess(
          `Loaded ${profilesResponse.items.length} profiles and ${capabilitiesResponse.items.length} capabilities`,
          structuredContent
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.list_agent_profiles",
    {
      description:
        "Получить глобальные agent profiles для выбора целевого профиля (role/description/source_policy/status).",
      inputSchema: {
        role: z.string().min(1).optional(),
        include_disabled: z.boolean().optional(),
        limit: z.number().int().min(1).max(500).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall("orchestrator.list_agent_profiles", input);
        if (authError) {
          return authError;
        }

        const response = await apiClient.listAgentProfiles({
          role: input.role?.trim().toLowerCase(),
          include_disabled: input.include_disabled,
          limit: input.limit
        });

        const structuredContent = {
          role: input.role?.trim().toLowerCase() ?? null,
          include_disabled:
            typeof input.include_disabled === "boolean" ? input.include_disabled : true,
          total: response.items.length,
          items: response.items
        };

        return toToolSuccess(`Loaded ${response.items.length} agent profiles`, structuredContent);
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.list_tasks",
    {
      description:
        "Получить задачи оркестратора с опциональным фильтром по статусу и ограничением по количеству.",
      inputSchema: {
        status: z.enum(TASK_STATUSES).optional(),
        limit: z.number().int().min(1).max(500).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall("orchestrator.list_tasks", input);
        if (authError) {
          return authError;
        }

        const { status, limit } = input;
        const tasksResponse = await apiClient.listTasks({ status });
        const limitedItems =
          typeof limit === "number" ? tasksResponse.items.slice(0, limit) : tasksResponse.items;

        const structuredContent = {
          status: status ?? null,
          total: tasksResponse.items.length,
          returned: limitedItems.length,
          truncated: limitedItems.length < tasksResponse.items.length,
          items: limitedItems
        };

        return toToolSuccess(
          `Loaded ${limitedItems.length} task items${status ? ` for status ${status}` : ""}`,
          structuredContent
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.create_task",
    {
      description: "Создать задачу task-first с явным исполнителем (agent_profile_id).",
      inputSchema: {
        title: z.string().min(1),
        description: z.string().min(1),
        project_id: z.string().min(1),
        agent_profile_id: z.string().min(1),
        priority: z.number().int().min(0).max(1_000).optional(),
        trace_id: z.string().min(1).optional(),
        idempotency_key: z.string().min(1).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall("orchestrator.create_task", input);
        if (authError) {
          return authError;
        }

        const traceId = resolveTraceId(input.trace_id, input.idempotency_key);
        const createTaskInput = normalizeCreateTaskInput(input);
        const response = await apiClient.createTask(createTaskInput, traceId);
        const structuredContent = {
          trace_id: traceId,
          idempotency_key: input.idempotency_key ?? null,
          result: asRecord(response)
        };
        return toToolSuccess("Task created", structuredContent);
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.cancel_task",
    {
      description: "Отменить задачу task-first по task_id (best-effort hard-cancel).",
      inputSchema: {
        task_id: z.string().min(1),
        reason: z.string().min(1).nullable().optional(),
        trace_id: z.string().min(1).optional(),
        idempotency_key: z.string().min(1).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall("orchestrator.cancel_task", input);
        if (authError) {
          return authError;
        }

        const traceId = resolveTraceId(input.trace_id, input.idempotency_key);
        const taskId = input.task_id.trim();
        const reason = input.reason === undefined ? undefined : input.reason;
        const response = await apiClient.cancelTask(taskId, { reason }, traceId);

        return toToolSuccess("Task cancelled", {
          trace_id: traceId,
          idempotency_key: input.idempotency_key ?? null,
          result: asRecord(response)
        });
      } catch (error) {
        return toToolError(error);
      }
    }
  );
}
