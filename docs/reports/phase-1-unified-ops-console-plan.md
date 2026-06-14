# Phase 1 Unified Ops Console Plan

**Date:** 2026-06-14  
**Source:** `product-integration-blueprint-status.md` and `all-products-operational-development-plan-2026-06-14.md`  
**Goal:** Make AIOSv2 Portal the operating screen for product health, approvals, agent dispatch, and evidence.

## Summary

The repo already has an Ops Console component and several supporting APIs. Phase 1 should extend the existing surface instead of creating a separate dashboard.

Primary UI target:

- `apps/web/src/components/ops/ops-console.tsx`
- Existing sidebar route: `/ops`

Primary data sources:

| Data                   | Existing route                                                                   |
| ---------------------- | -------------------------------------------------------------------------------- |
| Product health         | `/api/integrations/health`, `/api/ops/health`                                    |
| Approvals              | `/api/approvals`                                                                 |
| Collaboration sessions | `/api/collaboration/sessions`                                                    |
| Dispatch execution     | existing collaboration dispatch scripts, then API/UI bridge                      |
| Evidence               | `docs/evidence/cursor-opencode-main-session.md` and phase-specific evidence docs |

## Required Behavior

The operator must be able to do these in one screen:

| Capability     | Behavior                                                             |
| -------------- | -------------------------------------------------------------------- |
| Product status | See all products with healthy, degraded, unreachable, planned states |
| Approval queue | Approve, reject, defer, and resume gated work                        |
| Agent dispatch | Trigger opencode and Cursor Agent tasks from approved prompts        |
| Job progress   | See running, done, failed, waiting-for-approval states               |
| Evidence       | Open the latest verification/evidence report                         |

## Implementation Plan

### 1. Ops summary aggregation

Add a minimal aggregation route only if existing UI fetches are too fragmented.

Recommended route:

```text
GET /api/ops/summary
```

Response shape:

```ts
interface OpsSummaryResponse {
  health: unknown;
  approvals: unknown[];
  sessions: unknown[];
  evidence: Array<{
    title: string;
    path: string;
    updatedAt?: string;
  }>;
  dispatch: {
    cursorAgentAvailable: boolean;
    opencodeAvailable: boolean;
  };
}
```

Rules:

- Reuse existing route handlers or shared helpers where available.
- Do not duplicate integration probing logic.
- Do not expose secrets or raw environment variables.

### 2. Console UI

Extend `OpsConsole` tabs to:

| Tab       | Content                                   |
| --------- | ----------------------------------------- |
| Health    | Product cards from integration health     |
| Approvals | Pending and recent approvals with actions |
| Dispatch  | opencode and Cursor Agent task forms      |
| Evidence  | Links to latest evidence docs             |

Dispatch form fields:

| Field           | Requirement                      |
| --------------- | -------------------------------- |
| Tool            | `opencode` or `cursor-agent`     |
| Prompt          | Required, textarea               |
| Mode            | `plan`, `implement`, `verify`    |
| Target files    | Optional comma-separated list    |
| Approval action | Required only for risky commands |

### 3. Dispatch bridge

For Phase 1, use local script-backed execution only.

Allowed commands:

```bash
pnpm collaboration:dispatch-cursor-agent -- "<prompt>"
pnpm collaboration:dispatch-opencode
```

Recommended API:

```text
POST /api/ops/dispatch
```

Request:

```ts
interface OpsDispatchRequest {
  tool: "opencode" | "cursor-agent";
  prompt: string;
  mode: "plan" | "implement" | "verify";
  targetFiles?: string[];
  approvalId?: string;
}
```

Rules:

- `verify` mode can run without approval.
- `implement` mode can run for repo-local code changes.
- external-send, deploy, device-control, DB mutation, push, merge, release require approval.

### 4. Job progress and evidence

Store every dispatch result in collaboration session metadata or a phase evidence file.

Evidence format:

```text
docs/evidence/phase-1-unified-ops-console-verification.md
```

Each entry must include:

- command
- timestamp
- status
- output summary
- linked assignment id if available
- approval id if applicable

## Test Plan

Targeted tests:

```bash
pnpm exec vitest run tests/integration.test.ts
pnpm exec vitest run tests/approval-gate.test.ts
pnpm exec vitest run tests/unit/command-agent-runtime.test.ts
```

Manual smoke:

```bash
pnpm collaboration:dispatch-cursor-agent -- "Respond with exactly: OK"
```

UI acceptance:

- `/ops` loads without throwing.
- Health tab handles healthy, degraded, unreachable states.
- Approval actions update queue state.
- Dispatch form validates empty prompt.
- Evidence tab shows at least one local report link.

## Acceptance Criteria

- Operators can see product health, approvals, active assignments, dispatch actions, and evidence from one screen.
- No dangerous operation runs without approval.
- Long-running jobs show at least queued/running/done/failed state.
- Phase 1 evidence document records test and smoke results.
