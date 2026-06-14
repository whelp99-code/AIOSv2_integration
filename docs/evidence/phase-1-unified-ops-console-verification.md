# Phase 1 Unified Ops Console Verification

기준일: 2026-06-14

## 역할 분리

| 역할             | 담당         | 결과                                                                                                   |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| 구현             | opencode     | Phase 1 Ops Console route/UI/test 초안 검증 및 포맷 보정                                               |
| 수정/테스트 보강 | Cursor Agent | `@aios/web` typecheck blocker 수정. wrapper는 120초 timeout으로 failed를 반환했지만 파일 변경은 적용됨 |
| 검증             | Codex        | diff, typecheck, targeted tests, Prettier, whitespace 검증                                             |

## 구현 범위

| 파일                                           | 변경                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/web/src/app/api/ops/summary/route.ts`    | health, approvals, sessions, evidence, dispatch availability aggregation route 추가    |
| `apps/web/src/app/api/ops/dispatch/route.ts`   | opencode/Cursor Agent dispatch route 추가. 위험 action은 approval pending으로 409 반환 |
| `apps/web/src/components/ops/ops-console.tsx`  | Health, Approvals, Dispatch, Evidence 탭 통합                                          |
| `tests/integration.test.ts`                    | `/api/ops/summary`, safe dispatch, risky approval gating integration test 추가         |
| `apps/web/src/lib/middleware/error-handler.ts` | `ApiErrorResponse` cast 제거, dev-only stack 타입 명시                                 |
| `apps/web/tsconfig.json`                       | `.next` generated duplicate type artifacts 제외                                        |

## 검증 결과

### Targeted tests

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

### Changed-file Prettier

명령:

```bash
pnpm exec prettier --check apps/api/src/index.ts apps/api/src/context/index.ts apps/web/src/app/api/ops/summary/route.ts apps/web/src/app/api/ops/dispatch/route.ts apps/web/src/components/ops/ops-console.tsx apps/web/src/lib/middleware/error-handler.ts apps/web/tsconfig.json tests/integration.test.ts docs/reports/phase-0-duplicate-artifact-inventory.md docs/reports/phase-0-typecheck-blocker.md docs/reports/opencode-phase1-unified-ops-console-implementation-directive.md docs/reports/cursor-agent-phase1-fix-test-directive.md
```

결과:

```text
All matched files use Prettier code style!
```

판정: 통과.

### Whitespace check

명령:

```bash
git diff --check
```

결과: 출력 없음.

판정: 통과.

## 승인 정책 확인

| 작업                              | 정책                                | 구현 상태     |
| --------------------------------- | ----------------------------------- | ------------- |
| `verify` dispatch                 | 승인 없이 허용                      | 통과          |
| `implement`/`plan` + risky action | 실행하지 않고 approval pending 생성 | 통과          |
| 삭제/전송/배포/DB/push/tag        | 자동 실행 금지                      | 실행하지 않음 |

## 남은 리스크

| 리스크                       | 상태                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Cursor Agent wrapper timeout | `agent` 실행은 변경을 적용했지만 wrapper가 120초 timeout으로 failed 반환. timeout 설정 또는 더 작은 prompt 분할 필요 |
| `* 2.*` 중복 산출물          | 삭제하지 않음. 33개 identical 삭제 후보, 2개 historical snapshot 후보                                                |
| UI runtime smoke             | API/type/test는 통과. 브라우저 수동 smoke는 아직 미실행                                                              |
