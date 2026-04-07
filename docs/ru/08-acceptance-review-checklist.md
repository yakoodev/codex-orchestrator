# Чеклист проверки полноты документации

## Contract completeness
- OpenAPI покрывает все endpoint из ТЗ.
- Для всех обязательных событий есть JSON schema и пример payload.

## Traceability
- Каждый ключевой пункт ТЗ ссылается на конкретный docs/contract артефакт.

## Scenario walkthrough (расширенный набор)
- limit/no-limit
- hold
- drain
- switch
- no eligible profile
- reset-soon guard
- restart recovery
- invalid auth.json
- audit completeness
- hold release
- pack lifecycle (register/materialize/rotate)
- bus-only delegation
- schedule overlap (`skipped_due_to_overlap`)
- schedule recovery after restart
- auth switch retry (`auth_profile.switch.retried`)
- delegation timeout: retry до лимита (default 3) -> terminal failed path
- schedule time predicates в UTC
- отсутствие `manual switch now` endpoint в MVP API
- Telegram blocked region + valid `TG_PROXY_URL`
- Telegram blocked region + invalid/unavailable `TG_PROXY_URL` (путь Web/API остается рабочим)

## Operability
- По документации можно поднять compose и пройти smoke-check.

## Security
- Secret handling описан без пробелов.
- Admin token boundary и audit trail формализованы.

## OSS readiness
- License/Contributing/Changelog/Issue templates на месте.
