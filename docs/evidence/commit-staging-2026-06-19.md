# Commit Staging Manifest — 2026-06-19

**Branch:** `feature/mail-intelligence-hub`  
**HEAD:** `8cc6d1c` (feat llm multi-provider) + working tree  
**Purpose:** Separate commit-worthy changes from local/runtime junk after approval-queue hygiene.

---

## 1. Approval queue policy (applied)

| Item | Count | Policy | Result |
| ---- | ----- | ------ | ------ |
| Seed approvals (cursor/opencode) | 2 | Keep approved | ✅ retained |
| `live-smoke` dry-run (Slack send, whelp99 tool) | 4 | **Reject** — never `--execute`, smoke artifacts only | ✅ `rejected` |
| `api-client` integration test pollution | 261 | **Purge** — not audit-worthy, queue bloat | ✅ removed |
| **Pending remaining** | 0 | — | ✅ |

---

## 2. collaboration-state.json sync (applied)

| Field | Before | After |
| ----- | ------ | ----- |
| Session status | `blocked` | `active` |
| Phase7 Sangfor LM Studio | `failed` | `done` |
| Phase7 Vibe i18n | `running` | `done` |
| Phase7 AIOSv2 report | `completed` | `done` (normalized) |
| Lifecycle C0–C10 | (missing) | `done` @ `11beb86` |
| Lifecycle DB persistence | (missing) | `done` @ `cb4da86` |
| Lifecycle live ops | (missing) | `done` @ `ca0f116` |
| Queue hygiene assignment | (new) | `done` |
| WIP uncommitted bundle | (new) | `pending` — awaits commit |

---

## 3. Recommended commit groups

### Group A — State hygiene (this session)

```
.aios/context/approval-queue.json
.aios/context/collaboration-state.json
.gitignore
docs/evidence/cursor-opencode-main-session.md
docs/evidence/commit-staging-2026-06-19.md
```

Suggested message: `chore: sync collaboration state and purge approval-queue test pollution`

### Group B — Lifecycle workflow persistence (core WIP)

```
packages/db/prisma/schema.prisma
packages/db/prisma/migrations/20260618153000_operational_workflow_foundation/migration.sql
packages/domain/workflow/src/entities.ts
packages/domain/workflow/src/repositories.ts
packages/domain/*/package.json
packages/application/workflow/src/workflow.service.ts
packages/application/*/package.json
packages/application/*/src/*.service.ts
packages/infrastructure/workflow/src/prisma-repositories.ts
packages/infrastructure/workflow/src/index.ts
packages/infrastructure/workflow/package.json
packages/infrastructure/package.json
pnpm-workspace.yaml
pnpm-lock.yaml
```

Suggested message: `feat(workflow): operational workflow Prisma foundation and service wiring`

### Group C — API + integration proxy hardening

```
apps/api/package.json
apps/api/src/index.ts
apps/api/src/middleware/auth.ts
apps/api/src/routers/workflow.router.ts
apps/api/src/routes/workflow.routes.ts
apps/web/src/app/api/aios-v3/**/*.ts
apps/web/src/lib/integrations/*.ts
apps/web/src/components/dashboard/dashboard.tsx
apps/web/src/app/api/aios-v3/__tests__/proxy-contract.test.ts
package.json
tests/approval-gate.test.ts
tests/integration.test.ts
tests/integration/aios-v1-routes.test.ts
tests/unit/approval-idempotency.test.ts
tests/lifecycle-read.test.ts
vitest.config.ts
scripts/lifecycle-ops-smoke.mjs
```

Suggested message: `feat(integration): workflow API routes, aios-v3 proxy contract, and lifecycle smoke`

### Group D — LLM package guard

```
packages/infrastructure/llm/package.json
packages/infrastructure/llm/src/*.ts
packages/infrastructure/agents/package.json
packages/infrastructure/agents/src/base-agent.ts
packages/infrastructure/*/package.json  (workspace dep bumps)
packages/infrastructure/src/mail/json-mail-repository.ts
scripts/guard-llm-package.mjs
```

Suggested message: `chore(llm): guard package resolution and workspace dependency alignment`

### Group E — Desktop app scaffold (optional, separate PR)

```
apps/desktop/.gitignore
apps/desktop/package.json
apps/desktop/scripts/build-mac.cjs
apps/desktop/scripts/dev.cjs
docs/reports/macos-desktop-app-runbook.md
```

Suggested message: `feat(desktop): macOS Electron scaffold and runbook`

### Group F — Exclude from commit (local / non-product)

| Path | Reason |
| ---- | ------ |
| `.aios/runtime/` | PID files, runtime state |
| `.backups/` | LLM package backup copies |
| `packages/infrastructure/.ignored_llm*/` | Ignored duplicate trees |
| `packages/infrastructure/llm 2` | Duplicate symlink/dir |
| `* 2.*`, `* 3.*` duplicate JSON/scripts | Agent session duplicates |
| `.hermes/desktop-attachments/` | Local Hermes skill attachments |
| `.hermes/plans/`, `.hermes/scripts/` | Local planning artifacts |
| `docs/reports/invoice-*.md` | Business invoice drafts |
| `docs/reports/phase-plan-v1-tax-invoice-app.md` | Separate product plan |

`.gitignore` updated to exclude runtime, backups, and duplicate patterns.

---

## 4. Quick stage commands

```bash
# Group A only (hygiene)
git add .aios/context/approval-queue.json .aios/context/collaboration-state.json .gitignore \
  docs/evidence/cursor-opencode-main-session.md docs/evidence/commit-staging-2026-06-19.md

# Groups B+C+D (main product WIP)
git add packages/ apps/api/ apps/web/ package.json pnpm-lock.yaml pnpm-workspace.yaml \
  scripts/guard-llm-package.mjs scripts/lifecycle-ops-smoke.mjs tests/ vitest.config.ts

# Group E (optional)
git add apps/desktop/ docs/reports/macos-desktop-app-runbook.md
```

---

## 5. Pre-commit verification

```bash
pnpm test
pnpm typecheck
pnpm --filter @aios/web build
git diff --check
```
