# SCH-99B: Open Questions (сводно)

## Назначение
Файл для фиксации найденных неточностей и потенциальных интерпретаций до старта кодинга.

## Шаблон записи
| ID | Связанная схема | Вопрос/неточность | Риск | Принятое решение |
|---|---|---|---|---|
| Q-001 | SCH-03 |  |  |  |

## Финальные решения (зафиксировано)
| ID | Связанная схема | Вопрос/неточность | Риск | Принятое решение |
|---|---|---|---|---|
| Q-001 | SCH-03 | Нужен ли отдельный state для recovery after restart | Средний | Отдельный recovery-state не вводится; recovery выполняется как boot/reconcile-процедура |
| Q-002 | SCH-04 | Нужно ли отдельное событие `switch_retried` | Низкий | Добавить событие `auth_profile.switch.retried` и фиксировать retry-попытки в switch flow |
| Q-003 | SCH-05 | Требуется ли role-aware release held queue | Средний | В MVP использовать `FIFO+priority`; role-aware release перенести в post-MVP |
| Q-004 | SCH-08 | Нужен ли `manual switch now` endpoint | Средний | В MVP endpoint не вводится; переключение выполняется автоматически логикой шины |
| Q-005 | SCH-09 | Нужно ли обязательное подписание pack-архивов в MVP | Средний | Mandatory signature gate в MVP не требуется; действует admin-only trust policy |
| Q-006 | SCH-10 | Что делать при timeout delegation result | Средний | Timeout -> failed attempt -> parent-policy retry до лимита (default 3), затем terminal failed path |
| Q-007 | SCH-11 | Как нормализовать time-zone для time predicates | Средний | Все time predicates интерпретируются в UTC |
| Q-008 | SCH-11 | Нужен ли отдельный cooldown между schedule runs | Низкий | Отдельный cooldown не вводится; паузы задаются через AST predicates |

## Правило закрытия
Вопрос считается закрытым, когда:
1. Добавлено решение в соответствующий канонический документ.
2. Обновлен traceability row.
3. Отмечено в `SCH-99A`.
