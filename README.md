# codex-orchestrator

Open-source orchestrator bus for Codex workers with limit-aware scheduling, deterministic task state machine, and controllable auth-profile switching.

## Quick Links
- Russian docs: [`docs/ru/00-index.md`](/docs/ru/00-index.md)
- English docs: [`docs/en/00-index.md`](/docs/en/00-index.md)
- Contracts: [`docs/contracts`](/docs/contracts)
- Docker/Ops: [`docs/docker`](/docs/docker)

## Quickstart (Root UX)
```bash
git clone <repo-url>
cd codex-orchestrator
cp .env.example .env
docker compose up -d
```

Health endpoints:
- `GET http://localhost:8080/health/live`
- `GET http://localhost:8080/health/ready`

Local smoke path (after `docker compose up -d`):
```bash
npm ci
npm run smoke:local
```
The smoke script checks auth guard, tasks, delegation, schedules, auth-profiles, custom modules, packs, and queue endpoints.

Optional observability profile:
```bash
docker compose --profile observability up -d
```

## Scope
- MVP stack: Fastify + TypeScript, Next.js, Prisma + SQL migrations, Redis Streams, OpenAPI 3.1.
- Module runtime: TypeScript-first with optional PowerShell adapter.
- Auth mode MVP: single admin token.
- Delivery mode: Docker Compose-first.

## Run Model (Documentation-First)
This repository contains a decision-complete documentation pack and an API-only PR1 bootstrap:
- architecture baseline and ADRs;
- canonical API and event contracts;
- data/runtime specification;
- Docker and operations runbook;
- OSS process and release policy.

## License
Apache-2.0. See [`LICENSE`](LICENSE).
