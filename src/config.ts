import path from "node:path";

export interface AppConfig {
  nodeEnv: string;
  serviceName: string;
  port: number;
  adminToken: string;
  databaseUrl: string;
  redisUrl: string;
  redisStreamKey: string;
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKey: string;
  s3SecretKey: string;
  maxAuthJsonBytes: number;
  switchModuleDefaultEnabled: boolean;
  switchWeeklyRemainingPercentLt: number;
  switchFiveHourRemainingPercentLt: number;
  switchResetGuardHours: number;
  openApiPath: string;
  delegationExecutorMode: "mock" | "auto" | "codex_exec";
  codexCommand: string;
  workerRuntimeDir: string;
  delegationExecutionTimeoutMs: number;
}

function readInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function required(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function readDelegationExecutorMode(
  value: string | undefined
): "mock" | "auto" | "codex_exec" {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "mock" || normalized === "auto" || normalized === "codex_exec") {
    return normalized;
  }

  return "auto";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    nodeEnv: env["NODE_ENV"] ?? "development",
    serviceName: env["SERVICE_NAME"] ?? "bus",
    port: readInt(env["BUS_PORT"] ?? env["PORT"], 8080),
    adminToken: required(env["ADMIN_TOKEN"], "ADMIN_TOKEN"),
    databaseUrl: required(env["DATABASE_URL"], "DATABASE_URL"),
    redisUrl: required(env["REDIS_URL"], "REDIS_URL"),
    redisStreamKey: env["REDIS_STREAM_KEY"] ?? "orchestrator.events",
    s3Endpoint: required(env["S3_ENDPOINT"], "S3_ENDPOINT"),
    s3Region: env["S3_REGION"] ?? "us-east-1",
    s3Bucket: required(env["S3_BUCKET"], "S3_BUCKET"),
    s3AccessKey: required(env["S3_ACCESS_KEY"], "S3_ACCESS_KEY"),
    s3SecretKey: required(env["S3_SECRET_KEY"], "S3_SECRET_KEY"),
    maxAuthJsonBytes: readInt(env["MAX_AUTH_PROFILE_JSON_MB"], 25) * 1024 * 1024,
    switchModuleDefaultEnabled: readBool(env["MODULE_SWITCH_ENABLED"], true),
    switchWeeklyRemainingPercentLt: readInt(env["SWITCH_WEEKLY_REMAINING_PERCENT_LT"], 5),
    switchFiveHourRemainingPercentLt: readInt(env["SWITCH_FIVE_HOUR_REMAINING_PERCENT_LT"], 10),
    switchResetGuardHours: readInt(env["SWITCH_RESET_GUARD_HOURS"], 3),
    openApiPath:
      env["OPENAPI_CONTRACT_PATH"] ??
      path.resolve(process.cwd(), "docs", "contracts", "openapi.yaml"),
    delegationExecutorMode: readDelegationExecutorMode(env["DELEGATION_EXECUTOR_MODE"]),
    codexCommand: env["CODEX_COMMAND"]?.trim() || "codex",
    workerRuntimeDir:
      env["WORKER_RUNTIME_DIR"]?.trim() ||
      path.resolve(process.cwd(), ".runtime", "workers"),
    delegationExecutionTimeoutMs: readInt(env["DELEGATION_EXECUTION_TIMEOUT_MS"], 180000)
  };
}
