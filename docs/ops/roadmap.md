# Product Roadmap (Post-PR1)

Обновлено: 2026-04-08  
Статус PR1: в активной реализации (API-first).

Этот roadmap фиксирует ближайшие продуктовые улучшения после закрытия PR1.

## Planned: Operator visibility for agents
- Статус: `in_progress`.
- Цель: отдельные карточки для `starting/running` агентов в UI.
- В карточке агента:
  - входной prompt (что отправлено агенту);
  - активный auth/account профиль;
  - лог рассуждения/выполнения (в безопасном redacted-виде).
- Текущий прогресс:
  - добавлен API `GET /api/delegation/cards` c группами `preparing/running/recent`;
  - добавлены UI-карточки агентов в встроенной панели `/ui/`;
  - в карточках показываются prompt, template/model, выбранный account и log preview.
- Остается:
  - углубить потоковые runtime-логи по running-агентам;
  - добавить более детальный drill-down по каждому запуску.

## Planned: Project/Agent Memory System
- Статус: `planned`.
- Цель: память по проекту и по ролям агентов (designer/tester/etc).
- Базовый scope:
  - хранилище памяти с привязкой `project_id + agent_role`;
  - запись/чтение памяти в workflow задач и делегаций;
  - UI-представление памяти для оператора.
- Пример сценария: дизайнер фиксирует GUI-контекст, тестировщик использует эту память для более быстрой навигации и регресс-проверок.

## Planned: Account Fleet Cards
- Статус: `in_progress`.
- Цель: карточки аккаунтов с обзором “зоопарка” auth-профилей.
- В карточке аккаунта:
  - понятное имя/label;
  - текущие лимиты (5h/weekly, used/remaining, reset time);
  - статус (active/inactive/blocked);
  - быстрые действия (activate/deactivate, drill-down в лимиты и историю switch).
- Текущий прогресс:
  - добавлены UI-карточки account fleet в `/ui/`;
  - лимиты подтягиваются live через `GET /api/auth-profiles/chatgpt/{id}/limits` для каждого профиля.
- Остается:
  - добавить быстрые inline-экшены на карточках;
  - добавить расширенный history drill-down по аккаунту.
