import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config";
import type {
  ActiveAuthProfileRuntimeEntity,
  DelegationExecutionInput,
  DelegationExecutionResult,
  DelegationExecutor,
  Persistence,
  StorageService
} from "./contracts";
import {
  buildMcpRuntimeConfigToml,
  buildRuntimeMcpServers,
  flattenMcpRuntimeEnv
} from "./delegation-executor-mcp";
import {
  DelegationExecutionFailure,
  MAX_OUTPUT_LENGTH,
  MAX_RESULT_SUMMARY_LENGTH,
  asNonEmptyString,
  buildSecretRedactionValues,
  extractSensitiveEnvSubset,
  formatMockSummary,
  getPayloadPrompt,
  getRuntimeSecretEnv,
  normalizeApprovalPolicy,
  normalizeSandboxPolicy,
  redactSecretsInText,
  resolveAuthJsonBuffer,
  resolveCodexCommandForSpawn,
  trimToLimit
} from "./delegation-executor-utils";

class MockDelegationExecutor implements DelegationExecutor {
  public async execute(input: DelegationExecutionInput): Promise<DelegationExecutionResult> {
    const summary = formatMockSummary(input);
    return {
      execution_mode: "mock",
      result_summary: summary,
      output_text: summary,
      metadata: { reason: "mock_executor" }
    };
  }

  public async cancel(delegationId: string): Promise<boolean> {
    void delegationId;
    return false;
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
  private readonly activeProcesses = new Map<string, ChildProcess>();

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

  public async cancel(delegationId: string): Promise<boolean> {
    const child = this.activeProcesses.get(delegationId);
    if (!child) {
      return false;
    }

    try {
      if (process.platform === "win32" && child.pid) {
        const taskkill = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
          shell: true
        });
        taskkill.unref();
      }
      child.kill("SIGKILL");
      return true;
    } catch {
      return false;
    } finally {
      this.activeProcesses.delete(delegationId);
    }
  }

  private async checkCodexAvailability(): Promise<boolean> {
    if (this.codexAvailability != null) {
      return this.codexAvailability;
    }

    const timeoutMs = Math.min(this.options.config.delegationExecutionTimeoutMs, 10_000);
    const codexCommand = this.getCodexSpawnCommand();

    const available = await new Promise<boolean>((resolve) => {
      const child = spawn(codexCommand, ["--version"], {
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
      profileId: input.target_profile.id
    });
    if (runtimeMcpServers.length > 0) {
      await fs.writeFile(
        path.resolve(codexHome, "config.toml"),
        buildMcpRuntimeConfigToml(runtimeMcpServers),
        "utf8"
      );
    }

    const runtimeMcpEnv = flattenMcpRuntimeEnv(runtimeMcpServers);
    const secretRedactionValues = buildSecretRedactionValues({
      ...runtimeSecretEnv,
      ...extractSensitiveEnvSubset(runtimeMcpEnv)
    });

    const prompt = getPayloadPrompt(input.payload);
    const lastMessagePath = path.resolve(runRoot, "last-message.txt");
    const sandboxPolicy = normalizeSandboxPolicy(input.target_profile.sandbox_policy);
    const approvalPolicy = normalizeApprovalPolicy(input.target_profile.approval_policy);

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

    const model = asNonEmptyString(input.target_profile.model);
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
      delegationId: input.delegation_id,
      env: {
        ...process.env,
        ...runtimeSecretEnv,
        ...runtimeMcpEnv,
        CODEX_HOME: codexHome,
        HOME: runtimeRoot
      }
    });

    const lastMessage = asNonEmptyString(await fs.readFile(lastMessagePath, "utf8").catch(() => ""));
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
    delegationId?: string;
    stdin?: string;
  }): Promise<{ stdout: string; stderr: string }> {
    const { command, args, cwd, timeoutMs, env, redactionValues, delegationId, stdin } = options;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: process.platform === "win32"
      });
      if (delegationId) {
        this.activeProcesses.set(delegationId, child);
      }

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const finalize = () => {
        if (delegationId) {
          this.activeProcesses.delete(delegationId);
        }
      };

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
        finalize();
        reject(new DelegationExecutionFailure("EXECUTION_FAILED", `Codex process error: ${error.message}`));
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        finalize();

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
