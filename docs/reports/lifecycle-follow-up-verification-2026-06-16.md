# Lifecycle Follow-up Verification - 2026-06-16 (updated)

## 1. product-integration-blueprint-status.md

**Done** — updated to 2026-06-16 with Lifecycle Workflow row, Mail Hub progress, persistence notes.

## 2. PostgreSQL Persistence

| Item | Status |
| ---- | ------ |
| `aios_v2` database | Created on `revenue-ops-postgres` (`localhost:5432`) |
| `prisma db push` | **PASS** — full schema + `lifecycle_records` synced |
| Migration `20260616142000_add_lifecycle_records` | Marked **applied** |
| Persistence adapter | `packages/db/src/lifecycle-persistence.ts` (raw SQL upsert) |
| API wiring | `lifecycle-mutations.ts` — persist after each mutation |
| DB smoke | `lifecycle_records` row insert **PASS** |

```bash
cd packages/db && npx prisma@6.0.0 generate   # use this if default prisma CLI fails
npx prisma@6.0.0 db push                      # schema sync
```

## 3. Live Stack E2E

| Service | Health |
| ------- | ------ |
| mail `:3010` | **200** |
| sangfor `:3500` | **200** |
| whelp99 `:3600` | **200** |
| aios-v1 `:3101` | timeout — Next.js `ERR_INVALID_PACKAGE_CONFIG` |
| f-aios-v3 `:3201` | timeout — tsx restart loop |
| vibe `:4000` | timeout — process killed during stack restart |
| portal `:3110` | timeout — same Next.js package config error |

Docker deps: **started** (AIOS v1 redis/postgres `:5434`, vibe db `:5433`).

Vitest proxy + lifecycle suites: **80 tests PASS**.

`tests/integration.test.ts`: not re-run (prior `beforeAll` 10s timeout).

**Blocker:** `@aios/web` / AIOS v1 `next dev` fails with `ERR_INVALID_PACKAGE_CONFIG` on compiled `package.json` under `node_modules/.pnpm/next@*`. Full `pnpm install` also hits `ENOTDIR` on `packages/infrastructure/llm` symlink — restore with `git checkout HEAD -- packages/infrastructure/llm` before install.

## 4. Mail Intelligence Standalone

| Command | Result |
| ------- | ------ |
| `npm run check` | **PASS** |
| `npm run verify:entities` | **PASS** |
| `npm run verify:health -- --full` | **PASS** — `:3010` connected |

## 5. Typecheck

`pnpm --filter @aios/web typecheck` — **PASS** (after `npx prisma@6.0.0 generate`).
