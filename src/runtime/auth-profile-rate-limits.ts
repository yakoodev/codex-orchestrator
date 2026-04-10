import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config";
import { parseAuthJsonBuffer } from "../lib/auth-profile-json";
import type {
  AuthProfileRateLimitsReadResult,
  AuthProfileRateLimitsReader,
  Persistence,
  RateLimitCreditsSnapshot,
  RateLimitSnapshot,
  RateLimitWindowSnapshot,
  StorageService
} from "./contracts";

type LimitsReaderErrorCode =
  | "PROFILE_PAYLOAD_UNAVAILABLE"
  | "PROFILE_PAYLOAD_INVALID"
  | "RPC_FAILED";

export class AuthProfileRateLimitsError extends Error {
  public constructor(
    public readonly code: LimitsReaderErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AuthProfileRateLimitsError";
  }
}

interface CodexRateLimitsReaderOptions {
  config: AppConfig;
  persistence: Persistence;
  storage: StorageService;
}

interface AppServerRateLimitsResult {
  rateLimits: RateLimitSnapshot;
  rateLimitsByLimitId: Record<string, RateLimitSnapshot> | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function clampPercent(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}

function toUtcIsoFromUnixSeconds(unixSeconds: number | null): string | null {
  if (unixSeconds == null) {
    return null;
  }
  return new Date(unixSeconds * 1000).toISOString();
}

function normalizeRateLimitWindow(
  rawWindow: unknown,
  nowUnixSeconds: number
): RateLimitWindowSnapshot | null {
  if (!isPlainObject(rawWindow)) {
    return null;
  }

  const usedPercentRaw =
    asInteger(rawWindow["usedPercent"]) ?? asInteger(rawWindow["used_percent"]);
  const usedPercent = usedPercentRaw == null ? null : clampPercent(usedPercentRaw);

  const resetsAt =
    asInteger(rawWindow["resetsAt"]) ?? asInteger(rawWindow["reset_at"]);
  const resetAfterSeconds =
    resetsAt == null ? null : Math.max(0, resetsAt - nowUnixSeconds);

  return {
    used_percent: usedPercent,
    remaining_percent: usedPercent == null ? null : 100 - usedPercent,
    window_minutes:
      asInteger(rawWindow["windowDurationMins"]) ??
      asInteger(rawWindow["window_minutes"]),
    resets_at_unix: resetsAt,
    resets_at_utc: toUtcIsoFromUnixSeconds(resetsAt),
    reset_after_seconds: resetAfterSeconds
  };
}

function normalizeCredits(rawCredits: unknown): RateLimitCreditsSnapshot | null {
  if (!isPlainObject(rawCredits)) {
    return null;
  }

  return {
    has_credits: rawCredits["hasCredits"] === true,
    unlimited: rawCredits["unlimited"] === true,
    balance: asStringOrNull(rawCredits["balance"])
  };
}

function normalizeRateLimitSnapshot(
  rawSnapshot: unknown,
  capturedAt: string
): RateLimitSnapshot | null {
  if (!isPlainObject(rawSnapshot)) {
    return null;
  }

  const nowUnixSeconds = Math.floor(Date.now() / 1000);

  return {
    source: "openai_app_server_rpc",
    captured_at: capturedAt,
    limit_id: asStringOrNull(rawSnapshot["limitId"]) ?? asStringOrNull(rawSnapshot["limit_id"]),
    limit_name:
      asStringOrNull(rawSnapshot["limitName"]) ?? asStringOrNull(rawSnapshot["limit_name"]),
    plan_type:
      asStringOrNull(rawSnapshot["planType"]) ?? asStringOrNull(rawSnapshot["plan_type"]),
    primary: normalizeRateLimitWindow(rawSnapshot["primary"], nowUnixSeconds),
    secondary: normalizeRateLimitWindow(rawSnapshot["secondary"], nowUnixSeconds),
    credits: normalizeCredits(rawSnapshot["credits"])
  };
}

async function readRateLimitsFromAppServer(options: {
  codexCommand: string;
  codexHome: string;
  timeoutMs: number;
}): Promise<AppServerRateLimitsResult> {
  const { codexCommand, codexHome, timeoutMs } = options;

  const child = spawn(codexCommand, ["app-server"], {
    env: {
      ...process.env,
      CODEX_HOME: codexHome
    },
    stdio: ["pipe", "pipe", "pipe"]
  });

  return new Promise<AppServerRateLimitsResult>((resolve, reject) => {
    let settled = false;
    let stdoutBuffer = "";
    const stderrLines: string[] = [];
    let timeout: NodeJS.Timeout | null = null;

    const complete = (error?: unknown, value?: AppServerRateLimitsResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      child.kill();
      if (error) {
        reject(error);
        return;
      }
      if (!value) {
        reject(new Error("Empty app-server response"));
        return;
      }
      resolve(value);
    };

    const processLine = (rawLine: string): void => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        return;
      }

      if (!isPlainObject(parsed) || parsed["id"] !== 2) {
        return;
      }

      const rpcError = parsed["error"];
      if (rpcError) {
        complete(
          new Error(
            `account/rateLimits/read returned error: ${JSON.stringify(rpcError)}`
          )
        );
        return;
      }

      const result = parsed["result"];
      if (!isPlainObject(result)) {
        complete(new Error("account/rateLimits/read returned invalid result payload"));
        return;
      }

      const capturedAt = new Date().toISOString();
      const normalizedRateLimits = normalizeRateLimitSnapshot(result["rateLimits"], capturedAt);
      if (!normalizedRateLimits) {
        complete(new Error("account/rateLimits/read has no rateLimits payload"));
        return;
      }

      const rawRateLimitsByLimitId = result["rateLimitsByLimitId"];
      let normalizedByLimitId: Record<string, RateLimitSnapshot> | null = null;
      if (isPlainObject(rawRateLimitsByLimitId)) {
        normalizedByLimitId = {};
        for (const [limitId, snapshot] of Object.entries(rawRateLimitsByLimitId)) {
          const normalizedSnapshot = normalizeRateLimitSnapshot(snapshot, capturedAt);
          if (normalizedSnapshot) {
            normalizedByLimitId[limitId] = normalizedSnapshot;
          }
        }
      }

      complete(undefined, {
        rateLimits: normalizedRateLimits,
        rateLimitsByLimitId: normalizedByLimitId
      });
    };

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdoutBuffer += chunk.toString();
      let newlineIndex = stdoutBuffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = stdoutBuffer.slice(0, newlineIndex);
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        processLine(line);
        newlineIndex = stdoutBuffer.indexOf("\n");
      }
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = chunk.toString().trim();
      if (!text) {
        return;
      }
      if (stderrLines.length < 8) {
        stderrLines.push(text);
      }
    });

    child.on("error", (error) => {
      complete(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      const stderrSuffix =
        stderrLines.length > 0 ? ` stderr=${stderrLines.join(" | ")}` : "";
      complete(
        new Error(`codex app-server exited before response with code ${code}.${stderrSuffix}`)
      );
    });

    timeout = setTimeout(() => {
      const stderrSuffix =
        stderrLines.length > 0 ? ` stderr=${stderrLines.join(" | ")}` : "";
      complete(new Error(`account/rateLimits/read timeout after ${timeoutMs}ms.${stderrSuffix}`));
    }, timeoutMs);

    const requests = [
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          clientInfo: {
            name: "orchestrator-limits-reader",
            version: "1.0"
          }
        }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "account/rateLimits/read"
      }
    ];

    try {
      if (!child.stdin) {
        complete(new Error("codex app-server stdin is unavailable"));
        return;
      }

      for (const rpcRequest of requests) {
        child.stdin.write(`${JSON.stringify(rpcRequest)}\n`);
      }
      // Keep stdin open while waiting for the RPC response.
      // Closing it too early can terminate app-server before id=2 arrives.
    } catch (error) {
      complete(error);
    }
  });
}

class CodexAuthProfileRateLimitsReader implements AuthProfileRateLimitsReader {
  public constructor(private readonly options: CodexRateLimitsReaderOptions) {}

  public async readByProfileId(profileId: string): Promise<AuthProfileRateLimitsReadResult | null> {
    const profile = await this.options.persistence.getAuthProfileRuntimeById(profileId);
    if (!profile) {
      return null;
    }

    let rawProfilePayload: Buffer;
    try {
      rawProfilePayload = await this.options.storage.getObject(profile.storage_path);
    } catch (error) {
      throw new AuthProfileRateLimitsError(
        "PROFILE_PAYLOAD_UNAVAILABLE",
        `Cannot read auth profile payload: ${error instanceof Error ? error.message : "unknown_error"}`
      );
    }

    try {
      parseAuthJsonBuffer(rawProfilePayload);
    } catch (error) {
      throw new AuthProfileRateLimitsError(
        "PROFILE_PAYLOAD_INVALID",
        `Stored auth profile has invalid auth.json payload: ${
          error instanceof Error ? error.message : "unknown_error"
        }`
      );
    }

    const runtimeRoot = path.resolve(
      this.options.config.workerRuntimeDir,
      "rate-limits",
      profile.id,
      randomUUID()
    );
    const codexHome = path.resolve(runtimeRoot, "codex-home");

    await fs.mkdir(codexHome, { recursive: true });
    await fs.writeFile(path.resolve(codexHome, "auth.json"), rawProfilePayload);

    try {
      const timeoutMs = Math.min(
        Math.max(this.options.config.delegationExecutionTimeoutMs, 5000),
        30000
      );
      const rpcResult = await readRateLimitsFromAppServer({
        codexCommand: this.options.config.codexCommand,
        codexHome,
        timeoutMs
      });

      return {
        profile: {
          id: profile.id,
          label: profile.label,
          status: profile.status,
          checksum: profile.checksum
        },
        rate_limits: rpcResult.rateLimits,
        rate_limits_by_limit_id: rpcResult.rateLimitsByLimitId
      };
    } catch (error) {
      throw new AuthProfileRateLimitsError(
        "RPC_FAILED",
        `Failed to read live rate limits: ${
          error instanceof Error ? error.message : "unknown_error"
        }`
      );
    } finally {
      await fs.rm(runtimeRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

export function createAuthProfileRateLimitsReader(
  options: CodexRateLimitsReaderOptions
): AuthProfileRateLimitsReader {
  return new CodexAuthProfileRateLimitsReader(options);
}
