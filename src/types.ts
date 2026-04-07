export const TASK_STATUSES = [
  "NEW",
  "QUEUED",
  "ASSIGNED",
  "STARTING",
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_LIMIT",
  "DRAINING_ACTIVE",
  "SWITCHING_AUTH",
  "WAITING_USER",
  "INTERRUPTING",
  "INTERRUPTED",
  "REPLANNING",
  "BLOCKED",
  "FAILED_RETRYABLE",
  "FAILED_TERMINAL",
  "DONE",
  "ARCHIVED"
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface ErrorResponse {
  error: string;
  code: string;
}

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}
