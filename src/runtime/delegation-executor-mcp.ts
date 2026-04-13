import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config";
import { DelegationExecutionFailure } from "./delegation-executor-utils";
import {
  asBoolean,
  asNonEmptyString,
  asStringArray,
  asStringRecord,
  isPlainObject,
  parseShellLikeCommand
} from "./delegation-executor-utils";

const ORCHESTRATOR_MCP_SERVER_NAME = "orchestrator-core";
const ORCHESTRATOR_MCP_ENDPOINT = "orchestrator://core";

interface DelegationPayloadMcpServer {
  name: string;
  transport: "stdio" | "http";
  endpoint_or_command: string;
  is_required: boolean;
  priority: number;
  config_json: Record<string, unknown> | null;
}

export interface RuntimeMcpServerConfig {
  key: string;
  name: string;
  transport: "stdio" | "http";
  command: string | null;
  args: string[];
  url: string | null;
  env: Record<string, string>;
}

function getPayloadAgentProfileId(payload: Record<string, unknown>): string | null {
  const directId = asNonEmptyString(payload["agent_profile_id"]);
  if (directId) {
    return directId;
  }

  const context = payload["agent_profile_context"];
  if (!isPlainObject(context)) {
    return null;
  }

  return asNonEmptyString(context["profile_id"]);
}

function getPayloadMcpServers(payload: Record<string, unknown>): DelegationPayloadMcpServer[] {
  const context = payload["agent_profile_context"];
  if (!isPlainObject(context)) {
    return [];
  }

  const rawServers = context["mcp_servers"];
  if (!Array.isArray(rawServers)) {
    return [];
  }

  const servers: DelegationPayloadMcpServer[] = [];
  for (const rawServer of rawServers) {
    if (!isPlainObject(rawServer)) {
      continue;
    }

    const name = asNonEmptyString(rawServer["name"]);
    const transportRaw = asNonEmptyString(rawServer["transport"])?.toLowerCase();
    const endpoint = asNonEmptyString(rawServer["endpoint_or_command"]);
    if (!name || !endpoint || (transportRaw !== "stdio" && transportRaw !== "http")) {
      continue;
    }

    const configCandidate = rawServer["config_json"];
    servers.push({
      name,
      transport: transportRaw,
      endpoint_or_command: endpoint,
      is_required: rawServer["is_required"] === true,
      priority:
        typeof rawServer["priority"] === "number" && Number.isFinite(rawServer["priority"])
          ? rawServer["priority"]
          : 100,
      config_json: isPlainObject(configCandidate) ? configCandidate : null
    });
  }

  return servers.sort((left, right) => {
    if (left.priority === right.priority) {
      return left.name.localeCompare(right.name);
    }
    return left.priority - right.priority;
  });
}

function toTomlSectionKey(name: string, index: number, used: Set<string>): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `server_${index + 1}`;
  const normalized = /^[a-z]/.test(base) ? base : `s_${base}`;
  if (!used.has(normalized)) {
    used.add(normalized);
    return normalized;
  }

  let suffix = 2;
  while (used.has(`${normalized}_${suffix}`)) {
    suffix += 1;
  }
  const key = `${normalized}_${suffix}`;
  used.add(key);
  return key;
}

function escapeTomlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveOrchestratorMcpCommand(
  configJson: Record<string, unknown> | null
): Promise<{ command: string; args: string[] }> {
  const overrideCommand = asNonEmptyString(configJson?.["command"]);
  const overrideArgs = asStringArray(configJson?.["args"]) ?? [];
  if (overrideCommand) {
    return { command: overrideCommand, args: overrideArgs };
  }

  const distEntrypoint = path.resolve(process.cwd(), "dist", "mcp", "index.js");
  if (await pathExists(distEntrypoint)) {
    return { command: process.execPath, args: [distEntrypoint] };
  }

  const srcEntrypoint = path.resolve(process.cwd(), "src", "mcp", "index.ts");
  if (await pathExists(srcEntrypoint)) {
    return { command: "npx", args: ["tsx", srcEntrypoint] };
  }

  throw new DelegationExecutionFailure(
    "EXECUTION_FAILED",
    "Unable to resolve orchestrator MCP bridge entrypoint (dist/src not found)"
  );
}

function buildOrchestratorMcpEnv(options: {
  config: AppConfig;
  profileId: string;
  configJson: Record<string, unknown> | null;
}): Record<string, string> {
  const env: Record<string, string> = {
    MCP_ADMIN_TOKEN: options.config.adminToken,
    MCP_API_BASE_URL:
      asNonEmptyString(options.configJson?.["api_base_url"]) ??
      asNonEmptyString(process.env["MCP_API_BASE_URL"]) ??
      asNonEmptyString(process.env["ORCHESTRATOR_API_BASE_URL"]) ??
      `http://127.0.0.1:${options.config.port}`
  };

  env["MCP_AGENT_PROFILE_ID"] = options.profileId;

  const mcpApiKey =
    asNonEmptyString(options.configJson?.["mcp_api_key"]) ??
    asNonEmptyString(options.configJson?.["api_key"]);
  if (mcpApiKey) {
    env["MCP_API_KEY"] = mcpApiKey;
  }

  const requestTimeoutMs = asNonEmptyString(options.configJson?.["request_timeout_ms"]);
  if (requestTimeoutMs) {
    env["MCP_REQUEST_TIMEOUT_MS"] = requestTimeoutMs;
  }
  const maxRetries = asNonEmptyString(options.configJson?.["api_max_retries"]);
  if (maxRetries) {
    env["MCP_API_MAX_RETRIES"] = maxRetries;
  }

  return {
    ...env,
    ...asStringRecord(options.configJson?.["env"])
  };
}

export async function buildRuntimeMcpServers(options: {
  payload: Record<string, unknown>;
  config: AppConfig;
  profileId: string;
}): Promise<RuntimeMcpServerConfig[]> {
  const servers = getPayloadMcpServers(options.payload);
  if (servers.length === 0) {
    return [];
  }

  const profileId = getPayloadAgentProfileId(options.payload) ?? options.profileId;
  const sectionKeys = new Set<string>();
  const resolved: RuntimeMcpServerConfig[] = [];

  for (let index = 0; index < servers.length; index += 1) {
    const server = servers[index];
    if (!server) {
      continue;
    }

    const enabled = asBoolean(server.config_json?.["enabled"]);
    if (enabled === false) {
      continue;
    }

    const key = toTomlSectionKey(server.name, index, sectionKeys);

    if (server.transport === "http") {
      const url = asNonEmptyString(server.config_json?.["url"]) ?? server.endpoint_or_command;
      if (!url) {
        if (server.is_required) {
          throw new DelegationExecutionFailure(
            "EXECUTION_FAILED",
            `Required MCP server ${server.name} has empty url`
          );
        }
        continue;
      }

      resolved.push({
        key,
        name: server.name,
        transport: "http",
        command: null,
        args: [],
        url,
        env: asStringRecord(server.config_json?.["env"])
      });
      continue;
    }

    const isOrchestratorCore =
      server.name === ORCHESTRATOR_MCP_SERVER_NAME ||
      server.endpoint_or_command === ORCHESTRATOR_MCP_ENDPOINT;
    if (isOrchestratorCore) {
      const command = await resolveOrchestratorMcpCommand(server.config_json);
      resolved.push({
        key,
        name: server.name,
        transport: "stdio",
        command: command.command,
        args: command.args,
        url: null,
        env: buildOrchestratorMcpEnv({
          config: options.config,
          profileId,
          configJson: server.config_json
        })
      });
      continue;
    }

    const commandOverride = asNonEmptyString(server.config_json?.["command"]);
    const argsOverride = asStringArray(server.config_json?.["args"]);
    const parsed = parseShellLikeCommand(commandOverride ?? server.endpoint_or_command);
    const command = commandOverride ?? parsed.command;
    const args = argsOverride ?? (commandOverride ? [] : parsed.args);
    if (!command) {
      if (server.is_required) {
        throw new DelegationExecutionFailure(
          "EXECUTION_FAILED",
          `Required MCP server ${server.name} has empty command`
        );
      }
      continue;
    }

    resolved.push({
      key,
      name: server.name,
      transport: "stdio",
      command,
      args,
      url: null,
      env: asStringRecord(server.config_json?.["env"])
    });
  }

  return resolved;
}

export function buildMcpRuntimeConfigToml(servers: RuntimeMcpServerConfig[]): string {
  const lines: string[] = [];

  for (const server of servers) {
    lines.push(`[mcp_servers.${server.key}]`);
    lines.push("enabled = true");

    if (server.transport === "http") {
      if (!server.url) {
        continue;
      }
      lines.push(`url = "${escapeTomlString(server.url)}"`);
    } else {
      if (!server.command) {
        continue;
      }
      lines.push(`command = "${escapeTomlString(server.command)}"`);
      if (server.args.length > 0) {
        const serializedArgs = server.args.map((arg) => `"${escapeTomlString(arg)}"`).join(", ");
        lines.push(`args = [${serializedArgs}]`);
      }
    }

    const envEntries = Object.entries(server.env);
    if (envEntries.length > 0) {
      lines.push("");
      lines.push(`[mcp_servers.${server.key}.env]`);
      for (const [key, value] of envEntries.sort((left, right) => left[0].localeCompare(right[0]))) {
        lines.push(`${key} = "${escapeTomlString(value)}"`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function flattenMcpRuntimeEnv(servers: RuntimeMcpServerConfig[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const server of servers) {
    for (const [key, value] of Object.entries(server.env)) {
      if (env[key] === undefined) {
        env[key] = value;
      }
    }
  }
  return env;
}
