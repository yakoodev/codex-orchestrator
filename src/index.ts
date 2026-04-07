import { loadConfig } from "./config";
import { createApp } from "./app";
import { createRuntimeDependencies } from "./runtime/create-runtime-dependencies";

async function main(): Promise<void> {
  const config = loadConfig();
  const runtime = await createRuntimeDependencies(config);
  const app = await createApp({
    config,
    persistence: runtime.persistence,
    publisher: runtime.publisher,
    storage: runtime.storage,
    delegationExecutor: runtime.delegationExecutor
  });

  const shutdown = async (): Promise<void> => {
    app.log.info("Shutting down");
    await Promise.allSettled([app.close(), runtime.close()]);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });

  await app.listen({
    host: "0.0.0.0",
    port: config.port
  });
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
