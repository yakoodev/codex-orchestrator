import SwaggerParser from "@apidevtools/swagger-parser";
import { fileURLToPath } from "node:url";
import path from "node:path";

const openApiPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs",
  "contracts",
  "openapi.yaml"
);

try {
  await SwaggerParser.validate(openApiPath);
  console.log("OpenAPI contract is valid");
} catch (error) {
  console.error("OpenAPI validation failed");
  console.error(error);
  process.exit(1);
}
