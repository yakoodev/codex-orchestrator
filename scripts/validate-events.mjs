import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const eventsDir = path.join(root, "docs", "contracts", "events");

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const files = fs
  .readdirSync(eventsDir)
  .filter((file) => file.endsWith(".schema.json"));

for (const file of files) {
  const filePath = path.join(eventsDir, file);
  const schema = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const valid = ajv.validateSchema(schema);
  if (!valid) {
    console.error(`Invalid JSON schema: ${file}`);
    console.error(ajv.errors);
    process.exit(1);
  }
}

console.log(`Validated ${files.length} event schemas`);
