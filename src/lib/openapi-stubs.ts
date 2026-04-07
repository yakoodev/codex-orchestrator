import { promises as fs } from "node:fs";
import YAML from "yaml";
import type { FastifyInstance, FastifyReply } from "fastify";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"] as const;

function toFastifyPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ":$1");
}

function sendNotImplemented(reply: FastifyReply): FastifyReply {
  return reply.code(501).send({
    error: "Not implemented in PR1",
    code: "NOT_IMPLEMENTED"
  });
}

export async function registerOpenApiStubs(
  app: FastifyInstance,
  openApiPath: string,
  implementedRoutes: Set<string>
): Promise<void> {
  const openApiRaw = await fs.readFile(openApiPath, "utf8");
  const parsed = YAML.parse(openApiRaw) as { paths?: Record<string, Record<string, unknown>> };
  const paths = parsed.paths ?? {};
  const seen = new Set<string>();

  for (const [openApiPathKey, operations] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      if (!(method in operations)) {
        continue;
      }

      const methodUpper = method.toUpperCase();
      const routeKey = `${methodUpper} ${openApiPathKey}`;
      if (implementedRoutes.has(routeKey) || seen.has(routeKey)) {
        continue;
      }

      seen.add(routeKey);
      app.route({
        method: methodUpper as "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD",
        url: toFastifyPath(openApiPathKey),
        handler: async (_request, reply) => sendNotImplemented(reply)
      });
    }
  }
}
