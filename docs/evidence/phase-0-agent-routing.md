# Phase 0 Agent Routing Evidence

기준일: 2026-06-14

## 목적

Phase 0 기준선 회복 중 Codex, opencode, Cursor Agent 실행 경로가 현재 환경에서 분리되어 동작하는지 확인한다.

## CLI 존재 확인

```bash
command -v opencode
command -v agent
command -v cursor
```

결과:

```text
/Users/jmpark/.opencode/bin/opencode
/Users/jmpark/.local/bin/agent
/Applications/Cursor.app/Contents/Resources/app/bin/cursor
```

## Cursor Agent dispatch 확인

명령:

```bash
pnpm collaboration:dispatch-cursor-agent -- "Respond with exactly: OK"
```

결과:

```json
{
  "ok": true,
  "status": "completed",
  "command": "agent",
  "args": [
    "--print",
    "--trust",
    "--workspace",
    "/Users/jmpark/Documents/Playground/AIOSv2_integration",
    "Respond with exactly: OK"
  ],
  "output": "OK"
}
```

판정: 통과. `CURSOR_AGENT_COMMAND` 기본 경로는 `agent`로 동작한다.

## Runtime unit test

명령:

```bash
pnpm exec vitest run tests/unit/command-agent-runtime.test.ts
```

결과:

```text
RUN  v3.2.6 /Users/jmpark/Documents/Playground/AIOSv2_integration

✓ tests/unit/command-agent-runtime.test.ts (2 tests) 96ms

Test Files  1 passed (1)
Tests       2 passed (2)
```

판정: 통과.

## Typecheck baseline

명령:

```bash
pnpm --filter @aios/api typecheck
```

결과:

```text
src/index.ts(13,10): error TS2724: '"./context"' has no exported member named 'createContext'. Did you mean 'createTRPCContext'?
```

판정: 실패. 원인은 `docs/reports/phase-0-typecheck-blocker.md`에 기록했다.

## 현재 라우팅 기준

| 대상            | 실행 경로  | 현재 상태           | 용도                           |
| --------------- | ---------- | ------------------- | ------------------------------ |
| opencode        | `opencode` | 설치 확인           | 코드 생성/구현 작업            |
| Cursor Agent    | `agent`    | dispatch smoke 통과 | 수정/테스트 보강               |
| Cursor launcher | `cursor`   | 설치 확인           | 에디터 열기, 파일/라인 점프    |
| Codex           | 현재 세션  | 동작 중             | 검증, 정책 확인, evidence 작성 |

## 다음 검증

1. `opencode run "Respond with exactly: OK"` smoke를 별도 isolated prompt로 확인한다.
2. Phase 0 typecheck blocker 수정 후 `pnpm --filter @aios/api typecheck`를 재실행한다.
3. 전체 기준선은 `pnpm typecheck`, changed-file Prettier, `git diff --check` 순서로 확인한다.

## 2026-06-14 Post-Fix Verification

Phase 0 blocker 수정 및 후속 Phase 구현 후 다음 명령을 재실행했다.

```bash
opencode run "Respond with exactly: OK" /Users/jmpark/Documents/Playground/AIOSv2_integration
pnpm typecheck
pnpm test
pnpm lint
pnpm build
git diff --check
```

결과:

| 항목                  | 결과            |
| --------------------- | --------------- |
| opencode smoke        | PASS, `OK`      |
| Cursor Agent dispatch | PASS, `OK`      |
| `pnpm typecheck`      | PASS, 51 tasks  |
| `pnpm test`           | PASS, 394 tests |
| `pnpm lint`           | PASS            |
| `pnpm build`          | PASS, 32 tasks  |
| `git diff --check`    | PASS            |

판정: Phase 0 기준선 blocker는 해소됐다. `* 2.*` 중복 산출물은 `docs/reports/phase-0-duplicate-artifact-inventory.md`에 삭제/보존 후보가 확정됐으며, 실제 삭제는 승인 전까지 수행하지 않는다.
