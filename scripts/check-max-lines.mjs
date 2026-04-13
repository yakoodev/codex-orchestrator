#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const MAX_LINES = 500;
const root = process.cwd();

const targets = [
  "src/app.ts",
  "src/runtime/prisma-persistence.ts",
  "public/app.js",
  "test/app.test.ts"
];

function countLines(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.length === 0) {
    return 0;
  }
  return content.split(/\r?\n/).length;
}

const violations = [];
for (const relative of targets) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    violations.push(`${relative}: missing`);
    continue;
  }

  const lines = countLines(full);
  if (lines > MAX_LINES) {
    violations.push(`${relative}: ${lines} > ${MAX_LINES}`);
  }
}

if (violations.length > 0) {
  console.error("Max-lines guard failed:");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log(`Max-lines guard passed (<=${MAX_LINES}) for ${targets.length} files.`);
