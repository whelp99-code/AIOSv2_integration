# Phase 4 Sangfor Operational Proxy Verification

Date: 2026-06-14

## Scope

Phase 4 added the next Sangfor operational proxy slice:

- Device read proxies.
- Approval-gated compliance write proxies.
- Shared approval gate hardening for `assignmentId` and `actionType` binding.

## Collaboration Roles

| Role               | Tool                    | Result                                                                                   |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------- |
| Implementation     | `opencode run`          | Added Sangfor device/compliance routes and tests                                         |
| Fix/Test follow-up | `opencode run`          | Hardened shared approval gate after Cursor Agent finding                                 |
| Review             | `agent --print --trust` | Passed after hardening                                                                   |
| Verification       | Codex                   | Re-ran targeted tests, regression tests, typecheck, Prettier, and diff whitespace checks |

## Runtime Surface

| Route                              | Method | Upstream path                     | Approval         |
| ---------------------------------- | ------ | --------------------------------- | ---------------- |
| `/api/sangfor/device/capture-menu` | `GET`  | `/api/device/capture-menu{query}` | none             |
| `/api/sangfor/device/compare`      | `GET`  | `/api/device/compare{query}`      | none             |
| `/api/sangfor/compliance/track`    | `POST` | `/api/compliance/track`           | `external-share` |
| `/api/sangfor/compliance/roadmap`  | `POST` | `/api/compliance/roadmap`         | `external-share` |
| `/api/sangfor/compliance/proposal` | `POST` | `/api/compliance/proposal`        | `external-share` |

## Approval Gate Hardening

`ensureApprovedAction` now rejects reused approval IDs when:

- `approval.assignmentId !== input.assignmentId`
- `approval.actionType !== input.actionType`

This prevents an approved request for one assignment or action type from authorizing a different operation.

## Cursor Agent Findings And Resolution

| Finding                                                         | Resolution                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Approval IDs could be reused across assignments/action types    | Shared gate now validates `assignmentId` and `actionType` before allowing execution |
| Compliance write routes must not call upstream without approval | All compliance POST routes return gate response before `proxyUpstreamJson`          |
| Approved payload must not leak approval metadata                | Tests assert `approvalId` and `requestedBy` are stripped before upstream forwarding |

## Verification Commands

```bash
pnpm exec vitest run tests/integration/sangfor-phase4-proxy.test.ts
pnpm exec vitest run tests/phase5-smoke.test.ts
pnpm exec vitest run tests/integration/faios-v3-proxy.test.ts tests/integration/aios-v1-mail-proxy.test.ts tests/integration.test.ts tests/unit/command-agent-runtime.test.ts
pnpm run typecheck
pnpm exec prettier --check apps/web/src/lib/integrations/approval-gate.ts apps/web/src/app/api/sangfor/device/capture-menu/route.ts apps/web/src/app/api/sangfor/device/compare/route.ts apps/web/src/app/api/sangfor/compliance/track/route.ts apps/web/src/app/api/sangfor/compliance/roadmap/route.ts apps/web/src/app/api/sangfor/compliance/proposal/route.ts tests/integration/sangfor-phase4-proxy.test.ts docs/reports/opencode-phase4-sangfor-operational-proxy-directive.md docs/evidence/phase-3-faios-v3-proxy-verification.md
git diff --check
```

## Results

| Check                                                                        | Result         |
| ---------------------------------------------------------------------------- | -------------- |
| `tests/integration/sangfor-phase4-proxy.test.ts`                             | PASS, 10 tests |
| `tests/phase5-smoke.test.ts`                                                 | PASS, 8 tests  |
| Mail proxy, F-aios-v3 proxy, collaboration, command runtime regression tests | PASS, 49 tests |
| `pnpm run typecheck`                                                         | PASS, 51 tasks |
| Changed-file Prettier check                                                  | PASS           |
| `git diff --check`                                                           | PASS           |
| Cursor Agent re-review                                                       | PASS           |

## Risk Notes

- No real Sangfor upstream device, compliance, or workflow action was executed.
- Tests use mocked `fetch` and temp approval/collaboration/evidence files.
- Approved approval IDs remain reusable for the same assignment/action type by design.
- The untracked `* 2.*` duplicate artifacts remain untouched and require separate approval before deletion.

## Phase 4 Status

PASS. Ready to proceed to Phase 5 with the same collaboration split: opencode implementation, Cursor Agent fix/test review, Codex verification and evidence.
