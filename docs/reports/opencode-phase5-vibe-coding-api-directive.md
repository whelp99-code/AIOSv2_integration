# opencode Phase 5 vibe-coding-os API Directive

Date: 2026-06-14

## Objective

Expand the vibe-coding-os integration so the portal can manage project, agent, learning, and sandbox/RAG operations through safe proxy routes.

Use the established collaboration split:

| Role                  | Owner        |
| --------------------- | ------------ |
| API implementation    | opencode     |
| UI/fix/test review    | Cursor Agent |
| Verification/evidence | Codex        |

## Current Context

Existing vibe-coding routes:

| Portal route                  | Upstream path     | Method | Approval         |
| ----------------------------- | ----------------- | ------ | ---------------- |
| `/api/vibe-coding/health`     | `/api/health`     | `GET`  | none             |
| `/api/vibe-coding/projects`   | `/api/projects`   | `GET`  | none             |
| `/api/vibe-coding/rag/ingest` | `/api/rag/ingest` | `POST` | `external-share` |

Known gaps from `docs/reports/product-integration-blueprint-status.md`:

- Projects proxy lacks query/detail coverage.
- Agent execution proxy is missing.
- Learning schedule proxy is missing.
- Sandbox/write operation proxy is missing.

## Required Implementation

### 1. Projects proxy enhancement

Update:

| Portal route                     | Upstream path          | Method | Approval |
| -------------------------------- | ---------------------- | ------ | -------- |
| `/api/vibe-coding/projects`      | `/api/projects{query}` | `GET`  | none     |
| `/api/vibe-coding/projects/[id]` | `/api/projects/{id}`   | `GET`  | none     |

Requirements:

- Preserve query string for list route.
- Encode path parameter for detail route.
- Use `getVibeCodingOsUrl()`.
- Use `proxyUpstreamJson`, `upstreamProxyResponse`, and `upstreamErrorResponse`.

### 2. Agent execution proxy

Add:

| Portal route                  | Upstream path        | Method | Approval |
| ----------------------------- | -------------------- | ------ | -------- |
| `/api/vibe-coding/agents`     | `/api/agents{query}` | `GET`  | none     |
| `/api/vibe-coding/agents/run` | `/api/agents/run`    | `POST` | `deploy` |

Requirements:

- `POST` without `approvalId` returns `409` pending.
- Rejected approval returns `403`.
- Approved request forwards upstream and strips approval metadata:
  - `approvalId`
  - `requestedBy`
- Assignment ID: `vibe-agent-run`.
- Default `requestedBy`: `opencode`.
- Use `ensureApprovedAction` and `recordApprovalArtifact`.
- Do not call real upstream in tests; mock `fetch`.

### 3. Learning schedule proxy

Add:

| Portal route                          | Upstream path                    | Method | Approval |
| ------------------------------------- | -------------------------------- | ------ | -------- |
| `/api/vibe-coding/learning/schedules` | `/api/learning/schedules{query}` | `GET`  | none     |
| `/api/vibe-coding/learning/schedules` | `/api/learning/schedules`        | `POST` | `deploy` |

Requirements:

- GET preserves query string.
- POST is approval-gated with assignment ID `vibe-learning-schedule`.
- Strip approval metadata before upstream forwarding.

### 4. Sandbox proxy

Add:

| Portal route                   | Upstream path      | Method | Approval |
| ------------------------------ | ------------------ | ------ | -------- |
| `/api/vibe-coding/sandbox/run` | `/api/sandbox/run` | `POST` | `deploy` |

Requirements:

- POST is approval-gated with assignment ID `vibe-sandbox-run`.
- Strip approval metadata before upstream forwarding.
- Tests must prove upstream is not called before approval.

### 5. Tests

Create a focused integration test, preferably:

- `tests/integration/vibe-coding-phase5-proxy.test.ts`

Required coverage:

- Projects list GET query passthrough.
- Project detail GET path encoding.
- Agents list GET query passthrough.
- Agent run POST without approval returns 409 and does not call upstream.
- Agent run approved POST forwards upstream and strips approval metadata.
- Learning schedule POST rejected approval returns 403.
- Sandbox run approved POST forwards upstream and strips approval metadata.
- RAG ingest existing approval flow continues to pass through existing regression tests.

Use temp approval/collaboration/evidence paths as in Phase 3/4 tests.

## Validation Commands

Run:

```bash
pnpm exec vitest run tests/integration/vibe-coding-phase5-proxy.test.ts
pnpm exec vitest run tests/integration/sangfor-phase4-proxy.test.ts tests/integration/faios-v3-proxy.test.ts tests/integration/aios-v1-mail-proxy.test.ts tests/integration.test.ts tests/unit/command-agent-runtime.test.ts
pnpm run typecheck
pnpm exec prettier --check <changed files>
git diff --check
```

## Constraints

- Preserve existing dirty worktree changes.
- Do not delete or modify duplicate `* 2.*` artifacts.
- Do not execute real external agent runs, sandbox commands, deploys, mail sends, DB migrations, GitHub pushes, merges, tags, or releases.
- Do not implement the `/vibe-coding` UI in this opencode step; Cursor Agent will handle the UI after API routes are verified.

## Completion Criteria

- New API routes exist and follow existing proxy/gate style.
- Dangerous agent, learning, and sandbox POST routes cannot call upstream without approval.
- Approved POST bodies do not leak approval metadata.
- Targeted tests, typecheck, Prettier, and diff whitespace checks pass.
