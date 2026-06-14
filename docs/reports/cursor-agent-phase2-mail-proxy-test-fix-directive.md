# Cursor Agent Phase 2 Mail Proxy Test Fix Directive

기준일: 2026-06-14

## 역할

Cursor Agent는 opencode가 구현한 AIOS v1 mail proxy route의 테스트 안정화와 최소 수정 담당이다.

## 현재 상태

opencode가 적용한 구현:

| 파일                                                 | 상태                                         |
| ---------------------------------------------------- | -------------------------------------------- |
| `apps/web/src/app/api/mail-import/route.ts`          | `POST` external-share gate                   |
| `apps/web/src/app/api/mail-candidates/route.ts`      | `GET` none, `POST` external-share gate       |
| `apps/web/src/app/api/mail-insight-threads/route.ts` | `GET` none, `POST` external-share gate       |
| `tests/integration/aios-v1-mail-proxy.test.ts`       | 신규 테스트 파일이 있으나 mock 전략이 불안정 |

현재 문제:

- `tests/integration/aios-v1-mail-proxy.test.ts`가 proxy-core adapter mock과 실제 route import module graph를 맞추지 못해 timeout이 발생한다.
- opencode가 module mock을 시도한 뒤 테스트 실패가 8개로 늘었다.

## 작업 목표

`tests/integration/aios-v1-mail-proxy.test.ts`를 안정화한다. 구현 route를 축소하지 말고 테스트만 합리적으로 고친다.

## 권장 테스트 전략

- route가 `createAiosV1ProxyHandler`를 통해 `getAiosV1Adapter().request(...)`를 호출하므로, module mock이 route import 전에 확실히 적용되게 정리한다.
- `vi.mock("@aios/proxy-core", ...)`와 실제 route import alias가 맞지 않으면 `vi.doMock` + `vi.resetModules` + route dynamic import 패턴을 사용한다.
- 어려우면 GET upstream success/failure는 `globalThis.fetch` mock으로 검증하되, retry/timeout 때문에 fake timer에 의존하지 않는 범위로 제한한다.
- 승인 pending/rejected는 upstream 호출이 없어야 하므로 안정적인 테스트부터 유지한다.
- approved POST는 실제 forwarding이 되는지만 검증한다. 외부 네트워크로 나가면 안 된다.

## 금지

- 구현 route의 approval gate를 약화하지 말 것.
- 테스트를 skip/todo로 바꾸지 말 것.
- `.next` generated file, `* 2.*` 파일 삭제/수정 금지.
- 외부 전송, 배포, 운영 DB 변경, GitHub push/merge/tag 금지.

## 검증 명령

```bash
pnpm exec vitest run tests/integration/aios-v1-mail-proxy.test.ts
pnpm exec prettier --check apps/web/src/app/api/mail-import/route.ts apps/web/src/app/api/mail-candidates/route.ts apps/web/src/app/api/mail-insight-threads/route.ts tests/integration/aios-v1-mail-proxy.test.ts
```

## 완료 기준

- mail proxy 테스트가 통과한다.
- route 파일 포맷이 통과한다.
- 실패 시 정확한 남은 blocker와 수정 후보를 보고한다.
