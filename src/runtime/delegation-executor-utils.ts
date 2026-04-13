import { parseAuthJsonBuffer } from "../lib/auth-profile-json";
import type {
  DelegationExecutionError,
  DelegationExecutionInput
} from "./contracts";

export const MAX_RESULT_SUMMARY_LENGTH = 1024;
export const MAX_OUTPUT_LENGTH = 16 * 1024;
const MAX_RUNTIME_SECRET_ENV_VARS = 64;
const RUNTIME_ENV_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,127}$/;
const REDACTION_PLACEHOLDER = "[REDACTED_SECRET]";
const RESERVED_RUNTIME_ENV_KEYS = new Set(["PATH", "HOME", "CODEX_HOME"]);
const SENSITIVE_ENV_KEY_PATTERN = /(TOKEN|KEY|SECRET|PASSWORD|AUTH)/i;
const SANDBOX_POLICIES = new Set(["read-only", "workspace-write", "danger-full-access"]);
const APPROVAL_POLICIES = new Set(["never", "on-request", "on-failure", "untrusted"]);

export function resolveCodexCommandForSpawn(command: string): string {
  return command.trim();
}

export function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

export function asBoolean(value: unknown): boolean | null {
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

export function asStringArray(value: unknown): string[] | null {
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

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asStringRecord(value: unknown): Record<string, string> {
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

export function trimToLimit(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 3)}...`;
}

export function getRuntimeSecretEnv(payload: Record<string, unknown>): Record<string, string> {
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

export function buildSecretRedactionValues(runtimeEnv: Record<string, string>): string[] {
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

export function extractSensitiveEnvSubset(runtimeEnv: Record<string, string>): Record<string, string> {
  const sensitive: Record<string, string> = {};
  for (const [key, value] of Object.entries(runtimeEnv)) {
    if (!SENSITIVE_ENV_KEY_PATTERN.test(key)) {
      continue;
    }
    sensitive[key] = value;
  }
  return sensitive;
}

export function redactSecretsInText(value: string, redactionValues: string[]): string {
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

export function formatMockSummary(input: DelegationExecutionInput): string {
  return `Delegation completed by profile ${input.target_profile.id}`;
}

export function normalizeSandboxPolicy(
  value: unknown
): "read-only" | "workspace-write" | "danger-full-access" {
  const candidate = asNonEmptyString(value)?.toLowerCase();
  if (candidate && SANDBOX_POLICIES.has(candidate)) {
    return candidate as "read-only" | "workspace-write" | "danger-full-access";
  }

  return "workspace-write";
}

export function normalizeApprovalPolicy(
  value: unknown
): "never" | "on-request" | "on-failure" | "untrusted" {
  const candidate = asNonEmptyString(value)?.toLowerCase();
  if (candidate && APPROVAL_POLICIES.has(candidate)) {
    return candidate as "never" | "on-request" | "on-failure" | "untrusted";
  }

  return "never";
}

export function parseShellLikeCommand(value: string): { command: string; args: string[] } {
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

export function getPayloadPrompt(payload: Record<string, unknown>): string {
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

export async function resolveAuthJsonBuffer(rawProfilePayload: Buffer): Promise<{
  authJsonBuffer: Buffer;
  source: "auth_json";
}> {
  parseAuthJsonBuffer(rawProfilePayload);
  return {
    authJsonBuffer: rawProfilePayload,
    source: "auth_json"
  };
}

export class DelegationExecutionFailure extends Error implements DelegationExecutionError {
  public constructor(
    public readonly code: DelegationExecutionError["code"],
    message: string
  ) {
    super(message);
    this.name = "DelegationExecutionFailure";
  }
}
