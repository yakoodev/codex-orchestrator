import path from "node:path";
import JSZip from "jszip";

const ZIP_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream"
]);

const AUTH_JSON_ENTRY_PATHS = new Set(["auth.json", ".codex/auth.json"]);

export interface ExtractedAuthJsonFromArchive {
  authJsonBuffer: Buffer;
  authJsonEntryPath: string;
  fileEntries: string[];
}

function normalizeZipEntryPath(entryPath: string): string {
  const normalized = path.posix.normalize(entryPath).replace(/^(\.\/)+/, "");
  if (!normalized || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`Unsafe ZIP entry path: ${entryPath}`);
  }

  const segments = normalized.split("/").filter((segment) => segment.length > 0 && segment !== ".");
  if (segments.some((segment) => segment === "..")) {
    throw new Error(`Unsafe ZIP entry path: ${entryPath}`);
  }

  return segments.join("/");
}

export function hasZipMime(mimeType: string): boolean {
  return ZIP_MIME_TYPES.has(mimeType);
}

export function looksLikeZipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

export function parseAuthJsonBuffer(authJsonBuffer: Buffer): Record<string, unknown> {
  const raw = authJsonBuffer.toString("utf8");

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

export async function extractAuthJsonFromZipBuffer(
  zipBuffer: Buffer
): Promise<ExtractedAuthJsonFromArchive> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const files: { entryPath: string; entry: JSZip.JSZipObject }[] = [];

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) {
      continue;
    }

    files.push({
      entryPath: normalizeZipEntryPath(entry.name),
      entry
    });
  }

  if (files.length === 0) {
    throw new Error("ZIP archive is empty");
  }

  const authEntry = files.find((item) => AUTH_JSON_ENTRY_PATHS.has(item.entryPath));
  if (!authEntry) {
    throw new Error("ZIP must contain auth.json");
  }

  const authJsonBuffer = await authEntry.entry.async("nodebuffer");
  if (authJsonBuffer.length === 0) {
    throw new Error("auth.json must not be empty");
  }

  parseAuthJsonBuffer(authJsonBuffer);

  return {
    authJsonBuffer,
    authJsonEntryPath: authEntry.entryPath,
    fileEntries: files.map((item) => item.entryPath)
  };
}
