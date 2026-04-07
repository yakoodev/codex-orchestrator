# Security Policy

## Supported Scope
Security policy applies to:
- API and event contracts;
- auth-profile lifecycle and storage;
- module execution runtime;
- Docker runtime configuration.

## Reporting a Vulnerability
- Open a private security report to maintainers.
- Include impact, reproduction steps, affected version/tag, and proposed mitigation.
- Do not disclose publicly before coordinated fix.

## Core Security Rules
- No plaintext logging of secrets or auth files.
- Encrypted-at-rest storage for ChatGPT auth profile bundles.
- Single admin token boundary for MVP control operations.
- Full audit trail for upload/activate/switch/revoke operations.

## Threat Model Lite
See [`docs/ru/05-security-threat-model-lite.md`](/docs/ru/05-security-threat-model-lite.md) and [`docs/en/05-security-threat-model-lite.md`](/docs/en/05-security-threat-model-lite.md).
