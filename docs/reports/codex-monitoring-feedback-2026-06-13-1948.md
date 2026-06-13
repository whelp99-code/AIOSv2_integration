# Codex Monitoring Feedback — 2026-06-13 19:48 KST

## Scope

- Target: Cursor/opencode uncommitted fix-directive changes on `main`
- Codex role: monitor, verify, review, and provide feedback only
- Implementation owner: Cursor/opencode

## Current Status

Functional verification is mostly green, but the patch set is **not commit-ready**.

Primary blocker: Cursor reported that touched files were formatted, but changed-file-only Prettier still fails.

## Verified Commands

| Command                                          |             Result | Notes                                      |
| ------------------------------------------------ | -----------------: | ------------------------------------------ |
| `pnpm test`                                      |               PASS | 4 files, 25 tests                          |
| `pnpm lint`                                      |               PASS | no lint errors                             |
| `pnpm typecheck`                                 |               PASS | 51/51 turbo tasks                          |
| `pnpm --filter @aios/web build`                  | PASS with warnings | Turbopack root + NFT trace warning remain  |
| `pnpm --filter @aios/infrastructure test`        |               PASS | 6 files, 7 tests                           |
| `pnpm --filter @aios/application test`           |               PASS | 1 file, 2 tests                            |
| `pnpm --filter @aios/infrastructure/memory test` |               PASS | 1 file, 2 tests                            |
| `git diff --check`                               |               PASS | no whitespace errors                       |
| changed-file-only Prettier check                 |               FAIL | 11 changed/untracked files need formatting |

## Changed-File Prettier Failure

Command used:

```bash
changed_files=$(git diff --name-only --diff-filter=ACM; git ls-files --others --exclude-standard)
printf '%s\n' "$changed_files" | rg '\.(ts|tsx|md)$' | xargs pnpm exec prettier --check
```

Failing files:

- `apps/web/src/app/api/approvals/route.ts`
- `apps/web/src/app/api/collaboration/execute/route.ts`
- `docs/evidence/cursor-opencode-main-session.md`
- `docs/reports/phase6-progress-report.md`
- `docs/reports/product-integration-blueprint-status.md`
- `packages/domain/src/models/index.ts`
- `packages/infrastructure/src/collaboration/approval-file-store.ts`
- `docs/reports/codex-monitoring-feedback-2026-06-13-1934.md`
- `docs/reports/codex-monitoring-feedback-2026-06-13-1943.md`
- `docs/reports/cursor-to-opencode-fix-directive.md`
- `scripts/dispatch-opencode-fix-directive.ts`

## Review Findings

### P1 — Evidence/progress docs currently overstate formatting status

Files:

- `docs/evidence/cursor-opencode-main-session.md`
- `docs/reports/phase6-progress-report.md`

Problem:

- They say touched files were formatted locally or Task 10 format is complete.
- This is not true until changed-file-only Prettier passes.

Required correction:

- Record `pnpm format:check` as repo-wide FAIL due legacy files.
- Record changed-file-only Prettier as FAIL until fixed.
- Only after re-running the changed-file-only check successfully, update docs to say touched files are formatted.

### P2 — Approval middleware body re-wrap should be GET-safe

File:

- `apps/web/src/lib/integrations/approval-middleware.ts`

Concern:

- `requestWithJsonBody()` always creates a new `Request` with `body: JSON.stringify(...)`.
- If this helper is reached for `GET`/`HEAD`, the Web Request constructor can throw because GET/HEAD requests cannot carry a body.

Required action:

- Either make `requestWithJsonBody()` return a body-less request for `GET`/`HEAD`, or prove all callers are POST/PUT/PATCH only and add a regression test.
- Preferred fix:

```ts
function requestWithJsonBody(req: Request, body: unknown): Request {
  const headers = new Headers(req.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = JSON.stringify(body ?? {});
  }

  return new Request(req.url, init);
}
```

### P3 — Build warnings remain and should not be reported as fully clean

Command:

- `pnpm --filter @aios/web build`

Observed warnings:

- `turbopack.root should be absolute`
- `Encountered unexpected file in NFT list`
- Import trace includes:
  - `apps/web/next.config.js`
  - `packages/infrastructure/src/integrations/project-health-probe.ts`
  - `apps/web/src/app/api/integrations/health/route.ts`

Required action:

- Keep build as PASS with warnings.
- Do not label build state as fully clean.
- If Phase 6 scope includes warnings, assign a separate follow-up task for Turbopack root/NFT trace.

## Cursor -> opencode Follow-Up Directive

Send this to opencode:

Title: Follow-up Fix Directive — Codex Monitoring 2026-06-13 19:48 KST

Functional checks are green, but the patch set is not commit-ready.

Required fixes:

1. Format all changed/untracked TS/TSX/MD files only.
2. Re-run changed-file-only Prettier check.
3. Correct evidence/progress docs.
4. Make `requestWithJsonBody()` GET/HEAD-safe or add proof/test that it cannot be reached by GET/HEAD.
5. Re-run final verification.

Format command:

```bash
changed_files=$(git diff --name-only --diff-filter=ACM; git ls-files --others --exclude-standard)
printf '%s\n' "$changed_files" | rg '\.(ts|tsx|md)$' | xargs pnpm exec prettier --write
```

Changed-file-only Prettier check:

```bash
changed_files=$(git diff --name-only --diff-filter=ACM; git ls-files --others --exclude-standard)
printf '%s\n' "$changed_files" | rg '\.(ts|tsx|md)$' | xargs pnpm exec prettier --check
```

Evidence/progress doc correction:

- `pnpm format:check`: repo-wide FAIL due legacy 280 files.
- changed-file-only Prettier: must be PASS after formatting.
- Do not say "touched files formatted" until changed-file-only check passes.

Final verification:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm --filter @aios/web build
pnpm --filter @aios/infrastructure test
pnpm --filter @aios/application test
pnpm --filter @aios/infrastructure/memory test
git diff --check
```

Acceptance criteria:

- changed-file-only Prettier check passes.
- Evidence docs match actual verification results.
- Approval middleware cannot throw from GET/HEAD body re-wrap.
- Build remains PASS; warnings are documented if still present.
- Working tree remains uncommitted until Cursor/Codex review signs off.

## Commit Readiness

Do not commit yet.

Commit can proceed after:

1. changed-file-only Prettier passes.
2. evidence/progress docs are corrected.
3. `requestWithJsonBody()` GET/HEAD safety is addressed or tested.
4. final verification commands pass again.
