import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://orchestrator:orchestrator@localhost:5432/orchestrator";
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaCliEntrypoint = path.join(rootDir, "node_modules", "prisma", "build", "index.js");

const result = spawnSync(process.execPath, [prismaCliEntrypoint, "validate"], {
  stdio: "inherit",
  env: process.env
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
