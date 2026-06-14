# Phase 2 AIOS v1 Mail Proxy Verification

기준일: 2026-06-14

## 역할 분리

| 역할             | 담당         | 결과                                                                                           |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| 구현             | opencode     | `mail-candidates`, `mail-insight-threads` POST handler 추가. `mail-*` route unused import 제거 |
| 수정/테스트 보강 | Cursor Agent | `@aios/proxy-core` alias/mock 전략 독립 리뷰 PASS                                              |
| 검증             | Codex        | route diff, targeted test, typecheck, Prettier, whitespace 검증 통과                           |

## 구현 상태

| Route                       | GET  | POST | Approval gate                     |
| --------------------------- | ---- | ---- | --------------------------------- |
| `/api/mail-import`          | 없음 | 있음 | `external-share`                  |
| `/api/mail-candidates`      | 있음 | 있음 | GET `none`, POST `external-share` |
| `/api/mail-insight-threads` | 있음 | 있음 | GET `none`, POST `external-share` |

## 실행한 검증

### Targeted mail proxy test

명령:

```bash
pnpm exec vitest run tests/integration/aios-v1-mail-proxy.test.ts
```

결과:

```text
Test Files  1 passed (1)
Tests       14 passed (14)
```

판정: 통과.

### Regression tests

명령:

```bash
pnpm exec vitest run tests/integration.test.ts tests/unit/command-agent-runtime.test.ts
```

결과:

```text
Test Files  2 passed (2)
Tests       16 passed (16)
```

판정: 통과.

### Full typecheck

명령:

```bash
pnpm run typecheck
```

결과:

```text
Tasks:    51 successful, 51 total
```

판정: 통과.

### Prettier

명령:

```bash
pnpm exec prettier --check vitest.config.ts apps/web/src/app/api/mail-import/route.ts apps/web/src/app/api/mail-candidates/route.ts apps/web/src/app/api/mail-insight-threads/route.ts tests/integration/aios-v1-mail-proxy.test.ts docs/evidence/phase-2-aios-v1-mail-proxy-verification.md
```

결과:

```text
All matched files use Prettier code style!
```

판정: 통과.

### Whitespace

명령:

```bash
git diff --check
```

결과: 출력 없음.

판정: 통과.

## 해결한 원인

초기 실패 원인은 `tests/integration/aios-v1-mail-proxy.test.ts`에서 proxy-core adapter를 mock하려 했지만, route가 사용하는 module graph와 테스트 mock이 일치하지 않은 것이다.

확인했던 설정:

```ts
// vitest.config.ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "apps/web/src"),
  },
}
```

해결:

| 파일                                           | 변경                                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `vitest.config.ts`                             | `@aios/proxy-core` alias를 `packages/proxy-core/src/index.ts`로 추가                         |
| `tests/integration/aios-v1-mail-proxy.test.ts` | `vi.hoisted` + `vi.mock("@aios/proxy-core", ...)`로 route import 전에 adapter request를 mock |

## 현재 판정

Phase 2는 완료 상태다.

완료된 것:

- `mail-candidates` POST handler 추가
- `mail-insight-threads` POST handler 추가
- `mail-import` unused import 제거
- GET upstream success/failure 테스트 통과
- POST without approval `409` pending 테스트 통과
- approved POST forwarding 테스트 통과
- rejected approval `403` 및 upstream 미호출 테스트 통과
- 전체 typecheck 통과

## 다음 실행 지시

다음 Phase도 동일한 협업 구조를 유지한다.

1. opencode: 구현.
2. Cursor Agent: 수정/테스트 보강 또는 독립 리뷰.
3. Codex: 검증/evidence 작성.
