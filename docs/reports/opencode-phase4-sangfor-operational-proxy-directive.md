# opencode Phase 4 Sangfor Operational Proxy Directive

Date: 2026-06-14

## Objective

Complete the next Sangfor integration slice without executing any real device, deploy, mail, database, GitHub, tag, or release action.

Use the established collaboration split:

| Role                  | Owner        |
| --------------------- | ------------ |
| Implementation        | opencode     |
| Fix/test review       | Cursor Agent |
| Verification/evidence | Codex        |

## Current Context

Canonical planning source:

- `docs/reports/product-integration-blueprint-status.md`
- `docs/reports/all-products-operational-development-plan-2026-06-14.md`

Existing Sangfor routes:

- `/api/sangfor/health`
- `/api/sangfor/workflows`
- `/api/sangfor/dashboard`
- `/api/sangfor/events`
- `/api/sangfor/compliance/trend`
- `/api/sangfor/compliance/roadmap`
- `/api/sangfor/workflows/[id]/execute`

Known gaps for Phase 4:

- Device read proxy is missing.
- Compliance POST routes are incomplete and not consistently approval-gated.
- Sangfor smoke coverage only covers events.

## Required Implementation

### 1. Device read proxy

Add routes:

| Portal route                       | Upstream path              | Method | Approval |
| ---------------------------------- | -------------------------- | ------ | -------- |
| `/api/sangfor/device/capture-menu` | `/api/device/capture-menu` | `GET`  | none     |
| `/api/sangfor/device/compare`      | `/api/device/compare`      | `GET`  | none     |

Requirements:

- Preserve query string for both routes.
- Use `getSangforMcpUrl()`.
- Use existing `proxyUpstreamJson`, `upstreamProxyResponse`, and `upstreamErrorResponse`.
- Return upstream status/body as-is on upstream HTTP responses.
- Return `500` with a clear Sangfor label on thrown fetch errors.

### 2. Compliance POST proxy with approval gate

Add or update routes:

| Portal route                       | Upstream path              | Method | Approval         |
| ---------------------------------- | -------------------------- | ------ | ---------------- |
| `/api/sangfor/compliance/track`    | `/api/compliance/track`    | `POST` | `external-share` |
| `/api/sangfor/compliance/roadmap`  | `/api/compliance/roadmap`  | `POST` | `external-share` |
| `/api/sangfor/compliance/proposal` | `/api/compliance/proposal` | `POST` | `external-share` |

Requirements:

- `POST` without `approvalId` returns `409` pending approval.
- Rejected approval returns `403`.
- Approved request forwards only business payload to upstream.
- Strip approval metadata before upstream forwarding, at minimum:
  - `approvalId`
  - `requestedBy`
- Use assignment IDs:
  - `sangfor-compliance-track`
  - `sangfor-compliance-roadmap`
  - `sangfor-compliance-proposal`
- Default `requestedBy` may be `opencode` if missing.
- Use existing `ensureApprovedAction` and `recordApprovalArtifact` pattern.
- Do not call real upstream in tests; mock `fetch`.

### 3. Tests

Extend `tests/phase5-smoke.test.ts` or create a focused integration test if cleaner.

Required coverage:

- `GET /api/sangfor/device/capture-menu` success with query passthrough.
- `GET /api/sangfor/device/compare` upstream thrown error returns `500`.
- Compliance `POST` without approval returns `409` for at least one route.
- Compliance `POST` with rejected approval returns `403`.
- Compliance `POST` with approved approval forwards upstream and strips `approvalId`.
- Existing Sangfor event smoke tests continue to pass.

If a new integration test is created, keep it isolated with temp approval/collaboration state paths, following the Phase 3 F-aios-v3 test style.

## Validation Commands

Run:

```bash
pnpm exec vitest run tests/phase5-smoke.test.ts
pnpm exec vitest run tests/integration/faios-v3-proxy.test.ts tests/integration/aios-v1-mail-proxy.test.ts tests/integration.test.ts tests/unit/command-agent-runtime.test.ts
pnpm run typecheck
pnpm exec prettier --check <changed files>
git diff --check
```

## Constraints

- Preserve existing dirty worktree changes.
- Do not delete or modify duplicate `* 2.*` artifacts.
- Do not execute real Sangfor device control, deploy, mail send, DB migration, GitHub push, merge, tag, or release.
- Do not broaden scope into UI unless required for typecheck.

## Completion Criteria

- Phase 4 routes exist and follow existing Sangfor proxy style.
- Compliance write routes cannot call upstream without approval.
- Approved compliance POST does not leak approval metadata upstream.
- Targeted Sangfor smoke tests pass.
- Repo typecheck remains green.
