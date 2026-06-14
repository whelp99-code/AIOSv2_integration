# Codex Operational Verification Checklist

**Date:** 2026-06-14  
**Owner:** Codex  
**Goal:** Verify that each product integration phase is safe, tested, and ready for the next step.

## Summary

Codex verifies. It should not silently take over opencode or Cursor Agent implementation work unless the user explicitly asks for direct coding. The main responsibilities are review, evidence, risk classification, and approval boundary enforcement.

## Standard Verification Order

Run in this order unless the task has a narrower required check:

```bash
git status --short
git diff --stat
pnpm exec prettier --check <changed-files>
pnpm exec vitest run <targeted-tests>
pnpm typecheck
git diff --check
```

For UI or route work, add the relevant app/package check:

```bash
pnpm --filter @aios/web build
pnpm --filter @aios/api typecheck
```

## Review Checklist

| Area      | Questions                                                     |
| --------- | ------------------------------------------------------------- |
| Scope     | Are changed files limited to the requested phase?             |
| Contracts | Do new routes follow existing API route and proxy patterns?   |
| Approval  | Are risky writes gated before upstream execution?             |
| Auth      | Is user identity server-derived or safely validated?          |
| Tests     | Are success, failure, and approval paths covered?             |
| Evidence  | Is the result written to `docs/evidence` or `docs/reports`?   |
| Docs      | Does `product-integration-blueprint-status.md` need updating? |

## Risk Classification

No additional approval required:

| Work             | Condition                             |
| ---------------- | ------------------------------------- |
| Local docs       | No external side effects              |
| Local tests      | No external side effects              |
| Local code edits | No deploy, send, push, or DB mutation |
| Mock removal     | Does not change production data       |

Approval required:

| Work                                | Required action type         |
| ----------------------------------- | ---------------------------- |
| Email send                          | `send`                       |
| Slack send                          | `send`                       |
| Sangfor workflow execute            | `deploy` or `device-control` |
| RAG ingest with external sharing    | `external-share`             |
| Customer/project destructive delete | `delete`                     |
| Production DB migration or push     | explicit user approval       |
| GitHub push, merge, release tag     | explicit user approval       |

## Evidence Format

Each phase should create or update:

```text
docs/evidence/phase-{N}-verification.md
```

Required sections:

```md
# Phase N Verification

## Scope

## Files Reviewed

## Commands Run

## Results

## Findings

## Approval Required

## Remaining Work
```

Results table:

| Command                          | Result    | Notes              |
| -------------------------------- | --------- | ------------------ |
| `pnpm exec vitest run ...`       | PASS/FAIL | short detail       |
| `pnpm typecheck`                 | PASS/FAIL | blocker if any     |
| `pnpm exec prettier --check ...` | PASS/FAIL | changed files only |
| `git diff --check`               | PASS/FAIL | whitespace safety  |

## Phase-Specific Checks

### Phase 0

- Duplicate artifacts are inventoried, not deleted.
- Known typecheck blocker is documented.
- Cursor Agent and opencode command routing is verified.

### Phase 1

- Ops Console shows health, approvals, dispatch, evidence.
- No dispatch can perform risky external actions without approval.
- Long-running jobs have visible status.

### Phase 2

- Mail proxy routes exist and use existing proxy helpers.
- Approval pending path prevents upstream forwarding.
- Upstream unavailable behavior is tested.

### Phase 3

- F-aios-v3 data source is clearly separated from AIOS v1 tasks.
- RAG/monitoring/orchestrator proxy behavior is documented.

### Phase 4

- Sangfor write routes are approval-gated.
- Device-control or deploy actions cannot bypass approval.

### Phase 5

- vibe-coding RAG ingest has approve and retry flow.
- Agent execution logs evidence.

### Phase 6

- GitHub and Slack actions do not execute externally without approval.
- whelp99 MCP bridge does not expose unrestricted tool execution.

### Phase 7

- End-to-end scenarios are replayed.
- All product build/test results are recorded.
- Remaining risks are explicitly listed.

## Final Acceptance

Codex can mark a phase verification complete only when:

- targeted tests pass or failures are documented as unrelated blockers;
- changed-file formatting passes;
- approval-sensitive routes are reviewed;
- evidence is written;
- next work is concrete and assigned.
