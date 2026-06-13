# Cursor -> opencode 수정 지시서

## 목표

최신 커밋 `0c90b6e`의 Phase 5/6 변경분에서 발견된 검증 실패와 런타임 리스크를 수정한다.

Codex 리뷰 결과 기준 현재 상태:

- `pnpm test`: 실패
- `pnpm lint`: 실패
- `pnpm format:check`: 실패
- `pnpm typecheck`: 통과
- `pnpm --filter @aios/web build`: 통과, warning 있음

최우선 목표는 `pnpm test && pnpm lint && pnpm typecheck && pnpm --filter @aios/web build` 통과다.

## 역할

- Cursor: 지휘, 검토, 상태 문서 정리
- opencode: 실제 코드 수정, 테스트 실행, 결과 보고
- Codex: 수정 후 diff 리뷰와 재검증

## Task 1. Vitest alias 및 Phase 5 smoke test 복구

### 문제

`pnpm test`가 실패한다.

에러:

```txt
Cannot find package '@/lib/integrations/aios-v1-proxy-handler'
```

관련 파일:

- `vitest.config.ts`
- `tests/phase5-smoke.test.ts`
- `apps/web/src/app/api/customers/route.ts`
- `apps/web/src/lib/integrations/aios-v1-proxy-handler.ts`

### 수정 지시

1. `vitest.config.ts`에 alias 추가:
   - `@` -> `apps/web/src`
2. `createAiosV1ProxyHandler`가 테스트에서 context 없이 호출되어도 깨지지 않도록 기본값 처리:
   - 현재 handler signature가 `{ params }` destructuring에 의존함
   - context 미전달 시 `{ params: Promise.resolve({}) }`로 동작하도록 보완
3. 수정 후 `pnpm test` 실행.

### Acceptance

- `pnpm test` 통과
- `tests/phase5-smoke.test.ts`가 skip/collect 실패 없이 실제 실행됨

## Task 2. Approval middleware body 소비 버그 수정

### 문제

`createGatedHandler`와 `withApprovalGate`가 `req.json()`을 먼저 읽은 뒤 같은 `Request`를 handler에 넘긴다.

그 결과 handler 내부의 `request.json()`이 실패할 수 있다.

관련 파일:

- `apps/web/src/lib/integrations/approval-middleware.ts`
- `apps/web/src/app/api/plan/route.ts`
- `apps/web/src/app/api/analyze/route.ts`
- `apps/web/src/app/api/risk/route.ts`
- `apps/web/src/app/api/commands/route.ts`
- `apps/web/src/app/api/tasks/route.ts`
- `apps/web/src/app/api/knowledge/route.ts`
- `apps/web/src/app/api/aios-v3/knowledge/route.ts`
- `apps/web/src/app/api/aios-v3/workflows/route.ts`

### 수정 지시

아래 중 하나로 통일:

- 권장: middleware가 파싱한 `body`를 handler context로 넘기고 route handler는 다시 `request.json()`을 읽지 않게 변경
- 대안: body를 읽은 뒤 새 `Request`를 재생성해서 handler에 전달

개발 모드 우회 경로도 동일하게 수정한다.

### Acceptance

- 승인 필요 POST 첫 요청은 `409 approval pending`
- 승인 후 같은 payload + `approvalId` 재요청 시 upstream handler가 정상 payload를 받음
- body double-read로 인한 `Invalid request body`가 없어야 함

## Task 3. ApprovalActionType 정규화 불일치 수정

### 문제

도메인 타입에는 아래 action이 있다.

```ts
"delete";
"send";
"deploy";
"external-share";
"data-mutation";
"config-change";
"device-control";
"financial";
"user-management";
```

하지만 일부 normalize/type guard는 4개만 인정하고 나머지를 `deploy`로 바꾼다.

관련 파일:

- `packages/domain/src/models/approval-policy.ts`
- `packages/infrastructure/src/collaboration/approval-file-store.ts`
- `apps/web/src/app/api/approvals/route.ts`
- `apps/web/src/app/api/collaboration/execute/route.ts`

### 수정 지시

1. 모든 `ApprovalActionType` 값을 인정하는 공통 type guard를 만든다.
2. `normalizeApprovalActionType`, `isApprovalActionType`, `normalizeActionType`가 같은 기준을 쓰게 한다.
3. `data-mutation`, `config-change`, `device-control`이 저장 후 재조회 시 변질되지 않게 한다.

### Acceptance

- `POST /api/approvals`가 `data-mutation`, `config-change`, `device-control`을 정상 생성
- 저장 후 `GET /api/approvals`에서도 actionType 유지
- 관련 테스트 추가 또는 기존 테스트 확장

## Task 4. AIOS v1 proxy adapter 설정 의존성 완화

### 문제

`AiosV1ProxyAdapter`가 `getConfig()`를 호출한다.

`getConfig()`는 Microsoft/GitHub/Slack secret까지 필수로 요구하므로, 단순 AIOS v1 proxy도 환경변수 부족으로 실패할 수 있다.

관련 파일:

- `packages/proxy-core/src/aios-v1-adapter.ts`
- `packages/config/src/schema.ts`
- `apps/web/src/lib/integrations/aios-v1-proxy-handler.ts`

### 수정 지시

1. `AiosV1ProxyAdapter`는 필요한 값만 읽는다:
   - `AIOS_V1_URL`
   - `AIOS_V1_API_KEY`
2. 전체 secret 검증이 필요한 곳과 proxy adapter 설정을 분리한다.
3. 기본값은 현재 integration registry 또는 env default와 일관되게 맞춘다.

### Acceptance

- `DATABASE_URL`, `MICROSOFT_*`, `GITHUB_TOKEN`, `SLACK_BOT_TOKEN`이 없어도 AIOS v1 read proxy 생성 자체는 실패하지 않음
- upstream down이면 config validation error가 아니라 정상 proxy error/health degraded로 표현

## Task 5. Ops SSE EventSource 포맷 수정

### 문제

`text/event-stream` 응답인데 `ReadableStream`에 객체를 enqueue하고 있다.

브라우저 `EventSource`는 아래 형식의 문자열/bytes를 기대한다.

```txt
data: {"type":"health-update",...}

```

관련 파일:

- `packages/health/src/registry.ts`
- `apps/web/src/app/api/ops/health/stream/route.ts`
- `apps/web/src/components/ops/ops-console.tsx`

### 수정 지시

1. `createHealthStream`이 `ReadableStream<Uint8Array>` 또는 문자열 stream을 반환하도록 변경.
2. 각 event는 `data: ${JSON.stringify(event)}\n\n` 형식으로 encode.
3. `EventSource.onmessage`에서 기존 JSON parse가 정상 동작하게 유지.

### Acceptance

- `/api/ops/health/stream`이 EventSource에서 정상 수신됨
- 브라우저 콘솔에 SSE parse error 없음
- Ops Console health tab 실시간 업데이트 동작

## Task 6. degraded integration health UI 반영

### 문제

`/api/integrations/health`는 일부 장애 시 `503` + body를 반환한다.

하지만 Settings/Dashboard는 `res.ok`일 때만 JSON을 읽어서 degraded 상태를 버린다.

관련 파일:

- `apps/web/src/app/api/integrations/health/route.ts`
- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/components/dashboard/dashboard.tsx`

### 수정 지시

1. Settings/Dashboard에서 `/api/integrations/health` 응답은 `res.ok`와 별개로 JSON parse.
2. body에 `projects`가 있으면 degraded/unreachable/planned 상태도 화면에 표시.
3. 네트워크/JSON parse 실패만 빈 상태 처리.

### Acceptance

- 일부 upstream down 시에도 integrations 목록이 사라지지 않음
- degraded/unreachable/planned 상태가 UI에 표시됨

## Task 7. `settings/page.tsx` dynamic export 정리

### 문제

`settings/page.tsx`는 `'use client'` component인데 `export const dynamic = 'force-dynamic'`이 있음.

이미 `settings/layout.tsx`에 dynamic이 있다.

관련 파일:

- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/app/settings/layout.tsx`

### 수정 지시

1. `apps/web/src/app/settings/page.tsx`의 `export const dynamic = 'force-dynamic'` 제거.
2. `apps/web/src/app/settings/layout.tsx`의 dynamic 유지.
3. build 재확인.

### Acceptance

- `pnpm --filter @aios/web build` 통과
- `/settings` route는 dynamic으로 유지

## Task 8. Sangfor roadmap route 누락 정리

### 문제

`docs/reports/phase5-handoff.md`에는 `/api/sangfor/compliance/roadmap`가 포함되어 있으나 실제 route가 없다.

관련 파일:

- `docs/reports/phase5-handoff.md`
- `apps/web/src/app/api/sangfor/compliance/roadmap/route.ts`

### 수정 지시

둘 중 하나 선택:

1. 구현:
   - `POST /api/sangfor/compliance/roadmap`
   - upstream: `/api/compliance/roadmap`
   - Phase 5 handoff 기준 read-like planning이면 gate 없음
2. 문서 scope 수정:
   - Phase 5 out-of-scope 또는 Phase 6 backlog로 명확히 이동

권장: 구현.

### Acceptance

- route가 실제 존재하거나 문서가 정확히 정정됨
- 가능하면 smoke test 추가

## Task 9. 문서/evidence 상태 정정

### 문제

현재 문서에는 테스트 통과/remaining work none이라고 되어 있으나 실제 검증 결과와 다르다.

관련 파일:

- `docs/evidence/cursor-opencode-main-session.md`
- `docs/reports/phase6-progress-report.md`
- `docs/reports/product-integration-blueprint-status.md`

### 수정 지시

1. 수정 전 상태를 `Codex review found blockers`로 기록.
2. 수정 완료 후 실제 재검증 결과로 갱신.
3. `remaining work: none`은 모든 acceptance 통과 전까지 쓰지 않는다.

### Acceptance

- 문서의 test/build/lint 상태가 실제 명령 결과와 일치
- 실패/수정/재검증 이력이 남음

## Task 10. lint/format/trailing whitespace 정리

### 문제

현재 품질 게이트 실패:

- `pnpm lint`: 실패
- `pnpm format:check`: 실패
- `git diff --check HEAD~1..HEAD`: trailing whitespace 다수

대표 오류:

- `apps/web/next.config.js`: CommonJS `module` no-undef
- ops health routes: empty block
- `memory-tower-client.ts`: caught error cause
- scripts: no-undef/no-unused-vars

### 수정 지시

1. `pnpm lint` 기준 오류 제거.
2. `pnpm format:check` 통과하도록 포맷 정리.
3. trailing whitespace 제거.
4. 단, 대량 formatting이 너무 크면 변경 범위를 Phase 5/6 신규/수정 파일 중심으로 제한하고 이유를 문서화.

### Acceptance

- `pnpm lint` 통과
- `pnpm format:check` 통과 또는 기존 레거시 범위 제외 정책 명시
- `git diff --check HEAD~1..HEAD` clean

## 최종 검증 명령

opencode 수정 후 아래를 반드시 실행하고 결과를 evidence에 남긴다.

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm --filter @aios/web build
pnpm --filter @aios/infrastructure test
pnpm --filter @aios/application test
pnpm --filter @aios/infrastructure/memory test
```

가능하면 추가:

```bash
git diff --check HEAD~1..HEAD
```

## 완료 기준

아래 조건을 모두 만족해야 완료로 표시한다.

- `pnpm test` 통과
- `pnpm lint` 통과
- `pnpm typecheck` 통과
- `pnpm --filter @aios/web build` 통과
- approval gate body double-read 문제 해결
- approval action type 변질 없음
- Ops SSE 정상 동작
- degraded health UI 표시
- 문서/evidence가 실제 검증 결과와 일치

완료 전에는 `remaining work: none`, `25/25 tests passing`, `Phase 5/6 complete`로 기록하지 말 것.
