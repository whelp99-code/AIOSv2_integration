# Phase 0 Baseline Recovery Plan

**Date:** 2026-06-14  
**Source:** `all-products-operational-development-plan-2026-06-14.md`  
**Goal:** Cleanly define the current baseline before product integration work continues.

## Summary

Phase 0 does not implement product features. It stabilizes the repo baseline, separates existing blockers from new work, and records what can be changed automatically versus what needs explicit approval.

Current known facts:

| Area                           | Status                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Dirty worktree                 | Existing modified files and many untracked `* 2.*` artifacts are present                                                      |
| Typecheck blocker              | `apps/api/src/index.ts` imports `createContext` from `./context`, while `apps/api/src/context.ts` exports `createTRPCContext` |
| Cursor Agent                   | Installed as `agent` and callable through `pnpm collaboration:dispatch-cursor-agent`                                          |
| Canonical integration baseline | `docs/reports/product-integration-blueprint-status.md`                                                                        |

## Work Items

### 1. Classify duplicate artifacts

Inspect only. Do not delete files in this phase.

Classify these groups:

| Group                  | Pattern                                 | Default action                          |
| ---------------------- | --------------------------------------- | --------------------------------------- |
| Hermes duplicate plans | `.hermes/plans/**/* 2.*`                | Document as duplicate candidates        |
| Duplicate command docs | `docs/reports/* 2.md`, `scripts/* 2.md` | Document as duplicate candidates        |
| Active requested docs  | Files without ` 2` suffix               | Keep                                    |
| Runtime state          | `.aios/context/*`                       | Do not edit unless explicitly requested |

Expected output:

- `docs/reports/phase-0-duplicate-artifact-inventory.md`
- Table with path, matching canonical file, recommended action, approval needed.

### 2. Record typecheck blocker

Observed failure:

```text
apps/api/src/index.ts imports createContext from ./context
apps/api/src/context.ts exports createTRPCContext
apps/api/src/context/index.ts exports createContext
```

Decision to record:

- Preferred fix candidate: update `apps/api/src/index.ts` to import from `./context/index` if Express tRPC context is intended.
- Alternative fix candidate: add an Express-compatible `createContext` export from `apps/api/src/context.ts`.
- Do not apply the fix during this document-only phase.

Expected output:

- `docs/reports/phase-0-typecheck-blocker.md`
- Include affected files, likely root cause, fix options, and verification command.

### 3. Verify agent routing

Run and record:

```bash
command -v opencode
command -v agent
command -v cursor
pnpm collaboration:dispatch-cursor-agent -- "Respond with exactly: OK"
```

Expected output:

- `docs/evidence/phase-0-agent-routing.md`
- Include command, result, stdout summary, and whether follow-up is required.

### 4. Establish validation baseline

Run non-destructive validation:

```bash
pnpm exec vitest run tests/unit/command-agent-runtime.test.ts
pnpm exec prettier --check docs/reports/*.md scripts/*.md
git diff --check
```

Run `pnpm typecheck` only to confirm the known blocker and record the result.

## Acceptance Criteria

- Duplicate artifact candidates are listed, not deleted.
- Typecheck blocker is documented with a clear preferred fix.
- Cursor Agent and opencode routing status is recorded.
- Phase 1 can start without guessing what state the repo is in.

## Approval Boundary

No approval needed:

- Reading files
- Writing inventory/report documents
- Running local tests/checks

Approval needed:

- Deleting duplicate artifacts
- Rewriting runtime state
- Committing or pushing changes
- Applying database migrations
