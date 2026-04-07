# Матрица трассировки требований

| Требование | Раздел документации | Schema ID | Acceptance-check |
|---|---|---|---|
| Контракт-first API | `/docs/contracts/openapi.yaml` | SCH-08 | Endpoint map покрыт, нет пропусков групп API |
| Контракты событий | `/docs/contracts/events/*.schema.json` | SCH-08, SCH-04 | Event topics и envelope согласованы |
| Модульный runtime | `/docs/contracts/module-interface.md` + ADR-0002 | SCH-05 | Guard-решения совпадают с `ModuleDecision` |
| Limit-aware switch flow | `/docs/ru/01-architecture.md` + ADR-0003 | SCH-03, SCH-04 | Есть путь `WAITING_LIMIT -> DRAINING_ACTIVE -> SWITCHING_AUTH -> QUEUED` |
| Data model | `/docs/data/prisma/schema.prisma` + SQL | SCH-06, SCH-07 | Кардинальности и связи совпадают с Prisma/SQL |
| Role/Capability packs | `/docs/contracts/openapi.yaml` + `/docs/data/prisma/schema.prisma` | SCH-09, SCH-08 | Pack lifecycle (register/materialize/rotate) формализован и трассируется |
| Bus-only delegation | `/docs/contracts/openapi.yaml` + `/docs/schemas/10-delegation-flow.md` | SCH-10, SCH-08 | Нет прямого worker-to-worker пути, только bus dispatch |
| Auth switch retry observability | `/docs/contracts/events/auth_profile.event.schema.json` + `/docs/schemas/04-auth-switch-sequence.md` | SCH-04, SCH-08 | Retry попытки фиксируются событием `auth_profile.switch.retried` |
| Delegation timeout policy | `/docs/schemas/10-delegation-flow.md` + `/docs/schemas/03-task-state-machine.md` | SCH-10, SCH-03 | Timeout flow: retry до лимита (default 3) -> terminal failed path |
| Hybrid schedules | `/docs/contracts/openapi.yaml` + `/docs/schemas/11-schedule-evaluation-flow.md` | SCH-11, SCH-08 | JSON Rule AST, overlap policy и recovery сценарии описаны без неоднозначности |
| Schedule UTC semantics | `/docs/contracts/openapi.yaml` + `/docs/schemas/11-schedule-evaluation-flow.md` | SCH-11, SCH-08 | `time.*` predicates интерпретируются в UTC, cooldown задается только через AST |
| No manual switch endpoint (MVP) | `/docs/schemas/08-api-surface-map.md` + `/docs/contracts/openapi.yaml` | SCH-08, SCH-04 | Отдельный endpoint `manual switch now` отсутствует в MVP контракте |
| Docker portability | `/docs/docker/docker-compose.example.yml` | SCH-02 | Compose base/optional profile валидированы |
| Telegram proxy operability | `/docs/ru/09-telegram.md` + `/docs/ops/runbook.md` + `/docs/docker/.env.example` | SCH-02 | `TG_PROXY_URL` и деградация Telegram-канала описаны явно, путь Web/API сохраняется |
| Security baseline | `/docs/ru/05-security-threat-model-lite.md` | SCH-04, SCH-07 | Edge-case и audit ветки не нарушают security baseline |
| OSS governance | `/CONTRIBUTING.md`, `/SECURITY.md`, `/CHANGELOG.md` | SCH-99A | Чеклист ревью позволяет финальный verdict |
