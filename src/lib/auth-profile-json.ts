import path from "node:path";

const AUTH_JSON_FILE_NAME = "auth.json";
const AUTH_JSON_MIME_TYPES = new Set([
  "application/json",
  "text/json",
  "application/octet-stream",
  "text/plain"
]);

export function isAuthJsonFilename(filename: string): boolean {
  return path.basename(filename).trim().toLowerCase() === AUTH_JSON_FILE_NAME;
}

export function hasAuthJsonMime(mimeType: string): boolean {
  return AUTH_JSON_MIME_TYPES.has(mimeType.trim().toLowerCase());
}

export function parseAuthJsonBuffer(authJsonBuffer: Buffer): Record<string, unknown> {
  const rawUtf8 = authJsonBuffer.toString("utf8");
  const raw = rawUtf8.charCodeAt(0) === 0xfeff ? rawUtf8.slice(1) : rawUtf8;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("auth.json must contain valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("auth.json must contain a JSON object");
  }

  return parsed as Record<string, unknown>;
}
