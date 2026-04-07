# SCH-04: Auth Switch Sequence

## Цель
Визуально подтвердить поведение hold/drain/switch/release с edge-case ветками.

## Что валидирует
- Последовательность действий при limit pressure.
- Ветки `reset-soon`, `no eligible profile`, `restart recovery`.
- Fail-safe поведение при ошибке модуля.
- Поведение schedule/delegation в период hold/switch.
- Retry-ветку переключения и событие `auth_profile.switch.retried`.

```mermaid
sequenceDiagram
    autonumber
    participant SCH as Scheduler
    participant LIM as LimitManager
    participant MOD as CustomModuleManager
    participant Q as Queue
    participant WM as WorkerManager
    participant SCHX as ScheduleEngine
    participant DLG as DelegationService
    participant APM as AuthProfilePool
    participant UI as Web/TG
    participant DB as Postgres

    SCH->>LIM: read latest limits
    LIM-->>SCH: limit pressure detected
    SCH->>MOD: onEvent(limit.updated)
    MOD->>Q: hold new tasks (WAITING_LIMIT)
    MOD->>UI: notify hold_started

    opt schedule rule fires during hold
        SCHX->>Q: enqueue scheduled task
        Q-->>SCHX: task kept in WAITING_LIMIT
    end

    alt reset < 3h
        MOD->>UI: notify switch_skipped(reset_soon)
        MOD-->>SCH: no_action
    else reset >= 3h
        MOD->>SCH: start DRAINING_ACTIVE
        SCH->>WM: wait active tasks finished
        WM-->>SCH: active_tasks=0
        SCH->>MOD: start_switch

        opt delegation requested during DRAINING_ACTIVE
            DLG->>Q: put delegation request into bus queue
            Q-->>DLG: request waits until switch done
        end

        MOD->>APM: select eligible with max remaining
        alt eligible profile exists
            APM-->>MOD: candidate profile
            MOD->>APM: switch active profile
            opt switch attempt failed && retry budget available
                MOD->>DB: persist auth_switch_event(retried)
                MOD->>UI: notify auth_profile.switch.retried
                MOD->>APM: retry switch active profile
            end
            MOD->>WM: recycle warm workers
            MOD->>Q: release held tasks to QUEUED
            MOD->>UI: notify switch_completed + hold_released
            MOD->>DB: persist auth_switch_event(completed)
        else no eligible profile
            APM-->>MOD: none
            MOD->>UI: notify switch_skipped(no_eligible)
            MOD->>DB: persist auth_switch_event(skipped)
        end
    end

    opt module execution error
        MOD->>DB: persist module.execution.failed
        MOD->>UI: notify fail-safe hold remains
    end

    opt orchestrator restart in WAITING_LIMIT/DRAINING_ACTIVE/SWITCHING_AUTH
        SCH->>DB: recover last state and held tasks
        SCH->>UI: notify recovery_resumed
    end
```

## Таблица edge-case решений
| Сценарий | Ожидаемое поведение | Потеря задач допустима |
|---|---|---|
| reset-soon guard | switch пропускается, остаемся в WAITING_LIMIT | Нет |
| no eligible profile | switch не выполняется, hold сохраняется | Нет |
| module failed | fail-safe, очередь не теряется | Нет |
| switch retried | фиксируется `auth_profile.switch.retried`, затем продолжение switch flow | Нет |
| restart mid-switch | recovery из БД + продолжение | Нет |
| schedule fired while hold | scheduled task удерживается до release | Нет |
| delegation during draining | запрос делегации не теряется, исполняется после switch | Нет |

## Проверка точности
- [ ] Выбор профиля: max remaining limits.
- [ ] Активные задачи не прерываются.
- [ ] После switch warm workers перезапускаются.
- [ ] Все ключевые уведомления в Web/TG присутствуют.
- [ ] Retry switch фиксируется отдельным событием `auth_profile.switch.retried`.

## Границы интерпретации
- Не фиксирует внутренний формат лимитов provider API.
- Не описывает UI макеты уведомлений.

## Локальное решение
- В MVP используется отдельное событие/уведомление `auth_profile.switch.retried`.
