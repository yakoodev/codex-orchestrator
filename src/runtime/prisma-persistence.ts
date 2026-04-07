import {
  AuthContextType as PrismaAuthContextType,
  ArtifactType as PrismaArtifactType,
  Prisma,
  PrismaClient,
  ProfileStatus,
  TaskStatus as PrismaTaskStatus,
  WorkerRuntimeMode as PrismaWorkerRuntimeMode
} from "@prisma/client";
import type {
  ArtifactEntity,
  AuthContextEntity,
  AuthContextType,
  AuthProfileEntity,
  AuthSwitchEventEntity,
  CreateAuthProfileInput,
  CreateAuthContextInput,
  CreateTaskInput,
  CustomModuleConfigEntity,
  Persistence,
  TaskEntity,
  WorkerEntity
} from "./contracts";
import type { TaskStatus } from "../types";

function toTaskEntity(task: {
  id: string;
  title: string;
  description: string;
  status: PrismaTaskStatus;
  priority: number;
  project_id: string;
  repo_id: string;
  branch: string | null;
}): TaskEntity {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority,
    project_id: task.project_id,
    repo_id: task.repo_id,
    branch: task.branch
  };
}

function toAuthProfileEntity(entity: {
  id: string;
  label: string;
  status: ProfileStatus;
  checksum: string;
  created_at: Date;
}): AuthProfileEntity {
  return {
    id: entity.id,
    label: entity.label,
    status: entity.status,
    checksum: entity.checksum,
    created_at: entity.created_at
  };
}

function toAuthContextEntity(entity: {
  id: string;
  label: string;
  type: PrismaAuthContextType;
  is_enabled: boolean;
}): AuthContextEntity {
  return {
    id: entity.id,
    label: entity.label,
    type: entity.type as AuthContextType,
    is_enabled: entity.is_enabled
  };
}

function toWorkerEntity(entity: {
  id: string;
  status: string;
  runtime_mode: PrismaWorkerRuntimeMode;
  current_task_id: string | null;
}): WorkerEntity {
  return {
    id: entity.id,
    status: entity.status,
    runtime_mode: entity.runtime_mode,
    current_task_id: entity.current_task_id
  };
}

function toArtifactEntity(entity: {
  id: string;
  task_id: string;
  type: PrismaArtifactType;
  path: string;
}): ArtifactEntity {
  return {
    id: entity.id,
    task_id: entity.task_id,
    type: entity.type,
    path: entity.path
  };
}

function toAuthSwitchEventEntity(entity: {
  id: string;
  module_key: string;
  from_auth_profile_id: string | null;
  to_auth_profile_id: string | null;
  reason: string;
  status: "started" | "completed" | "failed" | "skipped";
  started_at: Date;
  ended_at: Date | null;
}): AuthSwitchEventEntity {
  return {
    id: entity.id,
    module_key: entity.module_key,
    from_auth_profile_id: entity.from_auth_profile_id,
    to_auth_profile_id: entity.to_auth_profile_id,
    reason: entity.reason,
    status: entity.status,
    started_at: entity.started_at,
    ended_at: entity.ended_at
  };
}

function toModuleConfigEntity(entity: {
  id: string;
  module_key: string;
  is_enabled: boolean;
  scope: string;
  config_json: Prisma.JsonValue;
}): CustomModuleConfigEntity {
  return {
    id: entity.id,
    module_key: entity.module_key,
    is_enabled: entity.is_enabled,
    scope: entity.scope,
    config_json: entity.config_json as Record<string, unknown>
  };
}

export class PrismaPersistence implements Persistence {
  public constructor(private readonly prisma: PrismaClient) {}

  public async pingDb(): Promise<void> {
    await this.prisma.$queryRawUnsafe("SELECT 1");
  }

  public async createTask(input: CreateTaskInput): Promise<TaskEntity> {
    const created = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        status: input.status as PrismaTaskStatus,
        priority: input.priority,
        project_id: input.project_id,
        repo_id: input.repo_id,
        branch: input.branch,
        source: input.source,
        created_by: input.created_by
      }
    });

    return toTaskEntity(created);
  }

  public async listTasks(status?: TaskStatus): Promise<TaskEntity[]> {
    const tasks = await this.prisma.task.findMany({
      where: status ? { status: status as PrismaTaskStatus } : undefined,
      orderBy: { created_at: "desc" }
    });

    return tasks.map((task) => toTaskEntity(task));
  }

  public async listWorkers(): Promise<WorkerEntity[]> {
    const workers = await this.prisma.workerInstance.findMany({
      orderBy: { started_at: "desc" }
    });

    return workers.map((worker) => toWorkerEntity(worker));
  }

  public async setWorkerStatus(id: string, status: "READY" | "DISABLED"): Promise<boolean> {
    const result = await this.prisma.workerInstance.updateMany({
      where: { id },
      data: { status }
    });

    return result.count > 0;
  }

  public async workerExists(id: string): Promise<boolean> {
    const count = await this.prisma.workerInstance.count({
      where: { id }
    });

    return count > 0;
  }

  public async getWorkerLogs(_id: string): Promise<string[]> {
    void _id;
    return [];
  }

  public async createAuthContext(input: CreateAuthContextInput): Promise<AuthContextEntity> {
    const created = await this.prisma.authContext.create({
      data: {
        label: input.label,
        type: input.type,
        provider: input.provider,
        usage_policy: input.usage_policy as Prisma.InputJsonValue | undefined,
        limit_policy: input.limit_policy as Prisma.InputJsonValue | undefined
      }
    });

    return toAuthContextEntity(created);
  }

  public async listAuthContexts(): Promise<AuthContextEntity[]> {
    const authContexts = await this.prisma.authContext.findMany({
      orderBy: { created_at: "desc" }
    });

    return authContexts.map((authContext) => toAuthContextEntity(authContext));
  }

  public async patchAuthContext(
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
  ): Promise<AuthContextEntity | null> {
    const existing = await this.prisma.authContext.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.authContext.update({
      where: { id },
      data: {
        label: patch.label,
        type: patch.type,
        provider: patch.provider,
        usage_policy: patch.usage_policy as Prisma.InputJsonValue | undefined,
        limit_policy: patch.limit_policy as Prisma.InputJsonValue | undefined,
        is_enabled: patch.is_enabled,
        notes: patch.notes
      }
    });

    return toAuthContextEntity(updated);
  }

  public async disableAuthContext(id: string): Promise<boolean> {
    const result = await this.prisma.authContext.updateMany({
      where: { id },
      data: { is_enabled: false }
    });

    return result.count > 0;
  }

  public async listTaskArtifacts(taskId: string): Promise<ArtifactEntity[]> {
    const artifacts = await this.prisma.artifact.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: "desc" }
    });

    return artifacts.map((artifact) => toArtifactEntity(artifact));
  }

  public async getArtifactById(id: string): Promise<ArtifactEntity | null> {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id }
    });

    if (!artifact) {
      return null;
    }

    return toArtifactEntity(artifact);
  }

  public async createAuthProfile(input: CreateAuthProfileInput): Promise<AuthProfileEntity> {
    const created = await this.prisma.chatGptAuthProfile.create({
      data: {
        label: input.label,
        status: input.status,
        checksum: input.checksum,
        storage_path: input.storage_path,
        meta_json: input.meta_json as Prisma.InputJsonValue,
        uploaded_by: input.uploaded_by
      }
    });

    return toAuthProfileEntity(created);
  }

  public async listAuthProfiles(): Promise<AuthProfileEntity[]> {
    const profiles = await this.prisma.chatGptAuthProfile.findMany({
      orderBy: { created_at: "desc" }
    });

    return profiles.map((profile) => toAuthProfileEntity(profile));
  }

  public async getActiveAuthProfile(): Promise<AuthProfileEntity | null> {
    const active = await this.prisma.chatGptAuthProfile.findFirst({
      where: { status: "active" },
      orderBy: { updated_at: "desc" }
    });

    if (!active) {
      return null;
    }

    return toAuthProfileEntity(active);
  }

  public async activateAuthProfile(id: string, activatedBy: string): Promise<AuthProfileEntity | null> {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.chatGptAuthProfile.findUnique({ where: { id } });
      if (!target) {
        return null;
      }

      await tx.chatGptAuthProfile.updateMany({
        where: { status: "active", id: { not: id } },
        data: { status: "inactive" }
      });

      const activated = await tx.chatGptAuthProfile.update({
        where: { id },
        data: {
          status: "active",
          activated_by: activatedBy
        }
      });

      return toAuthProfileEntity(activated);
    });
  }

  public async deactivateAuthProfile(id: string): Promise<boolean> {
    const result = await this.prisma.chatGptAuthProfile.updateMany({
      where: { id },
      data: {
        status: "inactive",
        activated_by: null
      }
    });

    return result.count > 0;
  }

  public async listAuthSwitchEvents(): Promise<AuthSwitchEventEntity[]> {
    const events = await this.prisma.authSwitchEvent.findMany({
      orderBy: { started_at: "desc" }
    });

    return events.map((event) =>
      toAuthSwitchEventEntity({
        id: event.id,
        module_key: event.module_key,
        from_auth_profile_id: event.from_auth_profile_id,
        to_auth_profile_id: event.to_auth_profile_id,
        reason: event.reason,
        status: event.status,
        started_at: event.started_at,
        ended_at: event.ended_at
      })
    );
  }

  public async listHeldTasks(): Promise<TaskEntity[]> {
    const tasks = await this.prisma.task.findMany({
      where: { status: "WAITING_LIMIT" },
      orderBy: { created_at: "desc" }
    });

    return tasks.map((task) => toTaskEntity(task));
  }

  public async getCustomModuleConfig(key: string): Promise<CustomModuleConfigEntity | null> {
    const moduleConfig = await this.prisma.customModuleConfig.findUnique({
      where: { module_key: key }
    });

    if (!moduleConfig) {
      return null;
    }

    return toModuleConfigEntity(moduleConfig);
  }

  public async createCustomModuleConfig(input: {
    module_key: string;
    is_enabled: boolean;
    scope: string;
    config_json: Record<string, unknown>;
    updated_by: string;
  }): Promise<CustomModuleConfigEntity> {
    const created = await this.prisma.customModuleConfig.create({
      data: {
        module_key: input.module_key,
        is_enabled: input.is_enabled,
        scope: input.scope,
        config_json: input.config_json as Prisma.InputJsonValue,
        updated_by: input.updated_by
      }
    });

    return toModuleConfigEntity(created);
  }

  public async updateCustomModuleConfig(
    key: string,
    patch: {
      is_enabled?: boolean;
      config_json?: Record<string, unknown>;
      updated_by: string;
    }
  ): Promise<CustomModuleConfigEntity | null> {
    const existing = await this.prisma.customModuleConfig.findUnique({ where: { module_key: key } });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.customModuleConfig.update({
      where: { module_key: key },
      data: {
        is_enabled: patch.is_enabled,
        config_json: patch.config_json as Prisma.InputJsonValue | undefined,
        updated_by: patch.updated_by
      }
    });

    return toModuleConfigEntity(updated);
  }
}
