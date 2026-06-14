# Phase 0 Typecheck Blocker

기준일: 2026-06-14

## 목적

현재 `@aios/api` typecheck 실패 원인을 재현하고, 적용한 수정과 검증 결과를 기록한다.

## 재현 명령

```bash
pnpm --filter @aios/api typecheck
```

## 재현 결과

```text
> @aios/api@0.1.0 typecheck /Users/jmpark/Documents/Playground/AIOSv2_integration/apps/api
> tsc --noEmit

src/index.ts(13,10): error TS2724: '"./context"' has no exported member named 'createContext'. Did you mean 'createTRPCContext'?
/Users/jmpark/Documents/Playground/AIOSv2_integration/apps/api:
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL @aios/api@0.1.0 typecheck: `tsc --noEmit`
Exit status 2
```

## 원인

`apps/api/src/index.ts`는 Express 서버에서 tRPC middleware context로 `createContext`를 사용하려고 한다.

```ts
import { createContext } from "./context";
```

그러나 `apps/api/src/context.ts`는 Next adapter용 `createTRPCContext`를 export한다.

```ts
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  return {
    headers: opts.req.headers,
  };
};
```

Express용 `createContext`는 `apps/api/src/context/index.ts`에 존재했지만, 기존에는 라우터가 기대하는 `Context`와 다른 shape를 반환했다.

```ts
export function createContext({ req }: CreateExpressContextOptions): Context {
  return {
    userId: req.headers["x-user-id"] as string | undefined,
    sessionId: req.headers["x-session-id"] as string | undefined,
    userAgent: req.headers["user-agent"],
    ip: req.ip,
  };
}
```

즉, 동일한 `context` 이름 아래에 Next adapter용 파일과 Express adapter용 디렉터리가 공존하고 있으며, TypeScript module resolution은 `./context`를 `apps/api/src/context.ts`로 해석했다. 그 결과 첫 번째 typecheck에서는 `createContext` export를 찾지 못했다.

`./context/index`로 import를 명시한 뒤에는 두 번째 문제가 드러났다. `appRouter`는 `apps/api/src/context.ts`의 `Context` 타입으로 초기화되어 있는데, Express `createContext`는 `userRole`이 없는 별도 타입을 반환하고 있었다.

## 영향 범위

| 범위                    | 영향                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `@aios/api` typecheck   | 실패                                                           |
| root `pnpm typecheck`   | `@aios/api` 실패로 전체 실패                                   |
| Express tRPC middleware | 현재 import가 의도한 Express context와 연결되지 않음           |
| Next adapter context    | `createTRPCContext` 자체는 존재하므로 별도 consumers 확인 필요 |

## 수정 후보

| 후보                                          | 변경 내용                                                                                    | 장점                                                                | 리스크                                              | 상태        |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- | ----------- |
| A. Express context import 명시                | `apps/api/src/index.ts`에서 `./context/index` 또는 더 명확한 별도 경로를 import              | 현재 구조에서 최소 수정. Next context와 Express context를 분리 유지 | 경로가 다소 어색하므로 후속 리팩터링 필요           | 적용        |
| B. Express context 파일명 변경                | `apps/api/src/context/index.ts`를 `apps/api/src/trpc/context.ts` 등으로 정리하고 import 갱신 | module ambiguity 제거                                               | 관련 import 전체 확인 필요                          | 후속 개선안 |
| C. `context.ts`에서 `createContext` re-export | `context.ts`가 Express context도 export                                                      | import 한 줄만 유지 가능                                            | Next/Express adapter 책임이 섞임. 장기적으로 비추천 | 미적용      |

## 권장안

Phase 0 blocker 해소 목적에서는 후보 A를 적용했다.

```ts
import { createContext } from "./context/index";
```

장기 정리는 후보 B가 맞다. `context.ts`와 `context/index.ts`가 같은 module specifier를 공유하는 구조는 이후에도 import 혼동을 만들 수 있다.

추가로 Express `createContext`는 `apps/api/src/context.ts`의 `Context` 타입을 반환하도록 조정했다. `x-user-id` 헤더를 직접 신뢰하던 기존 Express-only shape는 라우터 계약과 `createTRPCContext`의 보안 주석에 맞지 않아 Authorization/cookie 기반 nullable context로 통일했다.

## 적용한 변경

| 파일                            | 변경                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/api/src/index.ts`         | `createContext` import를 `./context/index`로 명시                                              |
| `apps/api/src/context/index.ts` | 반환 타입을 `../context`의 `Context`로 통일하고 `userId`, `userRole`, `sessionId` shape를 맞춤 |

## 검증 명령

수정 후 최소 검증 결과:

```bash
pnpm --filter @aios/api typecheck
```

결과:

```text
> @aios/api@0.1.0 typecheck /Users/jmpark/Documents/Playground/AIOSv2_integration/apps/api
> tsc --noEmit
```

전체 기준선 검증:

```bash
pnpm typecheck
pnpm exec vitest run tests/unit/command-agent-runtime.test.ts
pnpm exec prettier --check apps/api/src/index.ts
git diff --check
```

## 현재 상태

| 항목                  | 상태                                                      |
| --------------------- | --------------------------------------------------------- |
| blocker 재현          | 완료                                                      |
| 원인 기록             | 완료                                                      |
| 코드 수정             | 완료                                                      |
| `@aios/api` typecheck | 통과                                                      |
| 승인 필요 여부        | 코드 수정 자체는 자동 진행 가능. 삭제/배포/외부 반영 없음 |
