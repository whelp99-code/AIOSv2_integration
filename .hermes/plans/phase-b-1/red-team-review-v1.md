# Red Team Review: Phase B-1 (DB Migration)

**Date:** 2026-06-14
**Scope:** `packages/db/` — Prisma schema, client, migration scripts, rollback scripts
**Reviewers:** Security, Architecture, Quality, Operations, Requirements

---

## Summary

Phase B-1 consolidates AIOS v1, v3, and new v2 entities into a single Prisma schema with migration scripts. The implementation is functional but has significant security, reliability, and operational gaps that must be addressed before production use.

**Findings:** 3 Critical · 4 High · 6 Medium · 4 Low

---

## 1. Security Reviewer

### CRITICAL — S1: OAuth Tokens Stored in Plaintext
- **File:** `packages/db/prisma/schema.prisma` (lines 39-52)
- **Evidence:** `Account` model stores `refresh_token`, `access_token`, `id_token` as plain `String?` fields with no encryption at rest configuration.
- **Impact:** Database breach exposes all OAuth tokens. Attackers gain full access to linked provider accounts.
- **Recommendation:** Implement application-level encryption (e.g., AES-256-GCM) for token fields. Use Prisma middleware or custom serializer. Consider using a secrets vault for production.

### CRITICAL — S2: No Row-Level Security or Tenant Isolation
- **File:** `packages/db/prisma/schema.prisma` (entire schema)
- **Evidence:** All models use `userId` foreign keys but there is no RLS policy, no Prisma middleware for tenant filtering, and no database-level access control. Queries like `prisma.workflow.findMany()` return ALL rows across all users.
- **Impact:** Any code path that forgets `where: { userId }` leaks cross-tenant data. The migration scripts themselves demonstrate this — `migrateWorkflowSteps()` (line 46) fetches ALL workflows without user filtering.
- **Recommendation:** Implement Prisma extension middleware that automatically injects `userId` filters. Add PostgreSQL RLS policies as defense-in-depth.

### HIGH — S3: Migration Scripts Use Hardcoded System User ID
- **File:** `packages/db/scripts/migrate-v1.ts` (line 40)
- **Evidence:** `userId: 'system-migration-v1'` is a magic string used to fill missing user references. This is not a valid User FK — it will fail with FK constraints if `User` table has referential integrity, or create orphaned data if it doesn't.
- **Impact:** Data integrity violation. Rollback script (`rollback.ts` line 78) sets `userId: ''` which is also invalid.
- **Recommendation:** Create a dedicated system user in a pre-migration step. Use a UUID and store it in a migration metadata table.

### MEDIUM — S4: No Migration Dry-Run or Preview Mode
- **File:** `packages/db/scripts/migrate-v1.ts`, `packages/db/scripts/migrate-v3.ts`
- **Evidence:** Both migration scripts execute destructive writes immediately with no `--dry-run` flag, no preview of changes, and no confirmation prompt.
- **Impact:** Accidental execution in production could corrupt data before anyone intervenes.
- **Recommendation:** Add `--dry-run` flag that logs intended changes without executing. Add `--confirm` flag for production runs.

---

## 2. Architecture Reviewer

### HIGH — A1: Schema Version Conflict — Two Prisma Schemas Exist
- **File:** `packages/db/prisma/schema.prisma` vs `packages/db/prisma/schema 2.prisma`
- **Evidence:** Two schema files exist. `schema.prisma` (421 lines) has `WorkflowStep`, `startStep`, `variables`, `stepResults` fields. `schema 2.prisma` (394 lines) does NOT have these v3-migrated fields. The presence of a file named `schema 2.prisma` suggests a merge conflict or accidental copy.
- **Impact:** If `schema 2.prisma` is accidentally used (e.g., by tooling that picks the wrong file), the v3 migration is silently undone. The space in the filename is also problematic for some tooling.
- **Recommendation:** Delete `schema 2.prisma`. It appears to be the pre-v3-migration snapshot. Archive it outside `prisma/` if needed for reference.

### HIGH — A2: No Transaction Boundaries in Migration Scripts
- **File:** `packages/db/scripts/migrate-v1.ts` (lines 30-55), `packages/db/scripts/migrate-v3.ts` (lines 42-99)
- **Evidence:** Each record is updated individually in a loop with no transaction wrapping. If the script fails mid-way, some records are migrated and others are not, leaving the database in an inconsistent state.
- **Impact:** Partial migration state is unrecoverable without manual intervention.
- **Recommendation:** Wrap each migration function in `prisma.$transaction()`. For large datasets, implement chunked transactions.

### MEDIUM — A3: Status Normalization Loses Semantic Information
- **File:** `packages/db/scripts/migrate-v3.ts` (lines 142-168)
- **Evidence:** `normalizeWorkflowStatus()` maps `draft`, `paused`, `running`, `archived` → all to `active`. This destroys semantic distinctions — an `archived` workflow becomes `active`, which is semantically wrong.
- **Impact:** Users cannot distinguish between archived/paused/running workflows after migration.
- **Recommendation:** Map to semantically correct equivalents: `draft` → `draft`, `paused` → `paused`, `running` → `active`, `archived` → `completed`. Update the status enum accordingly.

### MEDIUM — A4: AgentJob Has No Relation to Task
- **File:** `packages/db/prisma/schema.prisma` (lines 135-148)
- **Evidence:** `AgentJob` has `taskId String` but no `@relation` to `Task`. The FK constraint is missing, allowing orphaned jobs with invalid taskIds.
- **Impact:** Data integrity issue — jobs can reference non-existent tasks.
- **Recommendation:** Add proper relation: `task Task @relation(fields: [taskId], references: [id])`.

---

## 3. Quality Reviewer

### HIGH — Q1: No Tests for Migration or Rollback Scripts
- **File:** `packages/db/` — no test files exist
- **Evidence:** Zero test files in the `packages/db/` directory. No unit tests, no integration tests, no migration verification tests.
- **Impact:** Migrations are untested. Any schema change or data issue is discovered only in production.
- **Recommendation:** Add tests with a test database: verify migration produces expected row counts, verify rollback restores original state, verify idempotency.

### MEDIUM — Q2: Error Handling Logs but Continues on Failure
- **File:** `packages/db/scripts/migrate-v1.ts` (lines 45-47), `packages/db/scripts/migrate-v3.ts` (lines 90-92)
- **Evidence:** Per-record errors are collected in `errors[]` but the script continues processing. The final summary shows error count but the exit code is always 0 (success).
- **Impact:** Silent failures in CI/CD pipelines — migration "succeeds" even with data loss.
- **Recommendation:** Exit with non-zero code if any errors occurred. Add `process.exit(totalErrors > 0 ? 1 : 0)` at the end.

### MEDIUM — Q3: LearningData Has No User Relation
- **File:** `packages/db/prisma/schema.prisma` (lines 305-316)
- **Evidence:** `LearningData` has `userId String` but no `@relation` to `User`. No FK constraint.
- **Impact:** Orphaned learning data can accumulate. No cascade delete when user is removed (GDPR concern).
- **Recommendation:** Add relation to User model.

### LOW — Q4: Inconsistent Table Mapping
- **File:** `packages/db/prisma/schema.prisma`
- **Evidence:** Some models have `@@map()` (e.g., `Account` → `accounts`, `Workflow` → `workflows`) but `User`, `Project`, `Task`, `Result`, `AgentJob` do NOT have `@@map()`. Prisma default table names are PascalCase (`User`, `Project`), while mapped ones are snake_case.
- **Impact:** Inconsistent naming in the database. Minor but makes raw SQL queries confusing.
- **Recommendation:** Add `@@map()` to all models for consistent snake_case naming.

### LOW — Q5: MailMessage Body Stored as Plain Text
- **File:** `packages/db/prisma/schema.prisma` (lines 206-224)
- **Evidence:** `body String?` stores full email body as plaintext. No size limit, no compression, no encryption.
- **Impact:** Potential PII exposure. Large emails could cause performance issues.
- **Recommendation:** Consider encryption for PII fields. Add column-level size constraints.

---

## 4. Operations Reviewer

### HIGH — O1: No Backup/Restore Procedure
- **File:** `packages/db/scripts/` — no backup script exists
- **Evidence:** Migration scripts run destructive operations but there is no pre-migration backup script or documentation.
- **Impact:** Failed migration with no backup = permanent data loss.
- **Recommendation:** Create `scripts/backup.ts` that exports current state before migration. Document restore procedure.

### MEDIUM — O2: Prisma Client Singleton Leaks in Development
- **File:** `packages/db/src/client.ts` (lines 3-16)
- **Evidence:** `globalForPrisma.prisma` persists across hot reloads in development. While intentional to avoid connection pool exhaustion, there's no connection health check or reconnection logic.
- **Impact:** Stale connections after database restarts in development.
- **Recommendation:** Add `$connect()` health check or connection retry middleware.

### MEDIUM — O3: Migration Scripts Lack Logging Verbosity Control
- **File:** `packages/db/scripts/migrate-v1.ts`, `packages/db/scripts/migrate-v3.ts`
- **Evidence:** Output is emoji-based console.log only. No structured logging, no log level control, no file output option.
- **Impact:** Difficult to audit migration in production. Cannot pipe logs to monitoring systems.
- **Recommendation:** Use a structured logger (e.g., pino). Add `--log-level` and `--log-file` flags.

### LOW — O4: No Migration Lock Mechanism
- **File:** `packages/db/scripts/migrate-v1.ts`, `packages/db/scripts/migrate-v3.ts`
- **Evidence:** No advisory lock or mutex prevents concurrent execution of migration scripts.
- **Impact:** Running two instances simultaneously could cause data corruption.
- **Recommendation:** Use PostgreSQL advisory locks (`pg_advisory_lock`) at the start of migration.

---

## 5. Requirements Reviewer

### CRITICAL — R1: Rollback Restores Invalid State
- **File:** `packages/db/scripts/rollback.ts` (lines 76-79, 87-90)
- **Evidence:** `rollbackV1()` sets `userId: ''` (empty string) for Customer and Partner records. This is an invalid state — the schema requires `userId String` (non-nullable) and if a FK constraint exists to User, this will fail. Even without FK, empty userId means these records are unowned and inaccessible.
- **Impact:** Rollback produces a worse state than the migrated state. Data becomes orphaned.
- **Recommendation:** Rollback should restore the original `userId` values (which should be captured in a migration log before migration runs).

### LOW — R2: Schema Does Not Support Multi-Database
- **File:** `packages/db/prisma/schema.prisma` (lines 8-11)
- **Evidence:** `datasource db { provider = "postgresql" }` is hardcoded to PostgreSQL. No SQLite support for testing.
- **Impact:** Cannot run tests without a PostgreSQL instance. Slower CI.
- **Recommendation:** Use `env("DATABASE_PROVIDER")` or maintain a separate test schema with SQLite.

---

## Findings Summary

| ID | Severity | Persona | Title |
|----|----------|---------|-------|
| S1 | **Critical** | Security | OAuth tokens stored in plaintext |
| S2 | **Critical** | Security | No row-level security or tenant isolation |
| R1 | **Critical** | Requirements | Rollback restores invalid state |
| S3 | **High** | Security | Hardcoded system user ID in migrations |
| A1 | **High** | Architecture | Two conflicting Prisma schemas exist |
| A2 | **High** | Architecture | No transaction boundaries in migrations |
| Q1 | **High** | Quality | Zero tests for migration/rollback |
| O1 | **High** | Operations | No backup/restore procedure |
| S4 | **Medium** | Security | No dry-run mode for migrations |
| A3 | **Medium** | Architecture | Status normalization loses semantics |
| A4 | **Medium** | Architecture | AgentJob missing FK relation to Task |
| Q2 | **Medium** | Quality | Migration errors don't affect exit code |
| Q3 | **Medium** | Quality | LearningData missing User relation |
| O2 | **Medium** | Operations | Prisma client singleton stale connections |
| O3 | **Medium** | Operations | No structured logging in migrations |
| O4 | **Low** | Operations | No migration lock mechanism |
| Q4 | **Low** | Quality | Inconsistent table name mapping |
| Q5 | **Low** | Quality | Mail body stored as plaintext |
| R2 | **Low** | Requirements | No multi-database support for testing |
