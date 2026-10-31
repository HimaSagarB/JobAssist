# Developing JobAssist

JobAssist uses Next.js App Router, React, TypeScript, Prisma and PostgreSQL. Node 24 is required for the native Argon2 password hashing used by the application. The tested local setup runs on an Apple Silicon Mac.

## Local setup

Follow [LOCAL-SETUP.md](LOCAL-SETUP.md), or the commands in [README.md](README.md). Keep `npm run local:db` running in one terminal. In another terminal, run `npm run local:prepare`, `npm run build -- --webpack` and `npm run local:start`.

`prisma.config.ts` is the standard Prisma configuration. `local:prepare` generates the client, applies migrations and seeds built-in themes without loading the sample profile. Demo fixtures are for isolated tests.

Configuration uses `JOBASSIST_*` names. `DATABASE_URL` remains the PostgreSQL connection string. The audit migrated this installation’s environment variable names while keeping the password, encryption secret and existing database unchanged. Browser sessions may require signing in again after the cookie names change.

## Working on the application

- `src/app/(app)/profile`: profile editing and resume import.
- `src/app/(app)/search-plan` and `src/lib/search-plan.ts`: preference editing, preview and filtering.
- `src/app/(app)/ai-connections` and `src/lib/ai/connections.ts`: encrypted named connections and explicit activation.
- `src/lib/ai`: provider adapters, schema validation, generation tasks and fact checks.
- `src/lib/agent`: job discovery, scoring, drafting and daily scheduling.
- `src/app/(app)/applications` and `src/lib/google`: application review, confirmed sending and tracking.
- `src/lib/pdf`: authenticated print pages and Chromium PDF generation.
- `src/lib/settings-data.ts`: transactional settings persistence.
- `src/lib/releases.ts`: this repository’s release and upgrade links.
- `scripts` and `tools/local-db`: local initialization and runtime commands.

Server actions use the authenticated `action()` helper; file/stream routes use `route()`. Validate inputs with Zod. Route all application status changes through the shared status helpers so tracking remains consistent.

Keys stay on the server. Preserve versioned cryptographic labels in `keys.ts` and `secrets.ts` unless implementing a tested credential migration. Preserve applied Prisma migrations; editing them changes their checksums.

## Verification

```sh
npm run lint
npm run typecheck
node --env-file=.env node_modules/vitest/vitest.mjs run --project=node --project=dom
node --env-file=.env node_modules/vitest/vitest.mjs run --project=db
npm run build -- --webpack
npm run test:e2e
```

Database tests require a separate database whose name ends in `_test`; browser tests require one ending in `_e2e`. Create those databases on your local PostgreSQL instance before running the suites. They must never target your real application database. Browser tests launch fake AI, job-search and Google services; live provider tests are opt-in and need their own credentials.

`node scripts/smoke-local.mjs` checks the running production login and captures a private preview under `outputs/` using the generated local login details. Do not commit that directory.

## Containers and CI

`compose.yml` provides the development container setup. `compose.production.yml` builds this repository’s `production` Docker stage. This audit’s local verification uses the native runtime; a successful native build is not a claim that container deployment was verified.

GitHub workflows run checks and contain container/release jobs. Container publication requires a manual dispatch with `publish_image` enabled. The Pages overview requires a manual workflow dispatch. No release is implied merely by pushing code. The project’s release line is `0.1.0`; update checks target `HimaSagarB/JobAssist`.

## Product scope

JobAssist supports discovery, document preparation, review, confirmed email applications and tracking. Multiple saved searches, semantic matching, evidence-backed learning updates and employer website submission adapters remain planned. Do not describe those as implemented until they have working code and appropriate verification.

See [AUDIT.md](AUDIT.md) for audit results, [SECURITY.md](SECURITY.md) for access controls and [ATTRIBUTION.md](ATTRIBUTION.md) for source notices.
