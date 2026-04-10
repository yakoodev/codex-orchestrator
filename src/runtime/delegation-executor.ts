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
const SANDBOX_POLICIES = new Set(["read-only", "workspace-write", "danger-full-access"]);
const APPROVAL_POLICIES = new Set(["never", "on-request", "on-failure", "untrusted"]);

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
    const secretRedactionValues = buildSecretRedactionValues(runtimeSecretEnv);

    const prompt = getPayloadPrompt(input.payload);
    const lastMessagePath = path.resolve(runRoot, "last-message.txt");
    const sandboxPolicy = normalizeSandboxPolicy(input.target_template.sandbox_policy);
    const approvalPolicy = normalizeApprovalPolicy(input.target_template.approval_policy);

    const args: string[] = [
      "exec",
      prompt,
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
      env: {
        ...process.env,
        ...runtimeSecretEnv,
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
        approval_policy: approvalPolicy
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
  }): Promise<{ stdout: string; stderr: string }> {
    const { command, args, cwd, timeoutMs, env, redactionValues } = options;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
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
