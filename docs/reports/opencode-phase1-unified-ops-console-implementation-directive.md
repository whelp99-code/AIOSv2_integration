# opencode Phase 1 Unified Ops Console Implementation Directive

기준일: 2026-06-14

## 역할

opencode는 Phase 1 신규 기능 구현 담당이다. Codex가 만든 중간 초안을 이어받아 구현 정합성, 타입 안정성, 테스트 통과 상태를 완성한다. Cursor Agent와 Codex는 이후 수정/검증을 담당한다.

## 작업 목표

`docs/reports/phase-1-unified-ops-console-plan.md` 기준으로 `/ops`가 product health, approvals, assignments, dispatch actions, evidence links를 한 화면에서 다루도록 구현한다.

## 현재 초안

이미 추가/수정된 파일:

| 파일                                          | 상태                                       |
| --------------------------------------------- | ------------------------------------------ |
| `apps/web/src/app/api/ops/summary/route.ts`   | 신규 route 초안                            |
| `apps/web/src/app/api/ops/dispatch/route.ts`  | 신규 route 초안                            |
| `apps/web/src/components/ops/ops-console.tsx` | summary/evidence/dispatch UI 확장 초안     |
| `tests/integration.test.ts`                   | ops summary/dispatch integration test 초안 |

## 반드시 지킬 제약

- 위험 작업 금지: 삭제, 외부 전송, 배포, 운영 DB 변경, GitHub push/merge/tag 실행 금지.
- `* 2.*` 미추적 중복 산출물은 삭제하지 말 것.
- 기존 collaboration/approval/evidence store 패턴을 재사용할 것.
- secret, raw env var, token을 API 응답 또는 UI에 노출하지 말 것.
- `cursor` launcher와 Cursor Agent `agent`를 혼동하지 말 것. Cursor Agent dispatch는 `agent` runtime 기준이다.
- 대규모 재작성보다 현재 초안을 타입/테스트 통과 가능한 형태로 정리할 것.

## 구현 요구사항

### 1. `/api/ops/summary`

필수 응답 필드:

```ts
{
  health: unknown;
  approvals: unknown[];
  sessions: unknown[];
  sessionSummary: unknown;
  evidence: Array<{ title: string; path: string; updatedAt?: string }>;
  dispatch: {
    cursorAgentAvailable: boolean;
    opencodeAvailable: boolean;
    cursorAgentStatus: string;
    opencodeStatus: string;
  };
  generatedAt: string;
}
```

요구사항:

- 기존 `getCollaborationServices()`를 사용한다.
- `docs/evidence/*.md` 최신 목록을 10개 이하로 반환한다.
- `createCursorRuntime(...).getStatus()`와 `createOpencodeRuntime(...).getStatus()`로 availability를 확인한다.
- `/api/ops/health`와 중복 로직을 만들지 않는다.

### 2. `/api/ops/dispatch`

요청:

```ts
{
  tool: "opencode" | "cursor-agent";
  mode: "plan" | "implement" | "verify";
  prompt: string;
  targetFiles?: string[];
  approvalAction?: string;
}
```

요구사항:

- `prompt` empty면 400.
- `verify`는 승인 없이 실행 가능.
- `implement`/`plan`이 `delete`, `send`, `deploy`, `external-share`, `data-mutation`, `config-change`, `device-control`, `financial`, `user-management` action을 포함하면 실행하지 말고 approval pending을 생성한다.
- approval pending은 409로 반환한다.
- safe dispatch는 collaboration assignment를 `running` 후 `done`/`failed`로 갱신한다.
- execution 결과는 collaboration artifact와 evidence writer에 남긴다.

### 3. OpsConsole UI

요구사항:

- Health/Approvals/Dispatch/Evidence 탭 제공.
- Dispatch 탭에서 tool, mode, prompt, target files, approval action 입력 가능.
- 빈 prompt는 UI에서 막는다.
- agent availability가 offline이면 dispatch 버튼을 막거나 명확히 표시한다.
- Evidence 탭은 최신 evidence 링크와 최근 assignments를 표시한다.

### 4. Tests

최소 검증:

```bash
pnpm exec vitest run tests/integration.test.ts
pnpm exec vitest run tests/unit/command-agent-runtime.test.ts
pnpm --filter @aios/api typecheck
pnpm exec prettier --check apps/web/src/app/api/ops/summary/route.ts apps/web/src/app/api/ops/dispatch/route.ts apps/web/src/components/ops/ops-console.tsx tests/integration.test.ts
```

## 완료 기준

- 위 테스트 또는 가능한 부분 검증이 통과한다.
- 통과하지 못하면 실패 원인과 수정 필요 파일을 남긴다.
- 삭제/배포/외부 전송은 하지 않는다.
