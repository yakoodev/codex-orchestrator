# ChatGPT Auth Profile Lifecycle

## Flow
1. Upload ZIP archive via admin endpoint.
2. Validate archive structure (`auth.json` is mandatory and must be the only file).
3. Extract and validate `auth.json`, store checksum as technical fingerprint.
4. Persist only extracted `auth.json` object in storage.
5. Insert metadata row in `ChatGptAuthProfile`.
6. Activate/deactivate via control API.
7. Use active profile for new worker starts (runtime writes `auth.json` to isolated `CODEX_HOME`).
8. Record switch events in `AuthSwitchEvent`.
9. Revoke by setting status `blocked` and removing runtime eligibility.

## Validation requirements
- ZIP must contain exactly one `auth.json` file.
- `auth.json` must be valid JSON object.
- Invalid archive is rejected with explicit error.
- No extracted plaintext auth files in logs.
- MVP trust policy is admin-only upload/register; checksum is not a mandatory signature gate.

## Audit requirements
- Upload actor, activation actor, switch reason, and timestamps are mandatory.
