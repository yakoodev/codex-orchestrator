# Схемы (канонический слой верификации)

Этот раздел — визуальный и проверочный канон перед разработкой. Контракты API/событий/данных не заменяются, а верифицируются.

## Карта схем
| ID | Файл | Что валидирует |
|---|---|---|
| SCH-00 | `/docs/schemas/00-index.md` | Навигация и связь с контрактами |
| SCH-01 | `/docs/schemas/01-system-context.md` | System context и границы control/data plane |
| SCH-02 | `/docs/schemas/02-container-deployment.md` | Deployment в Docker Compose + observability profile |
| SCH-03 | `/docs/schemas/03-task-state-machine.md` | State machine и переходы задач |
| SCH-04 | `/docs/schemas/04-auth-switch-sequence.md` | Hold/Drain/Switch/Release и edge-case ветки |
| SCH-05 | `/docs/schemas/05-scheduler-guards.md` | Guard-правила scheduler и decision logic |
| SCH-06 | `/docs/schemas/06-erd-core.md` | ERD core домена |
| SCH-07 | `/docs/schemas/07-erd-auth-modules.md` | ERD auth/module подсистемы |
| SCH-08 | `/docs/schemas/08-api-surface-map.md` | API surface map + endpoint/event/audit/state таблица |
| SCH-09 | `/docs/schemas/09-pack-lifecycle.md` | Lifecycle role/capability packs |
| SCH-10 | `/docs/schemas/10-delegation-flow.md` | Межагентная делегация через шину |
| SCH-11 | `/docs/schemas/11-schedule-evaluation-flow.md` | Оценка hybrid rules и запуск scheduled runs |
| SCH-99A | `/docs/schemas/99-review-checklist.md` | Итоговый чеклист верификации |
| SCH-99B | `/docs/schemas/99-open-questions.md` | Сводные возможные неточности |

## Связь с контрактами
- OpenAPI: `/docs/contracts/openapi.yaml`
- Event schemas: `/docs/contracts/events/*.schema.json`
- Prisma/SQL: `/docs/data/prisma/schema.prisma`, `/docs/data/sql/0001_init.sql`

## Как читать
1. Проверить схему.
2. Сверить с таблицей "Проверка точности".
3. Проверить "Границы интерпретации".
4. Зафиксировать замечания в `SCH-99B`.
5. Дать бинарный verdict `ТОЧНО/НЕТОЧНО/НЕЯСНО` по каждому ID в `SCH-99A`.
