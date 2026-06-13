# Phase 6 — Diagnostic Fix Handoff (Cursor → opencode)

> **Date:** 2026-06-13  
> **Session:** `cursor-opencode-main-session`  
> **Trigger:** Product codebase diagnostic report verification  
> **Evidence baseline:** [`product-integration-blueprint-status.md`](product-integration-blueprint-status.md)

## Objective

Fix all verified build/test blockers across 3 repos so production builds pass:

| Repo | Path | Blocker |
|------|------|---------|
| AIOSv2_integration | `.` | `apps/web` build fails on `/settings` SSG + `useSession` |
| vibe-coding-os | `../vibe-coding-os` | `lib/tools/github.ts` missing 20+ exports used by API routes |
| sangfor-mcp-workflow | `../sangfor-mcp-workflow` | `pnpm build` fails (TS project refs / module resolution) |

AIOS v1 (`../AIOS v1`) already builds — no code changes unless regression found.

Mail Intelligence (`../apps/mail-intelligence`) — optional Task 5 if time permits.

---

## Acceptance Criteria (all must pass)

```bash
# AIOSv2_integration
cd /Users/jmpark/Documents/Playground/AIOSv2_integration
pnpm test && pnpm typecheck
cd apps/web && pnpm build

# vibe-coding-os
cd /Users/jmpark/Documents/Playground/vibe-coding-os
pnpm build
npx tsx scripts/assert-github-api.ts

# sangfor-mcp-workflow
cd /Users/jmpark/Documents/Playground/sangfor-mcp-workflow
pnpm build
pnpm test   # allow skipping 2 LM Studio integration tests if no LLM available — mark with test.skip when LM Studio unhealthy
```

---

## Task 1 — AIOSv2 settings build fix

**Repo:** `AIOSv2_integration`  
**Files:** `apps/web/src/app/settings/layout.tsx` (new), optionally refactor `settings/page.tsx`

### Problem

```
Error occurred prerendering page "/settings"
TypeError: Cannot destructure property 'data' of '(0 , c.useSession)(...)' as it is undefined.
```

`/settings/page.tsx` is `'use client'` and calls `useSession()` without `SessionProvider`. Dashboard avoids this by wrapping `SessionProvider` in `dashboard/page.tsx`.

### Fix (preferred)

1. Create `apps/web/src/app/settings/layout.tsx` (Server Component):

```tsx
import { SessionProvider } from '@/lib/auth/session-provider'

export const dynamic = 'force-dynamic'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

2. Do **not** add `export const dynamic` to the client `page.tsx` (invalid in client components).

3. Verify: `cd apps/web && pnpm build` succeeds.

---

## Task 2 — VibeCodingOS GitHub API facade

**Repo:** `/Users/jmpark/Documents/Playground/vibe-coding-os`  
**Files:** `lib/tools/github.ts` (expand), optionally `lib/github/*.ts`

### Problem

`app/api/github/pr/route.ts`, `app/api/github/issues/route.ts`, and 10+ routes import from `@/lib/tools/github`:

- `createPr`, `getPr`, `listPrs`, `updatePr`, `mergePr`, `closePr`
- `listPrReviews`, `listPrComments`, `requestReviewers`
- `createPrWithIssue`, `linkIssueToPr`, `getPrLinkedIssues`
- `createIssue`, `getIssue`, `listIssues`, `updateIssue`, `closeIssue`
- `addIssueComment`, `listIssueComments`, `addLabelsToIssue`, `removeLabelFromIssue`

Only `getGitHubClient` and `createGitHubPrPlaceholder` exist today.

`lib/github/project-repo.ts` GITHUB_TOKEN is **already correct** — do not change.

### Fix

Implement full Octokit-based helpers in `lib/tools/github.ts` (or split into `lib/tools/github-pr.ts` + `lib/tools/github-issues.ts` and re-export from facade).

Reference expected exports: `scripts/assert-github-api.ts`.

Use `getGitHubClient()` (existing) for all API calls. Params should match what API routes pass (`owner`, `repo`, `prNumber`, etc.).

Keep `createGitHubPrPlaceholder` for backward compat.

Verify:

```bash
npx tsx scripts/assert-github-api.ts
pnpm build
```

---

## Task 3 — Sangfor MCP build chain

**Repo:** `/Users/jmpark/Documents/Playground/sangfor-mcp-workflow`

### Problems

1. `apps/operator-console` runs `tsc -b` but has **no** `tsconfig.json` → TS5083
2. Root `pnpm build` (`tsc -b`) fails resolving `@sangfor/workflow-engine`, `@sangfor/health-checker`, `@sangfor/wiki-sync` from scripts/tests
3. `pnpm test`: 2 AI workflow tests fail when LM Studio unavailable

### Fix (minimal, no over-engineering)

1. Add `apps/operator-console/tsconfig.json` extending root or standalone compile config for `src/**/*.ts`.
2. Fix root `tsconfig.json` to use **project references** for packages, OR change root `build` script to compile only packages (not scripts/tests), OR add `paths` mappings for `@sangfor/*` workspace packages.
3. For operator-console `build` script: if `tsc -b` is unnecessary (runtime uses `tsx`), change to `tsc --noEmit` or remove broken `-b` reference — match how `dev:web` actually runs.
4. For failing LM Studio tests in `tests/ai-workflow.test.ts`: skip when `healthCheck()` returns false (same pattern as other conditional integration tests).

Verify: `pnpm build && pnpm test` (42+ tests pass, 0–2 skipped acceptable).

---

## Task 4 — Integration verification + evidence

**Repo:** `AIOSv2_integration`

1. Re-run all acceptance commands from top of this doc.
2. If AIOSv2 tests fail due to your changes, fix them.
3. Append results to `docs/evidence/cursor-opencode-main-session.md` (or let dispatch script write evidence).

---

## Task 5 (optional) — Mail Intelligence boot

**Repo:** `/Users/jmpark/Documents/Playground/apps/mail-intelligence`

If `PORT=3010 node server.mjs` fails on missing `src/demoFixture.mjs`, restore or guard the import so server boots.

Document port: `package.json` uses 10200, integration env uses 3010 — add comment in README or package.json scripts.

---

## Out of scope

- Phase 6 Unified Ops Console feature work
- LangGraph workflow completion in VibeCodingOS
- AIOS v1 duplicate `* 2` file cleanup
- Turbopack root warning (Phase 2)

---

## Dispatch order

1 → 2 → 3 → 4 → (5 optional)

Each task must complete verification before moving on.
