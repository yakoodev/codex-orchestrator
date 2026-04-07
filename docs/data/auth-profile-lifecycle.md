# ChatGPT Auth Profile Lifecycle

## Flow
1. Upload ZIP bundle via admin endpoint.
2. Validate bundle structure and store checksum as technical fingerprint.
3. Encrypt and persist bundle.
4. Insert metadata row in `ChatGptAuthProfile`.
5. Activate/deactivate via control API.
6. Use active profile for new worker starts.
7. Record switch events in `AuthSwitchEvent`.
8. Revoke by setting status `blocked` and removing runtime eligibility.

## Validation requirements
- ZIP must contain expected auth files for Codex runtime.
- Invalid archive is rejected with explicit error.
- No extracted plaintext auth files in logs.
- MVP trust policy is admin-only upload/register; checksum is not a mandatory signature gate.

## Audit requirements
- Upload actor, activation actor, switch reason, and timestamps are mandatory.
