import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const openApiPath = path.resolve(rootDir, "docs", "contracts", "openapi.yaml");
const appPath = path.resolve(rootDir, "src", "app.ts");

function parseOpenApiRoutes(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const doc = YAML.parse(raw);
  const paths = doc.paths ?? {};
  const methods = ["get", "post", "patch", "put", "delete", "options", "head"];
  const routes = new Set();

  for (const [routePath, definition] of Object.entries(paths)) {
    if (!definition || typeof definition !== "object") {
      continue;
    }

    for (const method of methods) {
      if (definition[method]) {
        routes.add(`${method.toUpperCase()} ${routePath}`);
      }
    }
  }

  return routes;
}

function parseImplementedRoutes(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sectionMatch = source.match(
    /const\s+IMPLEMENTED_ROUTES\s*=\s*new\s+Set<string>\(\[(?<content>[\s\S]*?)\]\);/
  );

  if (!sectionMatch?.groups?.content) {
    throw new Error("Cannot find IMPLEMENTED_ROUTES in src/app.ts");
  }

  const content = sectionMatch.groups.content;
  const routes = new Set();
  const routeRegex = /"([^"]+)"/g;
  let match = routeRegex.exec(content);
  while (match) {
    routes.add(match[1]);
    match = routeRegex.exec(content);
  }

  return routes;
}

function printRoutes(title, items) {
  console.error(title);
  for (const item of items) {
    console.error(`- ${item}`);
  }
}

const openApiRoutes = parseOpenApiRoutes(openApiPath);
const implementedRoutes = parseImplementedRoutes(appPath);

const missingFromImplementation = [...openApiRoutes].filter((route) => !implementedRoutes.has(route));
const unknownInImplementation = [...implementedRoutes].filter((route) => !openApiRoutes.has(route));

if (missingFromImplementation.length > 0 || unknownInImplementation.length > 0) {
  console.error("Route coverage check failed.");

  if (missingFromImplementation.length > 0) {
    printRoutes("OpenAPI routes missing in IMPLEMENTED_ROUTES:", missingFromImplementation);
  }

  if (unknownInImplementation.length > 0) {
    printRoutes("IMPLEMENTED_ROUTES entries missing in OpenAPI:", unknownInImplementation);
  }

  process.exit(1);
}

console.log(`Route coverage is valid (${implementedRoutes.size} routes).`);
