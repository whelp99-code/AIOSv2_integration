# Cursor Agent Fix and Test Directive

**Date:** 2026-06-14  
**Owner:** Cursor Agent  
**Command:** `pnpm collaboration:dispatch-cursor-agent -- "<prompt>"`  
**Goal:** Tighten opencode output, fix test failures, and keep implementation aligned with repo conventions.

## Summary

Cursor Agent should not be used as the primary bulk feature generator for this phase. Use it for correction, test stabilization, and focused integration work after opencode or Codex identifies a concrete target.

## Operating Rules

| Rule     | Requirement                                                      |
| -------- | ---------------------------------------------------------------- |
| Scope    | Modify only files listed in the task prompt                      |
| Tests    | Add or update targeted tests for the changed behavior            |
| Style    | Match existing route, component, and helper patterns             |
| Risk     | Do not execute external sends, deploys, pushes, or DB migrations |
| Evidence | Report commands run and whether they passed                      |

## Priority Work

### 1. Typecheck blocker correction

Known issue:

```text
apps/api/src/index.ts imports createContext from ./context
apps/api/src/context.ts exports createTRPCContext
apps/api/src/context/index.ts exports createContext
```

Cursor Agent task:

- Confirm Express tRPC middleware should use `apps/api/src/context/index.ts`.
- Apply the minimal import fix only when explicitly assigned implementation work.
- Run `pnpm --filter @aios/api typecheck`.
- If fixed, run root `pnpm typecheck`.

### 2. Ops Console test stabilization

Cursor Agent task:

- Review `apps/web/src/components/ops/ops-console.tsx`.
- Add tests only around behavior introduced by Phase 1.
- Keep UI dense and operational.
- Avoid broad restyling.

Target checks:

- loading state
- health state rendering
- approval action callbacks
- dispatch form validation
- evidence link rendering

### 3. Mail proxy test follow-up

Cursor Agent task:

- After opencode adds mail proxy routes, add or fix targeted tests.
- Prefer in-process test servers over fixed external ports.
- Verify approval pending and approved paths.
- Keep mocks local to the test file unless the repo already has a shared fixture.

## Prompt Templates

Use these templates through the wrapper.

### Typecheck fix prompt

```bash
pnpm collaboration:dispatch-cursor-agent -- "Inspect the @aios/api typecheck failure around createContext. Apply the smallest safe fix, then run pnpm --filter @aios/api typecheck. Do not touch unrelated files."
```

### Ops Console test prompt

```bash
pnpm collaboration:dispatch-cursor-agent -- "Add focused tests for the Ops Console behavior introduced in Phase 1. Use existing test patterns. Run the targeted tests and report pass/fail."
```

### Mail proxy test prompt

```bash
pnpm collaboration:dispatch-cursor-agent -- "Review the new AIOS v1 mail proxy routes. Add smoke tests for upstream success, unavailable fallback, approval pending, and approved forwarding. Run the targeted tests."
```

## Verification Commands

Cursor Agent should run the narrowest relevant set first:

```bash
pnpm --filter @aios/api typecheck
pnpm exec vitest run tests/unit/command-agent-runtime.test.ts
pnpm exec vitest run tests/integration/aios-v1-routes.test.ts
pnpm exec vitest run tests/phase5-smoke.test.ts
pnpm exec prettier --check <changed-files>
```

Only run full checks after targeted checks pass:

```bash
pnpm test
pnpm typecheck
git diff --check
```

## Acceptance Criteria

- Cursor Agent changes are small and targeted.
- Each fix includes a test or a documented reason no test was added.
- No unrelated refactor is introduced.
- Output clearly states files changed, tests run, and remaining blockers.
