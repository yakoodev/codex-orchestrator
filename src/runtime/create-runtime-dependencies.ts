import { S3Client } from "@aws-sdk/client-s3";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import type { AppConfig } from "../config";
import { RedisStreamPublisher } from "../lib/redis-stream-publisher";
import { S3StorageService } from "../lib/s3-storage";
import type {
  DelegationExecutor,
  EventPublisher,
  Persistence,
  StorageService
} from "./contracts";
import { createDelegationExecutor } from "./delegation-executor";
import { PrismaPersistence } from "./prisma-persistence";

export interface RuntimeDependencies {
  persistence: Persistence;
  publisher: EventPublisher;
  storage: StorageService;
  delegationExecutor: DelegationExecutor;
  close(): Promise<void>;
}

export async function createRuntimeDependencies(config: AppConfig): Promise<RuntimeDependencies> {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl
      }
    }
  });

  const redis = new Redis(config.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

  const s3Client = new S3Client({
    region: config.s3Region,
    endpoint: config.s3Endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.s3AccessKey,
      secretAccessKey: config.s3SecretKey
    }
  });

  const storage = new S3StorageService(s3Client, config.s3Bucket);

  await prisma.$connect();
  await redis.connect();
  await storage.ensureBucket();
  const persistence = new PrismaPersistence(prisma);

  return {
    persistence,
    publisher: new RedisStreamPublisher(redis, config.redisStreamKey),
    storage,
    delegationExecutor: createDelegationExecutor({
      config,
      persistence,
      storage
    }),
    close: async () => {
      await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    }
  };
}
