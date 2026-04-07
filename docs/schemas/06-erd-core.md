# SCH-06: ERD Core

## Цель
Подтвердить core-модель данных выполнения задач и артефактов.

## Что валидирует
- Основные сущности pipeline и связи.
- Где фиксируются интервенции, лимиты, логи и артефакты.
- Как связаны scheduling и delegation с задачами и воркерами.

```mermaid
erDiagram
    TASK ||--o{ SUBTASK : contains
    TASK ||--o{ TASK_RUN : executed_as
    TASK ||--o{ ARTIFACT : produces
    TASK ||--o{ INTERVENTION : has
    TASK ||--o{ DELEGATION_REQUEST : requests

    AGENT_TEMPLATE ||--o{ WORKER_INSTANCE : instantiates
    WORKER_INSTANCE ||--o{ TASK_RUN : executes
    AGENT_TEMPLATE ||--o{ SCHEDULED_RULE : target_template
    SCHEDULED_RULE ||--o{ SCHEDULED_RUN : emits
    SCHEDULED_RUN ||--o{ TASK : creates_tasks

    TASK_RUN ||--o{ ARTIFACT : emits
    TASK_RUN ||--o{ INTERVENTION : scoped_by
    TASK_RUN ||--o{ DELEGATION_REQUEST : requester_run

    AUTH_CONTEXT ||--o{ LIMIT_SNAPSHOT : snapshots

    TASK ||--o{ FILE_LOCK : locks
    WORKER_INSTANCE ||--o{ FILE_LOCK : owns
    WORKER_INSTANCE ||--o{ DELEGATION_REQUEST : delegated_executor
```

## Таблица сущностей core
| Сущность | Роль |
|---|---|
| Task | Карточка и состояние задачи |
| Subtask | Декомпозиция и dependency |
| TaskRun | Конкретный запуск worker по задаче |
| Artifact | Diff/log/report/summary |
| Intervention | Действия пользователя/оператора |
| WorkerInstance | Runtime инстанс агента |
| LimitSnapshot | Состояние лимитов по auth context |
| FileLock | Блокировки конфликтных путей |
| ScheduledRule | Гибридное правило запуска агента |
| ScheduledRun | Конкретный запуск правила и его исход |
| DelegationRequest | Межагентный запрос на capability через шину |

## Проверка точности
- [ ] Связи соответствуют Prisma/SQL.
- [ ] Нету core сущности из ТЗ, отсутствующей на ERD.
- [ ] Кардинальности не противоречат pipeline логике.
- [ ] ScheduledRun и DelegationRequest связаны с task/run без разрыва traceability.

## Границы интерпретации
- Не показывает служебные поля (timestamps, checksum, meta_json).
- Не показывает индексы/уникальные ограничения (они в SQL/Prisma).

## Open questions (локально)
- Нужна ли отдельная сущность QueueItem в core-модели?
