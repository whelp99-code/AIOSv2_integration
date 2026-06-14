# opencode Phase 3 F-aios-v3 Proxy Directive

기준일: 2026-06-14

## 역할

opencode는 Phase 3 신규 proxy route와 smoke test 구현 담당이다. Cursor Agent는 이후 UI/테스트 보강, Codex는 검증/evidence를 담당한다.

## 목표

`docs/reports/all-products-operational-development-plan-2026-06-14.md`의 Phase 3 기준으로 F-aios-v3-core 통합을 확장한다.

현재 존재:

| Route                    | Upstream                                  |
| ------------------------ | ----------------------------------------- |
| `/api/aios-v3/health`    | `/health`                                 |
| `/api/aios-v3/workflows` | `/api/workflows`                          |
| `/api/aios-v3/knowledge` | `/api/knowledge`, `/api/knowledge/search` |

추가할 우선 route:

| Route                       | GET upstream                                | POST upstream           | Gate                 |
| --------------------------- | ------------------------------------------- | ----------------------- | -------------------- |
| `/api/aios-v3/orchestrator` | `/api/orchestrator`                         | `/api/orchestrator/run` | `deploy`             |
| `/api/aios-v3/monitoring`   | `/api/monitoring`                           | none                    | none                 |
| `/api/aios-v3/lightrag`     | `/api/lightrag/search` 또는 `/api/lightrag` | `/api/lightrag/ingest`  | POST `data-mutation` |

## 구현 규칙

- 기존 `getFaiosV3Url`, `proxyUpstreamJson`, `upstreamProxyResponse`, `upstreamErrorResponse`, `createGatedHandler` 패턴을 재사용한다.
- GET은 query string을 보존한다.
- POST는 JSON body를 보존한다.
- write/execute 성격 POST는 approval gate를 사용한다.
- upstream unavailable은 기존 `upstreamErrorResponse` 또는 `upstreamProxyResponse` 패턴으로 degraded/error response를 반환한다.
- secret/raw env를 노출하지 않는다.
- 기존 `/api/workflows`는 AIOS v1 task mapping이므로 변경하지 않는다.
- `* 2.*` 파일 삭제 금지.
- 외부 전송, 배포, 운영 DB 변경, GitHub push/merge/tag 금지.

## 테스트 요구사항

신규 테스트 파일 권장:

```text
tests/integration/faios-v3-proxy.test.ts
```

최소 테스트:

| Scenario                           | Expected                     |
| ---------------------------------- | ---------------------------- |
| orchestrator GET success           | upstream JSON 반환           |
| monitoring GET success             | upstream JSON 반환           |
| lightrag GET query passthrough     | query가 upstream path에 포함 |
| orchestrator POST without approval | 409 pending                  |
| lightrag POST without approval     | 409 pending                  |
| approved orchestrator POST         | upstream forwarding          |
| upstream failure                   | error/degraded response      |

Mock은 `globalThis.fetch` 기반으로 우선 작성한다. approval flow는 기존 temp state/env fixture 패턴을 사용한다.

## 검증 명령

```bash
pnpm exec vitest run tests/integration/faios-v3-proxy.test.ts
pnpm exec prettier --check apps/web/src/app/api/aios-v3/orchestrator/route.ts apps/web/src/app/api/aios-v3/monitoring/route.ts apps/web/src/app/api/aios-v3/lightrag/route.ts tests/integration/faios-v3-proxy.test.ts
```

가능하면 추가:

```bash
pnpm run typecheck
```

## 완료 기준

- 세 route가 존재한다.
- GET read-only route는 approval 없이 proxy된다.
- POST execute/ingest route는 approval 없이 upstream을 호출하지 않는다.
- targeted tests가 통과한다.
