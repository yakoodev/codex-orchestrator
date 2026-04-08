# Telegram: Protocol and Operational Rules

## Integration mode
- MVP mode: long polling.
- Production-ready mode: webhook behind reverse proxy + TLS.

## Proxy Support (Mandatory for MVP)
- The Telegram adapter must support proxy routing in environments where direct access to Telegram Bot API is restricted.
- Runtime variable `TG_PROXY_URL` is optional.
- Supported `TG_PROXY_URL` schemes: `socks5://`, `http://`, `https://`.
- If `TG_PROXY_URL` is set, adapter outbound traffic to Telegram Bot API must be routed through the proxy.
- If `TG_PROXY_URL` is not set, direct Telegram Bot API access is used.

## Commands (MVP)
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

## Current implementation status
- Long polling adapter is implemented with whitelist (`TG_ALLOWED_CHAT_IDS` / `TG_ALLOWED_USER_IDS`), `update_id` deduplication, persisted offset (`TG_STATE_FILE_PATH`), and exponential backoff.
- Proxy routing is implemented via `TG_PROXY_URL` (`socks5://`, `http://`, `https://`).
- Redis Streams bridge for system notifications is implemented (`hold_started`, `switch_started`, `switch_completed`, `switch_skipped`, `hold_released`) with debounce protection.
- All listed commands except `/say` are wired to the live API layer.
- `/say` currently returns an explicit "not supported in current scope" response.

## Security
- Admin command handling must respect single-admin access policy.
- Accept updates only from whitelisted Telegram user IDs/chat IDs.
- Never include secrets/auth payloads in logs.

## Rate limits and retry
- Deduplicate incoming updates by `update_id`.
- Use exponential backoff for Telegram API failures.
- Prevent alert storms via debounce/coalescing.

## System notifications
- `hold_started`
- `switch_started`
- `switch_completed`
- `switch_skipped`
- `hold_released`

## Edge cases
- If Telegram is unavailable, Web/API control path remains operational.
- If proxy is unavailable or misconfigured, only the Telegram channel degrades (commands/notifications), while Web/API and core state remain operational.
- Missing notifications must not affect core state.
- On restart, adapter resumes from the last persisted `update_id`.
