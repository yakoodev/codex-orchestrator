# SCH-99A: Review Checklist (вердикт "точно / неточно")

## Инструкция
Для каждого пункта проставьте:
- `ТОЧНО` — соответствует ожиданию.
- `НЕТОЧНО` — есть расхождение.
- `НЕЯСНО` — требуется уточнение.

| ID | Схема | Что проверяем | Вердикт | Комментарий |
|---|---|---|---|---|
| SCH-01 | System Context | Границы компонентов и зависимости | ТОЧНО | API-only bootstrap сохраняет целевые boundaries control/data plane без изменения контрактов |
| SCH-02 | Container Deployment | Compose base + optional observability | ТОЧНО | Root `docker compose` путь и `observability` profile синхронизированы |
| SCH-03 | Task State Machine | Полный набор состояний/переходов | ТОЧНО | Recovery зафиксирован как boot/reconcile-процедура без отдельного state |
| SCH-04 | Auth Switch Sequence | Hold/drain/switch/release + edge-cases | ТОЧНО | Добавлена retry-ветка и событие `auth_profile.switch.retried` |
| SCH-05 | Scheduler Guards | Decision logic и запреты на новые старты | ТОЧНО | Release held queue в MVP зафиксирован как `FIFO+priority` |
| SCH-06 | ERD Core | Core кардинальности и связи | ТОЧНО | Полная Prisma схема и baseline migration перенесены в runtime-репозиторий без расхождений |
| SCH-07 | ERD Auth+Modules | Связи модуля/профилей/switch history | ТОЧНО | `CustomModuleConfig` и auth-profile сущности доступны через smoke-core API с DB-backed чтением |
| SCH-08 | API Surface Map | endpoint -> event/audit/state | ТОЧНО | Подтверждено отсутствие `manual switch now` endpoint в MVP |
| SCH-09 | Pack Lifecycle | register/validate/materialize/cache/rotate | ТОЧНО | Mandatory signature gate для pack-архивов в MVP не требуется |
| SCH-10 | Delegation Flow | bus-only delegation и статусы исполнения | ТОЧНО | Timeout-flow: retry до лимита (default 3) -> terminal failed path |
| SCH-11 | Schedule Evaluation | JSON AST + overlap/misfire policy | ТОЧНО | Time predicates нормализованы в UTC, отдельный cooldown не вводится |

## Контроль целостности
- [x] Все Mermaid блоки рендерятся.
- [x] Нет битых ссылок на схемы/контракты.
- [x] Нет противоречий с OpenAPI/Event/Prisma/SQL.
- [x] Edge-case покрытие подтверждено.
- [x] AST-правила без неоднозначных интерпретаций.
- [x] Overlap policy явно фиксирует `skipped_due_to_overlap`.
- [x] fallback по роли не конфликтует с `target_agent_template_id`.
- [x] Нет прямого worker-to-worker вызова вне шины.

## Итоговый вердикт
- Решение: `ГОТОВО К РЕАЛИЗАЦИИ`
- Критичные замечания: нет
- Некритичные замечания: локальные open questions вне Q-001..Q-008 остаются в отдельных схемах
