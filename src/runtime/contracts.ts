import type { TaskStatus } from "../types";

export interface TaskEntity {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  project_id: string;
  repo_id: string;
  branch: string | null;
}

export type AuthContextType = "apikey" | "chatgpt" | "chatgptAuthTokens";
export type WorkerRuntimeMode = "ondemand" | "warm_pool" | "dedicated";

export interface AuthProfileEntity {
  id: string;
  label: string;
  status: "active" | "inactive" | "blocked";
  checksum: string;
  created_at: Date;
}

export interface AuthSwitchEventEntity {
  id: string;
  module_key: string;
  from_auth_profile_id: string | null;
  to_auth_profile_id: string | null;
  reason: string;
  status: "started" | "completed" | "failed" | "skipped";
  started_at: Date;
  ended_at: Date | null;
}

export interface CustomModuleConfigEntity {
  id: string;
  module_key: string;
  is_enabled: boolean;
  scope: string;
  config_json: Record<string, unknown>;
}

export interface AuthContextEntity {
  id: string;
  label: string;
  type: AuthContextType;
  is_enabled: boolean;
}

export interface WorkerEntity {
  id: string;
  status: string;
  runtime_mode: WorkerRuntimeMode;
  current_task_id: string | null;
}

export interface ArtifactEntity {
  id: string;
  task_id: string;
  type: "diff" | "patch" | "log" | "test_report" | "screenshot" | "summary" | "trace";
  path: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  project_id: string;
  repo_id: string;
  branch: string | null;
  priority: number;
  status: TaskStatus;
  source: string;
  created_by: string;
}

export interface CreateAuthProfileInput {
  label: string;
  status: "active" | "inactive" | "blocked";
  checksum: string;
  storage_path: string;
  meta_json: Record<string, unknown>;
  uploaded_by: string;
}

export interface CreateAuthContextInput {
  label: string;
  type: AuthContextType;
  provider: string;
  usage_policy?: Record<string, unknown>;
  limit_policy?: Record<string, unknown>;
}

export interface EventPublishInput {
  eventType: string;
  traceId: string;
  payload: Record<string, unknown>;
  taskId?: string | null;
  workerId?: string | null;
  idempotencyKey?: string | null;
}

export interface Persistence {
  pingDb(): Promise<void>;
  createTask(input: CreateTaskInput): Promise<TaskEntity>;
  listTasks(status?: TaskStatus): Promise<TaskEntity[]>;
  listWorkers(): Promise<WorkerEntity[]>;
  setWorkerStatus(id: string, status: "READY" | "DISABLED"): Promise<boolean>;
  workerExists(id: string): Promise<boolean>;
  getWorkerLogs(id: string): Promise<string[]>;
  createAuthContext(input: CreateAuthContextInput): Promise<AuthContextEntity>;
  listAuthContexts(): Promise<AuthContextEntity[]>;
  patchAuthContext(
    id: string,
    patch: {
      label?: string;
      type?: AuthContextType;
      provider?: string;
      usage_policy?: Record<string, unknown>;
      limit_policy?: Record<string, unknown>;
      is_enabled?: boolean;
      notes?: string;
    }
  ): Promise<AuthContextEntity | null>;
  disableAuthContext(id: string): Promise<boolean>;
  listTaskArtifacts(taskId: string): Promise<ArtifactEntity[]>;
  getArtifactById(id: string): Promise<ArtifactEntity | null>;
  createAuthProfile(input: CreateAuthProfileInput): Promise<AuthProfileEntity>;
  listAuthProfiles(): Promise<AuthProfileEntity[]>;
  getActiveAuthProfile(): Promise<AuthProfileEntity | null>;
  activateAuthProfile(id: string, activatedBy: string): Promise<AuthProfileEntity | null>;
  deactivateAuthProfile(id: string): Promise<boolean>;
  listAuthSwitchEvents(): Promise<AuthSwitchEventEntity[]>;
  listHeldTasks(): Promise<TaskEntity[]>;
  getCustomModuleConfig(key: string): Promise<CustomModuleConfigEntity | null>;
  createCustomModuleConfig(input: {
    module_key: string;
    is_enabled: boolean;
    scope: string;
    config_json: Record<string, unknown>;
    updated_by: string;
  }): Promise<CustomModuleConfigEntity>;
  updateCustomModuleConfig(
    key: string,
    patch: {
      is_enabled?: boolean;
      config_json?: Record<string, unknown>;
      updated_by: string;
    }
  ): Promise<CustomModuleConfigEntity | null>;
}

export interface StorageService {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  checkReady(): Promise<void>;
  ensureBucket(): Promise<void>;
}

export interface EventPublisher {
  ping(): Promise<void>;
  publish(event: EventPublishInput): Promise<void>;
}
