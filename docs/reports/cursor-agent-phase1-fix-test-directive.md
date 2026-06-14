# Cursor Agent Phase 1 Fix/Test Directive

기준일: 2026-06-14

## 역할

Cursor Agent는 Phase 1 구현 결과의 수정/테스트 보강 담당이다. opencode가 완성한 Unified Ops Console 구현을 검증하고, 남은 typecheck/test blocker를 최소 수정으로 해결한다.

## 입력 상태

opencode Phase 1 실행 결과:

| 검증                                                            | 결과           |
| --------------------------------------------------------------- | -------------- |
| `pnpm exec vitest run tests/integration.test.ts`                | 통과, 14 tests |
| `pnpm exec vitest run tests/unit/command-agent-runtime.test.ts` | 통과, 2 tests  |
| `pnpm --filter @aios/api typecheck`                             | 통과           |
| Phase 1 대상 Prettier check                                     | 통과           |
| `pnpm run typecheck`                                            | 실패           |

남은 typecheck 실패:

```text
@aios/web:typecheck:
.next/types/cache-life.d 18.ts(3,1): error TS6200: Definitions of identifiers conflict with those in another file
.next/types/cache-life.d 19.ts(3,1): error TS6200: Definitions of identifiers conflict with those in another file
.next/types/routes.d 18.ts(109,8): error TS2300: Duplicate identifier 'LayoutProps'
.next/types/routes.d 19.ts(109,8): error TS2300: Duplicate identifier 'LayoutProps'
src/lib/middleware/error-handler.ts(40,6): error TS2352: Conversion of type 'ApiErrorResponse' to type 'Record<string, unknown>' may be a mistake
```

## 작업 범위

### 1. `.next/types/* 18.ts`, `* 19.ts` 중복 원인 축소

- `.next` generated artifacts가 typecheck에 포함되는지 확인한다.
- 가능하면 source-level config 또는 clean step으로 해결한다.
- `.next` 산출물 직접 편집은 금지한다.
- 삭제는 가능하면 하지 말고, 필요하면 `rm -rf .next` 같은 destructive cleanup은 실행하지 말고 Codex에게 보고한다.

### 2. `apps/web/src/lib/middleware/error-handler.ts` 타입 오류 수정

- `ApiErrorResponse`를 `Record<string, unknown>`으로 직접 단언하지 말고 `unknown` 경유 또는 명시적 record 생성으로 해결한다.
- 동작은 유지한다.
- `any` 사용 금지.

### 3. Phase 1 regression 확인

확인 대상:

- `apps/web/src/app/api/ops/summary/route.ts`
- `apps/web/src/app/api/ops/dispatch/route.ts`
- `apps/web/src/components/ops/ops-console.tsx`
- `tests/integration.test.ts`

검증 명령:

```bash
pnpm --filter @aios/web typecheck
pnpm --filter @aios/api typecheck
pnpm exec vitest run tests/integration.test.ts tests/unit/command-agent-runtime.test.ts
pnpm exec prettier --check apps/web/src/app/api/ops/summary/route.ts apps/web/src/app/api/ops/dispatch/route.ts apps/web/src/components/ops/ops-console.tsx tests/integration.test.ts apps/web/src/lib/middleware/error-handler.ts
git diff --check
```

## 제약

- 위험 작업 금지: 삭제, 외부 전송, 배포, 운영 DB 변경, GitHub push/merge/tag 실행 금지.
- `* 2.*` 중복 산출물 삭제 금지.
- `.next` generated file 직접 수정 금지.
- 기존 Phase 1 기능을 축소하지 말 것.
- 테스트를 약화하거나 skip하지 말 것.

## 완료 기준

- `@aios/web` typecheck blocker 원인이 해결되거나, generated `.next` 정리 필요로 명확히 보고된다.
- Phase 1 target tests가 계속 통과한다.
- 수정 파일 Prettier와 `git diff --check`가 통과한다.
