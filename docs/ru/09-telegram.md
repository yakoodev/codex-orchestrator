# Telegram: протокол и операционные правила

## Режим интеграции
- MVP режим: long polling.
- Production-ready режим: webhook (через reverse proxy + TLS).

## Поддержка proxy (обязательно для MVP)
- Telegram-адаптер должен поддерживать работу через proxy в средах, где прямой доступ к Telegram Bot API ограничен.
- Runtime-параметр `TG_PROXY_URL` опционален.
- Поддерживаемые схемы `TG_PROXY_URL`: `socks5://`, `http://`, `https://`.
- Если `TG_PROXY_URL` задан, исходящий трафик адаптера к Telegram Bot API должен идти через proxy.
- Если `TG_PROXY_URL` не задан, используется прямой доступ к Telegram Bot API.

## Команды (MVP)
- `/tasks`
- `/task <id>`
- `/say <id> <message>`
- `/pause <id>`
- `/resume <id>`
- `/stop <id>`
- `/replan <id> <message>`
- `/approve <id>`
- `/reject <id>`
- `/logs <id>`
- `/artifacts <id>`
- `/limit`
- `/switch-status`
- `/held`
- `/switch-history`

## Безопасность
- Все команды администрирования требуют соответствия single-admin политике.
- Команды принимаются только от whitelisted Telegram user IDs/chat IDs.
- Логи не должны содержать auth-данные и секреты.

## Rate limits и retry
- Дедупликация входящих update по `update_id`.
- Экспоненциальный backoff при ошибках Telegram API.
- Защита от штормов уведомлений через debounce/coalescing.

## Системные уведомления
- `hold_started`
- `switch_started`
- `switch_completed`
- `switch_skipped`
- `hold_released`

## Операционные edge-cases
- Если Telegram недоступен, управление через Web/API остается функциональным.
- Если proxy недоступен или задан некорректно, деградирует только Telegram-канал (команды/уведомления), Web/API и core state machine остаются функциональными.
- Потерянные уведомления не влияют на core state machine.
- После рестарта адаптер продолжает обработку с последнего зафиксированного `update_id`.
