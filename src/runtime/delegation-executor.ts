import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config";
import { parseAuthJsonBuffer } from "../lib/auth-profile-json";
import type {
  ActiveAuthProfileRuntimeEntity,
  DelegationExecutionError,
  DelegationExecutionInput,
  DelegationExecutionResult,
  DelegationExecutor,
  Persistence,
  StorageService
} from "./contracts";

const MAX_RESULT_SUMMARY_LENGTH = 1024;
const MAX_OUTPUT_LENGTH = 16 * 1024;
const MAX_RUNTIME_SECRET_ENV_VARS = 64;
const RUNTIME_ENV_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,127}$/;
const REDACTION_PLACEHOLDER = "[REDACTED_SECRET]";
const RESERVED_RUNTIME_ENV_KEYS = new Set(["PATH", "HOME", "CODEX_HOME"]);
const SENSITIVE_ENV_KEY_PATTERN = /(TOKEN|KEY|SECRET|PASSWORD|AUTH)/i;
const ORCHESTRATOR_MCP_SERVER_NAME = "orchestrator-core";
const ORCHESTRATOR_MCP_ENDPOINT = "orchestrator://core";
const SANDBOX_POLICIES = new Set(["read-only", "workspace-write", "danger-full-access"]);
const APPROVAL_POLICIES = new Set(["never", "on-request", "on-failure", "untrusted"]);

interface DelegationPayloadMcpServer {
  name: string;
  transport: "stdio" | "http";
  endpoint_or_command: string;
  is_required: boolean;
  priority: number;
  config_json: Record<string, unknown> | null;
}

interface RuntimeMcpServerConfig {
  key: string;
  name: string;
  transport: "stdio" | "http";
  command: string | null;
  args: string[];
  url: string | null;
  env: Record<string, string>;
}

function resolveCodexCommandForSpawn(command: string): string {
  return command.trim();
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const values: string[] = [];
  for (const item of value) {
    const parsed = asNonEmptyString(item);
    if (!parsed) {
      return null;
    }
    values.push(parsed);
  }
  return values;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) {
    return {};
  }

  const record: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    const normalizedKey = key.trim();
    if (!RUNTIME_ENV_KEY_PATTERN.test(normalizedKey) || RESERVED_RUNTIME_ENV_KEYS.has(normalizedKey)) {
      continue;
    }
    const parsedValue = asNonEmptyString(raw);
    if (!parsedValue) {
      continue;
    }
    record[normalizedKey] = parsedValue;
  }
  return record;
}

function trimToLimit(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 3)}...`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRuntimeSecretEnv(payload: Record<string, unknown>): Record<string, string> {
  const candidate = payload["runtime_env"];
  if (!isPlainObject(candidate)) {
    return {};
  }

  const runtimeEnv: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(candidate)) {
    if (!RUNTIME_ENV_KEY_PATTERN.test(key) || RESERVED_RUNTIME_ENV_KEYS.has(key)) {
      continue;
    }
    if (typeof rawValue !== "string" || rawValue.length === 0) {
      continue;
    }
    runtimeEnv[key] = rawValue;
    if (Object.keys(runtimeEnv).length >= MAX_RUNTIME_SECRET_ENV_VARS) {
      break;
    }
  }

  return runtimeEnv;
}

function buildSecretRedactionValues(runtimeEnv: Record<string, string>): string[] {
  const unique = new Set<string>();
  for (const value of Object.values(runtimeEnv)) {
    if (value.length < 4) {
      continue;
    }
    unique.add(value);
  }

  return Array.from(unique).sort((left, right) => {
    if (left.length === right.length) {
      return left.localeCompare(right);
    }
    return right.length - left.length;
  });
}

function extractSensitiveEnvSubset(runtimeEnv: Record<string, string>): Record<string, string> {
  const sensitive: Record<string, string> = {};
  for (const [key, value] of Object.entries(runtimeEnv)) {
    if (!SENSITIVE_ENV_KEY_PATTERN.test(key)) {
      continue;
    }
    sensitive[key] = value;
  }
  return sensitive;
}

function redactSecretsInText(value: string, redactionValues: string[]): string {
  if (!value || redactionValues.length === 0) {
    return value;
  }

  let redacted = value;
  for (const secret of redactionValues) {
    if (!secret || !redacted.includes(secret)) {
      continue;
    }
    redacted = redacted.split(secret).join(REDACTION_PLACEHOLDER);
  }

  return redacted;
}

function formatMockSummary(input: DelegationExecutionInput): string {
  return `Delegation completed by template ${input.target_template.id}`;
}

function normalizeSandboxPolicy(value: unknown): "read-only" | "workspace-write" | "danger-full-access" {
  const candidate = asNonEmptyString(value)?.toLowerCase();
  if (candidate && SANDBOX_POLICIES.has(candidate)) {
    return candidate as "read-only" | "workspace-write" | "danger-full-access";
  }

  return "workspace-write";
}

function normalizeApprovalPolicy(value: unknown): "never" | "on-request" | "on-failure" | "untrusted" {
  const candidate = asNonEmptyString(value)?.toLowerCase();
  if (candidate && APPROVAL_POLICIES.has(candidate)) {
    return candidate as "never" | "on-request" | "on-failure" | "untrusted";
  }

  return "never";
}

function parseShellLikeCommand(value: string): { command: string; args: string[] } {
  const tokens: string[] = [];
  let current = "";
  let quote: "\"" | "'" | null = null;

  for (const char of value.trim()) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  if (tokens.length === 0) {
    return { command: value.trim(), args: [] };
  }

  return {
    command: tokens[0] ?? value.trim(),
    args: tokens.slice(1)
  };
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
    return {
      command: overrideCommand,
      args: overrideArgs
    };
  }

  const distEntrypoint = path.resolve(process.cwd(), "dist", "mcp", "index.js");
  if (await pathExists(distEntrypoint)) {
    return {
      command: process.execPath,
      args: [distEntrypoint]
    };
  }

  const srcEntrypoint = path.resolve(process.cwd(), "src", "mcp", "index.ts");
  if (await pathExists(srcEntrypoint)) {
    return {
      command: "npx",
      args: ["tsx", srcEntrypoint]
    };
  }

  throw new DelegationExecutionFailure(
    "EXECUTION_FAILED",
    "Unable to resolve orchestrator MCP bridge entrypoint (dist/src not found)"
  );
}

function buildOrchestratorMcpEnv(options: {
  config: AppConfig;
  profileId: string | null;
  templateId: string;
  configJson: Record<string, unknown> | null;
}): Record<string, string> {
  const env: Record<string, string> = {
    MCP_ADMIN_TOKEN: options.config.adminToken,
    MCP_API_BASE_URL:
      asNonEmptyString(options.configJson?.["api_base_url"]) ??
      asNonEmptyString(process.env["MCP_API_BASE_URL"]) ??
      asNonEmptyString(process.env["ORCHESTRATOR_API_BASE_URL"]) ??
      `http://127.0.0.1:${options.config.port}`,
    MCP_AGENT_TEMPLATE_ID: options.templateId
  };

  const profileId = options.profileId ?? asNonEmptyString(options.configJson?.["agent_profile_id"]);
  if (profileId) {
    env["MCP_AGENT_PROFILE_ID"] = profileId;
  }

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

async function buildRuntimeMcpServers(options: {
  payload: Record<string, unknown>;
  config: AppConfig;
  templateId: string;
}): Promise<RuntimeMcpServerConfig[]> {
  const servers = getPayloadMcpServers(options.payload);
  if (servers.length === 0) {
    return [];
  }

  const profileId = getPayloadAgentProfileId(options.payload);
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
      server.name === ORCHESTRATOR_MCP_SERVER_NAME || server.endpoint_or_command === ORCHESTRATOR_MCP_ENDPOINT;
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
          templateId: options.templateId,
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

function buildMcpRuntimeConfigToml(servers: RuntimeMcpServerConfig[]): string {
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

function flattenMcpRuntimeEnv(servers: RuntimeMcpServerConfig[]): Record<string, string> {
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

function getPayloadPrompt(payload: Record<string, unknown>): string {
  const promptCandidate = asNonEmptyString(payload["prompt"]) ?? asNonEmptyString(payload["task"]);
  if (promptCandidate) {
    return promptCandidate;
  }

  try {
    const serialized = JSON.stringify(payload);
    if (serialized && serialized !== "{}") {
      return `Обработай payload делегации: ${serialized}`;
    }
  } catch {
    // ignore serialization issue
  }

  return "Выполни делегацию и верни краткий итог.";
}

async function resolveAuthJsonBuffer(rawProfilePayload: Buffer): Promise<{
  authJsonBuffer: Buffer;
  source: "auth_json";
}> {
  parseAuthJsonBuffer(rawProfilePayload);
  return {
    authJsonBuffer: rawProfilePayload,
    source: "auth_json"
  };
}

class DelegationExecutionFailure extends Error implements DelegationExecutionError {
  public constructor(
    public readonly code: DelegationExecutionError["code"],
    message: string
  ) {
    super(message);
    this.name = "DelegationExecutionFailure";
  }
}

class MockDelegationExecutor implements DelegationExecutor {
  public async execute(input: DelegationExecutionInput): Promise<DelegationExecutionResult> {
    const summary = formatMockSummary(input);
    return {
      execution_mode: "mock",
      result_summary: summary,
      output_text: summary,
      metadata: {
        reason: "mock_executor"
      }
    };
  }
}

interface CodexDelegationExecutorOptions {
  config: AppConfig;
  persistence: Persistence;
  storage: StorageService;
}

class CodexDelegationExecutor implements DelegationExecutor {
  private readonly mockExecutor = new MockDelegationExecutor();
  private codexAvailability: boolean | null = null;

  public constructor(private readonly options: CodexDelegationExecutorOptions) {}

  private getCodexSpawnCommand(): string {
    return resolveCodexCommandForSpawn(this.options.config.codexCommand);
  }

  public async execute(input: DelegationExecutionInput): Promise<DelegationExecutionResult> {
    const modeOverride = asNonEmptyString(input.payload["execution_mode"]);
    const effectiveMode: "mock" | "auto" | "codex_exec" =
      modeOverride === "mock" || modeOverride === "codex_exec"
        ? modeOverride
        : this.options.config.delegationExecutorMode;

    if (effectiveMode === "mock") {
      return this.mockExecutor.execute(input);
    }

    const activeProfile = await this.options.persistence.getActiveAuthProfileRuntime();
    if (!activeProfile) {
      if (effectiveMode === "auto") {
        return this.mockExecutor.execute(input);
      }

      throw new DelegationExecutionFailure(
        "AUTH_PROFILE_REQUIRED",
        "Active auth profile is required for codex execution"
      );
    }

    const codexAvailable = await this.checkCodexAvailability();
    if (!codexAvailable) {
      if (effectiveMode === "auto") {
        return this.mockExecutor.execute(input);
      }

      throw new DelegationExecutionFailure(
        "EXECUTION_FAILED",
        `Codex command is not available: ${this.options.config.codexCommand}`
      );
    }

    return this.executeCodex(input, activeProfile);
  }

  private async checkCodexAvailability(): Promise<boolean> {
    if (this.codexAvailability != null) {
      return this.codexAvailability;
    }

    const args = ["--version"];
    const timeoutMs = Math.min(this.options.config.delegationExecutionTimeoutMs, 10_000);
    const codexCommand = this.getCodexSpawnCommand();

    const available = await new Promise<boolean>((resolve) => {
      const child = spawn(codexCommand, args, {
        stdio: "ignore",
        shell: process.platform === "win32"
      });

      let settled = false;
      const timeout = setTimeout(() => {
        settled = true;
        child.kill("SIGKILL");
        resolve(false);
      }, timeoutMs);

      child.on("error", () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(false);
      });

      child.on("close", (code) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(code === 0);
      });
    });

    this.codexAvailability = available;
    return available;
  }

  private async executeCodex(
    input: DelegationExecutionInput,
    activeProfile: ActiveAuthProfileRuntimeEntity
  ): Promise<DelegationExecutionResult> {
    const runtimeRoot = path.resolve(this.options.config.workerRuntimeDir, input.delegation_id);
    const codexHome = path.resolve(runtimeRoot, "auth");
    const runRoot = path.resolve(runtimeRoot, "run");

    await fs.rm(runtimeRoot, { recursive: true, force: true });
    await fs.mkdir(codexHome, { recursive: true });
    await fs.mkdir(runRoot, { recursive: true });

    const rawProfilePayload = await this.options.storage.getObject(activeProfile.storage_path);
    const { authJsonBuffer, source } = await resolveAuthJsonBuffer(rawProfilePayload).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown auth payload validation error";
      throw new DelegationExecutionFailure(
        "EXECUTION_FAILED",
        `Invalid active auth profile payload: ${message}`
      );
    });
    await fs.writeFile(path.resolve(codexHome, "auth.json"), authJsonBuffer);

    const payloadCwd = asNonEmptyString(input.payload["cwd"]);
    const executionCwd = payloadCwd ? path.resolve(payloadCwd) : process.cwd();
    await fs.mkdir(executionCwd, { recursive: true });
    const runtimeSecretEnv = getRuntimeSecretEnv(input.payload);
    const runtimeMcpServers = await buildRuntimeMcpServers({
      payload: input.payload,
      config: this.options.config,
      templateId: input.target_template.id
    });
    if (runtimeMcpServers.length > 0) {
      const mcpConfigToml = buildMcpRuntimeConfigToml(runtimeMcpServers);
      await fs.writeFile(path.resolve(codexHome, "config.toml"), mcpConfigToml, "utf8");
    }
    const runtimeMcpEnv = flattenMcpRuntimeEnv(runtimeMcpServers);
    const secretRedactionValues = buildSecretRedactionValues({
      ...runtimeSecretEnv,
      ...extractSensitiveEnvSubset(runtimeMcpEnv)
    });

    const prompt = getPayloadPrompt(input.payload);
    const lastMessagePath = path.resolve(runRoot, "last-message.txt");
    const sandboxPolicy = normalizeSandboxPolicy(input.target_template.sandbox_policy);
    const approvalPolicy = normalizeApprovalPolicy(input.target_template.approval_policy);

    const args: string[] = [
      "exec",
      "-",
      "--json",
      "--skip-git-repo-check",
      "-C",
      executionCwd,
      "-s",
      sandboxPolicy,
      "-c",
      `approval_policy="${approvalPolicy}"`,
      "-o",
      lastMessagePath
    ];

    const model = asNonEmptyString(input.target_template.model);
    if (model) {
      args.push("-m", model);
    }

    const commandResult = await this.runProcess({
      command: this.getCodexSpawnCommand(),
      args,
      cwd: executionCwd,
      timeoutMs: this.options.config.delegationExecutionTimeoutMs,
      redactionValues: secretRedactionValues,
      stdin: prompt,
      env: {
        ...process.env,
        ...runtimeSecretEnv,
        ...runtimeMcpEnv,
        CODEX_HOME: codexHome,
        HOME: runtimeRoot
      }
    });

    const lastMessage = asNonEmptyString(
      await fs.readFile(lastMessagePath, "utf8").catch(() => "")
    );
    const outputText = trimToLimit(
      redactSecretsInText(`${commandResult.stdout}\n${commandResult.stderr}`.trim(), secretRedactionValues),
      MAX_OUTPUT_LENGTH
    );

    const summary = trimToLimit(
      redactSecretsInText(
        lastMessage ?? asNonEmptyString(commandResult.stdout) ?? "Delegation completed by codex",
        secretRedactionValues
      ),
      MAX_RESULT_SUMMARY_LENGTH
    );

    return {
      execution_mode: "codex_exec",
      result_summary: summary,
      output_text: outputText,
      metadata: {
        active_profile_id: activeProfile.id,
        auth_payload_source: source,
        auth_json_bytes: authJsonBuffer.length,
        sandbox_policy: sandboxPolicy,
        approval_policy: approvalPolicy,
        mcp_servers_configured: runtimeMcpServers.map((server) => ({
          name: server.name,
          transport: server.transport
        }))
      }
    };
  }

  private async runProcess(options: {
    command: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
    env: NodeJS.ProcessEnv;
    redactionValues: string[];
    stdin?: string;
  }): Promise<{ stdout: string; stderr: string }> {
    const { command, args, cwd, timeoutMs, env, redactionValues, stdin } = options;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: process.platform === "win32"
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      if (typeof stdin === "string") {
        child.stdin.write(stdin);
      }
      child.stdin.end();

      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(new DelegationExecutionFailure("EXECUTION_FAILED", `Codex process error: ${error.message}`));
      });

      child.on("close", (code) => {
        clearTimeout(timeout);

        if (timedOut) {
          reject(new DelegationExecutionFailure("TIMEOUT", "Codex execution timed out"));
          return;
        }

        if (code !== 0) {
          const failureOutput = trimToLimit(
            redactSecretsInText(`${stdout}\n${stderr}`.trim(), redactionValues),
            2000
          );
          reject(
            new DelegationExecutionFailure(
              "EXECUTION_FAILED",
              `Codex exited with code ${code}. ${failureOutput}`
            )
          );
          return;
        }

        resolve({ stdout, stderr });
      });
    });
  }
}

export function createDelegationExecutor(
  options: CodexDelegationExecutorOptions
): DelegationExecutor {
  return new CodexDelegationExecutor(options);
}
