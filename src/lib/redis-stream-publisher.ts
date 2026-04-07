import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import type { EventPublishInput, EventPublisher } from "../runtime/contracts";

interface EventEnvelope {
  event_id: string;
  event_type: string;
  timestamp: string;
  trace_id: string;
  task_id: string | null;
  worker_id: string | null;
  idempotency_key: string | null;
  version: string;
  payload: Record<string, unknown>;
}

export class RedisStreamPublisher implements EventPublisher {
  private readonly version = "1.0";

  public constructor(
    private readonly redis: Redis,
    private readonly streamKey: string
  ) {}

  public async ping(): Promise<void> {
    await this.redis.ping();
  }

  public async publish(event: EventPublishInput): Promise<void> {
    const envelope: EventEnvelope = {
      event_id: randomUUID(),
      event_type: event.eventType,
      timestamp: new Date().toISOString(),
      trace_id: event.traceId,
      task_id: event.taskId ?? null,
      worker_id: event.workerId ?? null,
      idempotency_key: event.idempotencyKey ?? null,
      version: this.version,
      payload: event.payload
    };

    await this.redis.xadd(this.streamKey, "*", "event", JSON.stringify(envelope));
  }
}
