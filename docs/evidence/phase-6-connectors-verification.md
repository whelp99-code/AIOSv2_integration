# Phase 6 Connectors Verification

**Date:** 2026-06-14  
**Baseline:** `docs/reports/all-products-operational-development-plan-2026-06-14.md` Phase 6  
**Collaboration split:** opencode API implementation, Cursor Agent review, Codex verification/hardening

## Scope

- whelp99 MCP web bridge routes.
- Slack send route with approval gate.
- GitHub branch and pull request creation routes with approval gate.
- Regression tests proving dangerous actions do not run before approval.

## Implemented Files

- `apps/web/src/app/api/whelp99/health/route.ts`
- `apps/web/src/app/api/whelp99/tools/route.ts`
- `apps/web/src/app/api/whelp99/tools/call/route.ts`
- `apps/web/src/app/api/slack/send/route.ts`
- `apps/web/src/app/api/github/branches/route.ts`
- `apps/web/src/app/api/github/pull-requests/route.ts`
- `tests/integration/phase6-connectors.test.ts`

## Route Contracts

| Route                       | Method | Approval         | Behavior                                                                         |
| --------------------------- | ------ | ---------------- | -------------------------------------------------------------------------------- |
| `/api/whelp99/health`       | GET    | none             | Checks `WHELP99_MCP_HTTP_URL`; returns planned when not configured               |
| `/api/whelp99/tools`        | GET    | none             | Lists tools from MCP HTTP bridge; returns empty planned list when not configured |
| `/api/whelp99/tools/call`   | POST   | `device-control` | Calls MCP tool only after approval                                               |
| `/api/slack/send`           | POST   | `send`           | Sends Slack webhook only after approval                                          |
| `/api/github/branches`      | POST   | `external-share` | Creates branch via GitHub REST only after approval                               |
| `/api/github/pull-requests` | POST   | `external-share` | Creates PR via GitHub REST only after approval                                   |

## Safety Checks

- All dangerous POST routes call `ensureApprovedAction` before external `fetch`.
- Missing env paths return `503` after approval and do not perform external calls.
- Upstream HTTP failure returns upstream status and does not record action artifact.
- Network errors return failure and do not record action artifact.
- `approvalId` and `requestedBy` are stripped before upstream request bodies.
- Tests mock `globalThis.fetch`; no real Slack, GitHub, or device-control call was executed.
- Cursor Agent review result: PASS.

## Verification Commands

```bash
pnpm exec vitest run tests/integration/phase6-connectors.test.ts
pnpm exec vitest run tests/integration/phase6-connectors.test.ts tests/integration/vibe-coding-phase5-proxy.test.ts tests/integration/sangfor-phase4-proxy.test.ts tests/integration/faios-v3-proxy.test.ts tests/integration/aios-v1-mail-proxy.test.ts tests/integration.test.ts tests/unit/command-agent-runtime.test.ts
pnpm run typecheck
pnpm exec prettier --check apps/web/src/app/api/whelp99/health/route.ts apps/web/src/app/api/whelp99/tools/route.ts apps/web/src/app/api/whelp99/tools/call/route.ts apps/web/src/app/api/slack/send/route.ts apps/web/src/app/api/github/branches/route.ts apps/web/src/app/api/github/pull-requests/route.ts tests/integration/phase6-connectors.test.ts
git diff --check
```

## Results

| Check                          | Result                        |
| ------------------------------ | ----------------------------- |
| Phase 6 targeted tests         | PASS, 21 tests                |
| Related integration regression | PASS, 99 tests across 7 files |
| Typecheck                      | PASS, 51 tasks                |
| Changed-file Prettier          | PASS                          |
| Diff whitespace check          | PASS                          |

## Remaining Risks

- whelp99 remains dependent on a real HTTP MCP bridge at `WHELP99_MCP_HTTP_URL`.
- GitHub routes require a valid `GITHUB_TOKEN`; merge, push, and tag operations are intentionally not implemented.
- Slack route currently supports webhook send only; bot workflows/channel operations remain out of scope.
