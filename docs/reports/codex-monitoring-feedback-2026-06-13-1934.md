# Codex Monitoring Feedback - 2026-06-13 19:34 KST

## Scope

Cursor/opencode 작업 중 변경분을 추적하고 재검증했다.

Codex는 코드 수정 없이 리뷰/검증만 수행했다.

## Current Git Snapshot

Current branch:

- `main`
- `main...origin/main`

Modified/untracked files observed:

- `apps/web/next-env.d.ts`
- `apps/web/src/app/api/approvals/route.ts`
- `apps/web/src/app/api/collaboration/execute/route.ts`
- `apps/web/src/lib/integrations/aios-v1-proxy-handler.ts`
- `apps/web/src/lib/integrations/approval-middleware.ts`
- `package.json`
- `packages/domain/src/models/approval-policy.ts`
- `packages/infrastructure/src/collaboration/approval-file-store.ts`
- `packages/proxy-core/src/aios-v1-adapter.ts`
- `vitest.config.ts`
- `docs/reports/cursor-to-opencode-fix-directive.md`
- `scripts/dispatch-opencode-fix-directive.ts`

## What Improved

### 1. Vitest alias partially fixed

`vitest.config.ts` now has:

```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'apps/web/src'),
  },
},
```

This resolves the original `@/lib/integrations/aios-v1-proxy-handler` alias failure.

### 2. Route handler context default partially fixed

`createAiosV1ProxyHandler` now accepts optional context:

```ts
context?: { params?: Promise<Record<string, string>> }
```

This addresses the earlier issue where tests call route handlers without a second context argument.

### 3. ApprovalActionType guard improved

`packages/domain/src/models/approval-policy.ts` now defines:

- `APPROVAL_ACTION_TYPES`
- `isApprovalActionType`
- `normalizeApprovalActionType`

`approvals/route.ts`, `collaboration/execute/route.ts`, and `approval-file-store.ts` now use the domain-level guard/normalize.

### 4. Approval middleware body double-read partially addressed

`approval-middleware.ts` now recreates a Request with the parsed JSON body before passing it to handlers:

```ts
handler(requestWithJsonBody(req, body), ...)
```

This is a reasonable fix direction.

## Current Verification Results

### `pnpm test`

Status: **failed**

Current failure:

```txt
Cannot find module .../next-auth.../node_modules/next/server imported from .../next-auth/lib/env.js
Did you mean to import "next/server.js"?
```

Interpretation:

- The original `@` alias failure is fixed.
- The test now progresses far enough to load `apps/web/src/lib/integrations/aios-v1-proxy-handler.ts`.
- That file imports `auth` from `@/lib/auth`.
- `@/lib/auth` pulls in `next-auth`, which fails in the root Vitest Node environment with the Next 16 ESM import path.

Relevant files:

- `tests/phase5-smoke.test.ts`
- `apps/web/src/app/api/customers/route.ts`
- `apps/web/src/lib/integrations/aios-v1-proxy-handler.ts`
- `apps/web/src/lib/auth/index.ts`

### `pnpm typecheck`

Status: **failed**

Failure:

```txt
@aios/proxy-core:typecheck:
src/aios-v1-adapter.ts(9,37): error TS2307: Cannot find module '@aios/shared' or its corresponding type declarations.
src/aios-v1-adapter.ts(13,44): error TS7006: Parameter 'entry' implicitly has an 'any' type.
```

Relevant files:

- `packages/proxy-core/src/aios-v1-adapter.ts`
- `packages/proxy-core/package.json`

Root cause:

- `packages/proxy-core/src/aios-v1-adapter.ts` now imports `INTEGRATION_TARGETS` from `@aios/shared`.
- `packages/proxy-core/package.json` does not declare `@aios/shared` as a dependency.
- Because the module is unresolved, callback param `entry` is inferred as `any`.

### `pnpm --filter @aios/web build`

Status: **failed**

Failure:

```txt
./src/lib/integrations/aios-v1-proxy-handler.ts:100:49
Type error: No overload matches this call.
Argument of type 'unknown' is not assignable to parameter of type '(substring: string, ...args: any[]) => string'.
```

Relevant file:

- `apps/web/src/lib/integrations/aios-v1-proxy-handler.ts`

Root cause:

```ts
const resolvedParams = await (context?.params ?? Promise.resolve({}));
for (const [key, value] of Object.entries(resolvedParams)) {
  fullPath = fullPath.replace(`[${key}]`, value);
}
```

Because the fallback is `Promise.resolve({})`, TypeScript widens `Object.entries` value to `unknown`.

### `pnpm lint`

Status: **failed**

Still failing with previous lint errors, including:

- `apps/web/next.config.js`: `module` is not defined
- ops health routes: empty block / useless assignment
- `packages/infrastructure/memory/src/memory-tower-client.ts`: caught error missing cause
- script globals/no-unused-vars issues

## New Findings For opencode

### P0. Fix `aios-v1-proxy-handler.ts` param typing

Current code:

```ts
const resolvedParams = await (context?.params ?? Promise.resolve({}));
for (const [key, value] of Object.entries(resolvedParams)) {
  fullPath = fullPath.replace(`[${key}]`, value);
}
```

Required fix:

Use an explicit `Record<string, string>` fallback/type.

Suggested shape:

```ts
const resolvedParams: Record<string, string> = await (context?.params ??
  Promise.resolve({} as Record<string, string>));

for (const [key, value] of Object.entries(resolvedParams)) {
  fullPath = fullPath.replace(`[${key}]`, value);
}
```

Acceptance:

- `pnpm --filter @aios/web build` no longer fails on line 100.

### P0. Add `@aios/shared` dependency to proxy-core or avoid the dependency

Current code:

```ts
import { INTEGRATION_TARGETS } from "@aios/shared";
```

But `packages/proxy-core/package.json` dependencies do not include `@aios/shared`.

Required fix, choose one:

1. Add dependency:

```json
"@aios/shared": "workspace:*"
```

2. Or avoid importing `@aios/shared` from `proxy-core` and use local fallback:

```ts
const baseUrl = process.env.AIOS_V1_URL?.trim() || "http://localhost:3101";
```

Recommendation:

- Prefer option 2 if `proxy-core` should stay low-level and avoid shared registry coupling.
- Prefer option 1 if central integration registry is intentionally the single source of truth.

Acceptance:

- `pnpm typecheck` passes `@aios/proxy-core`.

### P0. Fix Phase 5 smoke test next-auth loading

Current failure after alias fix:

```txt
Cannot find module ... next-auth ... next/server
```

Cause:

- `aios-v1-proxy-handler.ts` imports `auth` at module load.
- This pulls `next-auth` into root Vitest.
- Phase 5 smoke tests do not need real NextAuth.

Required fix, choose one:

1. Lazy-load auth only when needed and avoid loading NextAuth in tests.

Example direction:

```ts
async function getUserId(): Promise<string> {
  if (process.env.NODE_ENV === "test") return "test-user";
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  return session?.user?.id ?? "anonymous";
}
```

2. Add a Vitest alias/mock for `@/lib/auth` to a test stub.

Example:

```ts
alias: {
  '@': path.resolve(__dirname, 'apps/web/src'),
  '@/lib/auth': path.resolve(__dirname, 'tests/stubs/auth.ts'),
}
```

Recommendation:

- Prefer lazy import/test fallback in `aios-v1-proxy-handler.ts`, because this keeps route smoke tests lightweight and avoids coupling root tests to NextAuth internals.

Acceptance:

- `pnpm test` proceeds past module import and actually runs `tests/phase5-smoke.test.ts`.

### P1. Re-run lint after P0 fixes

`pnpm lint` still fails with existing errors.

Keep the previous directive Task 10 active.

Acceptance:

- `pnpm lint` passes or lint scope policy is explicitly adjusted and documented.

## Updated Verification Commands Required

After opencode applies fixes, run:

```bash
pnpm test
pnpm typecheck
pnpm --filter @aios/web build
pnpm lint
```

Then, if those pass:

```bash
pnpm --filter @aios/infrastructure test
pnpm --filter @aios/application test
pnpm --filter @aios/infrastructure/memory test
git diff --check
```

## Current Status

Do not mark the fix directive complete yet.

Current state:

- Task 1: partially fixed, still failing due NextAuth test import
- Task 2: partially fixed, needs verification after tests/build pass
- Task 3: partially fixed, needs typecheck/tests
- Task 4: partially fixed, currently breaks proxy-core typecheck
- Task 5: not verified/fix not observed
- Task 6: not verified/fix not observed
- Task 7: not verified/fix not observed
- Task 8: not verified/fix not observed
- Task 9: not verified/fix not observed
- Task 10: not fixed, lint still failing

## Message To Cursor

Please forward this file to opencode as a follow-up directive.

Focus opencode on the three immediate blockers first:

1. `aios-v1-proxy-handler.ts` `unknown` param type causing web build failure.
2. `@aios/proxy-core` missing `@aios/shared` dependency or remove that dependency.
3. Phase 5 smoke test now failing because `aios-v1-proxy-handler.ts` eagerly imports NextAuth.

Only after these are fixed should opencode continue with SSE/degraded-health/settings/docs/lint cleanup.
