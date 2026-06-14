# Phase 3 F-aios-v3 Proxy Verification

Date: 2026-06-14

## Scope

Phase 3 connected the AIOS v2 web API layer to F-aios-v3 read/run surfaces with approval-gated write paths.

## Collaboration Roles

| Role               | Tool                    | Result                                                                                                           |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Implementation     | `opencode run`          | Added F-aios-v3 proxy routes and integration tests                                                               |
| Fix/Test follow-up | `opencode run`          | Fixed Cursor Agent findings: approval metadata leak, query passthrough, POST failure and rejected approval tests |
| Review             | `agent --print --trust` | First review failed, second review passed                                                                        |
| Verification       | Codex                   | Re-ran targeted tests, regression tests, typecheck, Prettier, and diff whitespace checks                         |

## Changed Runtime Surface

| Route                       | Method | Upstream path                                   | Approval        |
| --------------------------- | ------ | ----------------------------------------------- | --------------- |
| `/api/aios-v3/orchestrator` | `GET`  | `/api/orchestrator{query}`                      | none            |
| `/api/aios-v3/orchestrator` | `POST` | `/api/orchestrator/run`                         | `deploy`        |
| `/api/aios-v3/monitoring`   | `GET`  | `/api/monitoring{query}`                        | none            |
| `/api/aios-v3/lightrag`     | `GET`  | `/api/lightrag/search?q=...` or `/api/lightrag` | none            |
| `/api/aios-v3/lightrag`     | `POST` | `/api/lightrag/ingest`                          | `data-mutation` |

## Cursor Agent Findings And Resolution

| Finding                                                | Resolution                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| Approved POST forwarded `approvalId` upstream          | POST handlers now strip `approvalId` before `proxyUpstreamJson`      |
| Tests did not assert upstream body shape               | Approved POST tests capture upstream body and assert no `approvalId` |
| Orchestrator/monitoring GET query strings were dropped | GET handlers now append `request.url` search string to upstream path |
| POST upstream failure path was untested                | Added orchestrator and lightrag upstream `502` tests                 |
| Rejected approval path was untested                    | Added orchestrator and lightrag rejected approval `403` tests        |

## Verification Commands

```bash
pnpm exec vitest run tests/integration/faios-v3-proxy.test.ts
pnpm exec vitest run tests/integration/aios-v1-mail-proxy.test.ts tests/integration.test.ts tests/unit/command-agent-runtime.test.ts
pnpm run typecheck
pnpm exec prettier --check apps/web/src/app/api/aios-v3/orchestrator/route.ts apps/web/src/app/api/aios-v3/monitoring/route.ts apps/web/src/app/api/aios-v3/lightrag/route.ts tests/integration/faios-v3-proxy.test.ts docs/reports/opencode-phase3-faios-v3-proxy-directive.md
git diff --check
```

## Results

| Check                                                       | Result         |
| ----------------------------------------------------------- | -------------- |
| `tests/integration/faios-v3-proxy.test.ts`                  | PASS, 19 tests |
| Mail proxy, collaboration, command runtime regression tests | PASS, 30 tests |
| `pnpm run typecheck`                                        | PASS, 51 tasks |
| Changed-file Prettier check                                 | PASS           |
| `git diff --check`                                          | PASS           |
| Cursor Agent re-review                                      | PASS           |

## Risk Notes

- No live F-aios-v3 upstream server was called; tests use mocked `fetch`.
- External send, deploy, DB mutation, GitHub push, tag, and release actions were not executed.
- The untracked `* 2.*` duplicate artifacts remain untouched and require separate approval before deletion.

## Phase 3 Status

PASS. Ready to proceed to Phase 4 with the same collaboration split: opencode implementation, Cursor Agent fix/test review, Codex verification and evidence.
