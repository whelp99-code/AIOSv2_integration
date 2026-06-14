# Phase A-3 Red Team Review — VibeCodingOS + Collaboration

**Reviewer:** Hermes Agent (5-Persona Red Team)
**Date:** 2026-06-14
**Scope:** 7 files across 3 directories

## Files Under Review

| # | File | Lines |
|---|------|-------|
| 1 | `apps/web/src/app/api/vibe-coding/rag/ingest/route.ts` | 51 |
| 2 | `apps/web/src/app/api/vibe-coding/projects/route.ts` | 14 |
| 3 | `apps/web/src/app/api/vibe-coding/health/route.ts` | 14 |
| 4 | `apps/web/src/app/collaboration/page.tsx` | 307 |
| 5 | `apps/web/src/app/api/collaboration/sessions/route.ts` | 43 |
| 6 | `apps/web/src/app/api/collaboration/execute/route.ts` | 334 |
| 7 | `apps/web/src/app/api/collaboration/assignments/[assignmentId]/resume/route.ts` | 20 |

**Supporting lib files reviewed:**
- `src/lib/integrations/approval-gate.ts` (121 lines)
- `src/lib/integrations/upstream-proxy.ts` (68 lines)
- `src/lib/integrations/upstream-urls.ts` (17 lines)
- `src/lib/collaboration/server.ts` (31 lines)

---

## 1. Security Reviewer (보안 취약점, 인증/권한, 데이터 노출 위험)

### 🔴 CRITICAL

#### S-01: 모든 API 엔드포인트에 인증(Authentication) 완전 부재
- **File:** All API routes (`sessions/route.ts`, `execute/route.ts`, `resume/route.ts`, `rag/ingest/route.ts`, `projects/route.ts`, `health/route.ts`)
- **Evidence:** `middleware.ts` 파일이 존재하지 않음. `src/` 디렉토리 전체에 middleware 검색 결과 0건. 모든 API 핸들러에서 세션/토큰/사용자 확인 코드 없음. `src/lib/collaboration/server.ts`에는 사용자 컨텍스트 없이 전역 싱글턴 서비스 반환.
- **Impact:** 인증된 사용자만 접근해야 하는 세션 생성, 실행 트리거, 승인 처리 등 전부 비인가 접근 가능. 네트워크만 닿으면 누구나 collaboration session을 생성/실행/승인할 수 있음.
- **Recommendation:** Next.js middleware 또는 API route 레벨에서 인증 체크 필수. 최소 `getServerSession()` 또는 JWT 검증 필요.

### 🔴 CRITICAL

#### S-02: 서버사이드 코드 실행 — `execute` 엔드포인트에서 임의 도구 실행 가능
- **File:** `apps/web/src/app/api/collaboration/execute/route.ts:18-19, 233-257`
- **Evidence:**
  ```typescript
  function getRuntime(tool: CollaborationExecuteTool) {
    return tool === "opencode"
      ? createOpencodeRuntime(process.cwd())
      : createCursorRuntime(process.cwd());
  }
  // ...
  const runtime = getRuntime(tool);
  await runtime.initialize();
  const job = await runtime.executeJob({ ... });
  ```
  `tool`은 클라이언트 `body.tool`에서 직접 읽힘. `process.cwd()`를 working directory로 사용.
- **Impact:** 인증 없이 누구나 `POST /api/collaboration/execute`를 호출하여 서버에서 Cursor/opencode 런타임을 실행 가능. RCE(Remote Code Execution) 공격 벡터.
- **Recommendation:** (1) 인증 필수 (2) tool 화이트리스트 검증 (3) 실행 sandbox 격리 (4) rate limiting

### 🟠 HIGH

#### S-03: Approval gate 우회 가능 — approvalId 없이 pending approval 생성 후 즉시 사용
- **File:** `apps/web/src/lib/integrations/approval-gate.ts:20-48`
- **Evidence:** `ensureApprovedAction()`에서 `approvalId`가 없으면 새 pending approval을 생성하고 409를 반환하지만, 이 approval은 별도의 관리자 승인 없이 같은 요청자가 다시 approvalId를 넣어 요청하면 바로 approved 상태로 통과하는 구조 설계 문제. 승인(resolve) 엔드포인트도 인증 없이 누구나 호출 가능하므로 자기 승인이 가능함.
- **Impact:** 승인 게이트 자체가 의미 없어짐. 공격자가 본인 요청을 직접 승인 가능.
- **Recommendation:** 승인(resolve) 시 최소 requester ≠ resolver 검증, 인증 필수.

### 🟠 HIGH

#### S-04: 클라이언트에서 `resolvedBy`를 직접 지정 가능
- **File:** `apps/web/src/app/collaboration/page.tsx:129-133`
- **Evidence:**
  ```typescript
  body: JSON.stringify({
    approvalId,
    status,
    resolvedBy: 'portal-user',   // 하드코딩 but 서버에서 검증 없음
    resolution: `${status} via collaboration console`,
  }),
  ```
  클라이언트 코드에서는 `'portal-user'`로 하드코딩하지만, 서버 `/api/approvals` 엔드포인트에서 이 값을 그대로 신뢰하는지 확인 불가. 서버가 `resolvedBy`를 검증하지 않으면 임의 사용자로 위장 가능.
- **Recommendation:** 서버에서 `resolvedBy`를 세션에서 추출하도록 변경.

### 🟡 MEDIUM

#### S-05: 에러 응답에서 내부 정보 노출
- **File:** `apps/web/src/app/api/collaboration/execute/route.ts:325-332`
- **Evidence:**
  ```typescript
  details: error instanceof Error ? error.message : "Unknown error",
  ```
  `upstreamErrorResponse`에서도 동일하게 `error.message`를 그대로 반환. 파일 경로, 스택 정보 등이 포함될 수 있음.
- **Impact:** 공격자가 내부 구조 파악 가능.
- **Recommendation:** 프로덕션에서는 `details` 필드를 제거하거나 일반화된 메시지로 대체.

### 🟡 MEDIUM

#### S-06: SSRF(Server-Side Forgery) 위험 — upstream URL 검증 없음
- **File:** `apps/web/src/lib/integrations/upstream-proxy.ts:26`
- **Evidence:**
  ```typescript
  const url = `${normalizeBaseUrl(options.baseUrl)}${options.path.startsWith('/') ? options.path : `/${options.path}`}`;
  ```
  `getVibeCodingOsUrl()`는 환경변수에서 읽어오지만, 해당 값이 외부 입력(환경변수 오설정)으로 인해 내부 네트워크로 프록시될 수 있음. 추가로 `proxyUpstreamJson`의 `body`가 그대로 upstream으로 전달됨.
- **Recommendation:** upstream URL allowlist 검증, internal/private IP 차단.

---

## 2. Architecture Reviewer (설계 모순, 과도한 범위, 결합도, 확장성)

### 🟠 HIGH

#### A-01: 파일 기반 상태 저장 — 동시성 문제와 데이터 손실 위험
- **File:** `apps/web/src/lib/collaboration/server.ts:12-18`
- **Evidence:**
  ```typescript
  const sessionStore = new CollaborationSessionFileStore({
    filePath: process.env.AIOS_COLLABORATION_STATE_PATH ?? join(workspaceRoot, '.aios', 'context', 'collaboration-state.json'),
  });
  const approvalStore = new ApprovalFileStore({
    filePath: process.env.AIOS_APPROVAL_QUEUE_PATH ?? join(workspaceRoot, '.aios', 'context', 'approval-queue.json'),
  });
  ```
  파일 기반 스토어를 사용하며, 여러 요청이 동시에 읽기/쓰기 시 race condition 발생 가능. Next.js의 서버리스 환경에서는 파일 시스템이 임시적이어서 데이터 영속성 보장 불가.
- **Impact:** 동시 요청 시 데이터 손실 또는 불일치 상태. 서버 재시작 시 상태 소멸.
- **Recommendation:** 데이터베이스 기반 스토어로 마이그레이션 또는 파일 잠금(locking) 메커니즘 도입.

### 🟠 HIGH

#### A-02: 전역 싱글턴 서비스 인스턴스 — 멀티테넌트 불가
- **File:** `apps/web/src/lib/collaboration/server.ts:10-31`
- **Evidence:** `sessionStore`, `approvalStore`, `evidenceWriter`, `coordinator`가 모듈 레벨에서 한 번만 생성되어 모든 요청에서 공유됨. 사용자/세션 격리 없음.
- **Impact:** 모든 사용자가 동일한 collaboration state를 공유. 멀티테넌트 환경에서 데이터 누출.
- **Recommendation:** 요청 단위 또는 사용자 단위 서비스 인스턴스화.

### 🟡 MEDIUM

#### A-03: `execute/route.ts`의 자동 handoff 로직 — 과도한 자동화
- **File:** `apps/web/src/app/api/collaboration/execute/route.ts:289-309`
- **Evidence:**
  ```typescript
  if (job.status === "completed" && tool === "cursor") {
    await coordinator.addHandoff(sessionId, { ... });
    await coordinator.addAssignment(sessionId, {
      title: `${taskTitle} follow-up implementation`,
      assignedTo: "opencode",
      ...
    });
  }
  ```
  Cursor 실행 성공 시 자동으로 opencode follow-up assignment를 생성. 이 로직은 API 레이어에 하드코딩되어 있으며, 설정으로 제어 불가.
- **Impact:** 예상치 못한 자동 작업 생성. 대규모 작업에서 cascade effect 발생 가능.
- **Recommendation:** handoff 정책을 설정 파일이나 세션 설정으로 분리.

### 🟡 MEDIUM

#### A-04: resume 라우트의 얇은 wrapper — 중복 및 확장성 한계
- **File:** `apps/web/src/app/api/collaboration/assignments/[assignmentId]/resume/route.ts`
- **Evidence:** `resume/route.ts`는 20줄짜리 wrapper로, `execute/route.ts`의 `POST`를 직접 import하여 재호출. URL 경로에서 `assignmentId`를 추출하여 body에 주입하는 역할만 함.
- **Impact:** 두 엔드포인트의 컨트롤 플로우가 동일 파일에서 처리되어 향후 resume 전용 로직 추가 시 execute 로직과 충돌 가능.
- **Recommendation:** resume 전용 서비스 메서드를 분리하거나, 미들웨어 패턴으로 URL 파라미터를 body에 주입.

### 🟢 LOW

#### A-05: `upstream-urls.ts`의 미사용 함수
- **File:** `apps/web/src/lib/integrations/upstream-urls.ts:7-13`
- **Evidence:** `getAiosV1Url()`, `getFaiosV3Url()`, `getSangforMcpUrl()` 함수가 정의되어 있지만 현재 리뷰 대상 코드에서 사용되지 않음.
- **Impact:** 코드 베이스 팽창, 유지보수 비용 증가.
- **Recommendation:** 미사용 함수 정리 또는 사용처 문서화.

---

## 3. Quality Reviewer (테스트 부족, 코드 품질, 타입 안전성, 회귀 위험)

### 🔴 CRITICAL

#### Q-01: 테스트 완전 부재
- **File:** All 7 source files
- **Evidence:** `apps/web/src/app/api/vibe-coding/` 및 `apps/web/src/app/api/collaboration/` 디렉토리에서 `*test*` 패턴 검색 결과 0건. 유닛 테스트, 통합 테스트, E2E 테스트 모두 없음.
- **Impact:** approval gate 로직, execute 플로우, resume 로직 등 복잡한 비즈니스 로직에 대한 회귀 방어 없음. 리팩토링 시 동작 보장 불가.
- **Recommendation:** 최소 (1) approval gate 유닛 테스트 (2) execute endpoint 통합 테스트 (3) resume flow E2E 테스트 필요.

### 🟠 HIGH

#### Q-02: 타입 안전성 취약 — `as never`, `as string` 남용
- **File:** `apps/web/src/app/api/collaboration/sessions/route.ts:10`
- **Evidence:**
  ```typescript
  const sessions = await coordinator.listSessions(status as never);
  ```
  `as never`로 타입 캐스팅하여 TypeScript 검증을 완전히 우회.

- **File:** `apps/web/src/app/api/collaboration/execute/route.ts:102-111`
- **Evidence:**
  ```typescript
  const sessionId = body.sessionId as string;
  const tool = (body.body.tool ?? "opencode") as CollaborationExecuteTool;
  ```
  런타임 검증 없이 `as string`으로 타입 단언. 잘못된 입력 타입이 하위 로직에 전파됨.
- **Impact:** 타입 오류가 런타임까지 도달하여 예외 발생 또는 잘못된 동작 유발.
- **Recommendation:** Zod 또는 io-ts로 런타임 input validation 도입.

### 🟡 MEDIUM

#### Q-03: 클라이언트에서 `fetch` 응답 상태 확인 없음
- **File:** `apps/web/src/app/collaboration/page.tsx:61-71, 88-101, 105-122, 124-138, 140-155`
- **Evidence:**
  ```typescript
  const sessionsRes = await fetch('/api/collaboration/sessions', { cache: 'no-store' });
  const sessionsData = await sessionsRes.json();
  setSessions(sessionsData.sessions ?? []);
  ```
  모든 `fetch` 호출에서 `response.ok` 또는 `response.status` 확인 없이 바로 `.json()` 호출. API 오류 시 UI에 에러 표시 없이 조용히 실패.
- **Impact:** 사용자가 오류 상태를 인지하지 못함. 데이터가 비어있을 때 "세션이 없습니다"만 표시.
- **Recommendation:** HTTP 상태 코드 확인 + 에러 토스트/UI 표시.

### 🟡 MEDIUM

#### Q-04: `requestApproval()`에서 항상 첫 번째 assignment만 선택
- **File:** `apps/web/src/app/collaboration/page.tsx:106`
- **Evidence:**
  ```typescript
  if (!selectedSession || !selectedSession.assignments[0]) return
  // ...
  assignmentId: selectedSession.assignments[0].id,
  ```
  여러 assignment가 있는 세션에서 항상 첫 번째 assignment에 대해서만 approval을 요청.
- **Impact:** 다른 assignment에 대한 approval 요청이 불가능.
- **Recommendation:** 사용자가 assignment를 선택할 수 있도록 UI 추가.

### 🟢 LOW

#### Q-05: `useEffect` 의존성 배열 누락 경고
- **File:** `apps/web/src/app/collaboration/page.tsx:74-78`
- **Evidence:**
  ```typescript
  useEffect(() => {
    void loadData()
    const sessionTimer = window.setInterval(() => void loadData(), 5000)
    return () => window.clearInterval(sessionTimer)
  }, [])
  ```
  빈 의존성 배열 사용. `loadData` 함수가 컴포넌트 렌더링마다 재생성되므로 의존성에 포함해야 하나, `useCallback` 미사용.
- **Impact:** 현재는 동작하지만 strict mode에서 경고 발생 가능.
- **Recommendation:** `loadData`를 `useCallback`으로 감싸기.

---

## 4. Operations Reviewer (운영 리스크, 롤백 가능성, 모니터링, 장애점)

### 🔴 CRITICAL

#### O-01: 싱글턴 런타임 인스턴스 — 서버리스 환경 부적합
- **File:** `apps/web/src/lib/collaboration/server.ts:10-22`
- **Evidence:** 파일 기반 스토어가 모듈 레벨에서 초기화됨. Next.js 서버리스 환경(Edge Runtime, Vercel, AWS Lambda)에서는 컨테이너가 요청 간 재사용되지 않아 파일 상태가 영속되지 않음. 또한 컨테이너 재시작 시 미처 플러시되지 않은 데이터 손실.
- **Impact:** 프로덕션 배포 시 collaboration state가 유실. approval queue가 리셋되어 승인된 작업이 pending으로 복귀.
- **Recommendation:** 데이터베이스(PostgreSQL/Redis) 기반 스토어로 전환 필수.

### 🟠 HIGH

#### O-02: 모니터링/알림 부재
- **File:** All API routes
- **Evidence:** 모든 에러 핸들링이 `console.error()`만 사용. 메트릭, 트레이싱, 알림 훅 없음. `approval-middleware.ts`에 idempotency cache가 있지만 메트릭 없음.
- **Impact:** 장애 발생 시 원인 파악 어려움. 승인 큐 백로그, 실행 실패율 등을 추적 불가.
- **Recommendation:** (1) structured logging 도입 (2) 에러율/실행시간 메트릭 (3) approval queue depth 알림.

### 🟠 HIGH

#### O-03: execute 엔드포인트의 긴 동기 실행 — 타임아웃 위험
- **File:** `apps/web/src/app/api/collaboration/execute/route.ts:233-257`
- **Evidence:**
  ```typescript
  const runtime = getRuntime(tool);
  await runtime.initialize();
  assignment = await coordinator.updateAssignment(...);
  const job = await runtime.executeJob(...);
  await runtime.shutdown();
  ```
  런타임 초기화 → 실행 → 종료까지 전 과정이 단일 HTTP 요청에서 동기적으로 처리. 서버리스 환경의 실행 시간 제한(예: Vercel 10초, Lambda 30초)을 초과할 위험.
- **Impact:** 타임아웃 시 assignment 상태가 "running"에 머물며 orphan 상태가 됨. 후속 실행이 블로킹됨.
- **Recommendation:** 비동기 작업 큐 패턴으로 전환. 즉시 202 반환 + polling/callback.

### 🟡 MEDIUM

#### O-04: 롤백 메커니즘 부재
- **File:** `apps/web/src/app/api/collaboration/execute/route.ts`
- **Evidence:** execute 플로우에서 assignment 생성 → 런타임 실행 → 상태 업데이트가 트랜잭션 없이 순차 실행. 중간 실패 시 assignment가 "running" 상태로 남을 수 있음.
- **Impact:** 실패한 작업의 수동 복구 필요. retryAssignment()가 있지만 "running" 상태 assignment는 재시도 불가.
- **Recommendation:** (1) 트랜잭션 또는 보상 패턴 (2) "running" 상태 타임아웃 → "failed" 자동 전환.

### 🟡 MEDIUM

#### O-05: 5초 폴링 간격 — 서버 부하
- **File:** `apps/web/src/app/collaboration/page.tsx:76`
- **Evidence:**
  ```typescript
  const sessionTimer = window.setInterval(() => void loadData(), 5000)
  ```
  모든 탭/브라우저에서 5초마다 2개 API 호출. 여러 사용자가 동시 접속 시 서버 부하 급증.
- **Impact:** N명의 사용자 = 2N개 요청/5초. 파일 기반 스토어 사용 시 I/O 병목.
- **Recommendation:** WebSocket/SSE로 변경하거나, 폴링 간격을 늘리고 탭 포커스 시에만 활성화.

---

## 5. Requirements Reviewer (요구사항 누락, 제외 범위 침범, 비즈니스 로직 검증)

### 🟠 HIGH

#### R-01: VibeCodingOS API — 인증/권한 요구사항 누락
- **File:** `apps/web/src/app/api/vibe-coding/projects/route.ts`, `rag/ingest/route.ts`
- **Evidence:** `rag/ingest`는 approval gate가 있지만 `projects` GET은 아무런 게이트 없이 모든 프로젝트 목록을 노출. `health` 엔드포인트도 인증 없이 접근 가능.
- **Impact:** 프로젝트 목록이 비인가 사용자에게 노출. 조직의 프로젝트 구조 정보 유출.
- **Recommendation:** 최소한 인증된 사용자만 접근 가능하도록 게이트 추가.

### 🟠 HIGH

#### R-02: `/api/approvals` 엔드포인트 미구현 또는 미확인
- **File:** `apps/web/src/app/collaboration/page.tsx:63, 108`
- **Evidence:**
  ```typescript
  fetch('/api/approvals', { cache: 'no-store' })  // GET
  fetch('/api/approvals', { method: 'POST', ... }) // POST
  ```
  클라이언트가 `/api/approvals`를 호출하지만, `apps/web/src/app/api/` 디렉토리에서 `approvals` 관련 파일 검색 결과 없음.
- **Impact:** 클라이언트 UI의 approval 기능이 완전히 동작하지 않음. 승인 큐 표시, 승인/반려 처리 모두 실패.
- **Recommendation:** `/api/approvals` 라우트 구현 또는 기존 `approvalStore`와 연결.

### 🟡 MEDIUM

#### R-03: Collaboration Session 생명주기 관리 부재
- **File:** `apps/web/src/app/api/collaboration/sessions/route.ts`
- **Evidence:** `GET` (목록)과 `POST` (생성)만 존재. 세션 종료, 삭제, 상태 변경 API 없음.
- **Impact:** 완료된 세션을 정리할 수 없음. 세션이 무한히 누적됨.
- **Recommendation:** PATCH (상태 변경), DELETE 엔드포인트 추가.

### 🟡 MEDIUM

#### R-04: Collaboration UI의 접근성(a11y) 부족
- **File:** `apps/web/src/app/collaboration/page.tsx`
- **Evidence:** 버튼에 `aria-label` 없음, 키보드 내비게이션 미고려, 로딩 상태 시 스크린 리더 알림 없음. 컬러 대비(rose-500, emerald-600 등) WCAG 기준 충족 여부 미확인.
- **Impact:** 접근성 요구사항 미충족 시 법적 리스크 및 사용성 저하.
- **Recommendation:** WCAG 2.1 AA 기준 접근성 검토 및 보완.

### 🟢 LOW

#### R-05: 다국어(i18n) 혼용 — 한국어/영어 에러 메시지 혼재
- **File:** Multiple files
- **Evidence:**
  - `sessions/route.ts:17`: `"협업 세션 목록을 가져올 수 없습니다."` (한국어)
  - `sessions/route.ts:11`: `error: "sessionId is required"` (영어)
  - `execute/route.ts:117`: `error: "sessionId is required"` (영어)
  - `execute/route.ts:328`: `error: "협업 실행에 실패했습니다."` (한국어)
- **Impact:** 사용자 경험 비일관성.
- **Recommendation:** 통일된 언어 또는 i18n 프레임워크 도입.

---

## Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| 🔴 Critical | 5 | 인증 부재, RCE 벡터, 테스트 부재, 서버리스 부적합 |
| 🟠 High | 7 | 동시성, 승인 우회, 파일 스토어, 모니터링 부재, 미구현 엔드포인트 |
| 🟡 Medium | 7 | 에러 처리, 타입 안전성, 폴링 부하, 롤백, 자동화 과잉 |
| 🟢 Low | 3 | 미사용 코드, 의존성 경고, i18n 혼용 |
| **Total** | **22** | |

### Top 5 Action Items (Priority Order)

1. **인증/인가 계층 도입** — 모든 API 엔드포인트에 인증 필수. 특히 `execute` 엔드포인트의 RCE 위험 즉시 완화.
2. **파일 기반 스토어 → DB 마이그레이션** — 동시성, 영속성, 서버리스 호환성 해결.
3. **`/api/approvals` 엔드포인트 구현** — Collaboration UI 핵심 기능이 비활성 상태.
4. **테스트 스위트 작성** — approval gate, execute 플로우, resume 로직에 대한 최소 테스트 커버리지 확보.
5. **비동기 실행 패턴 전환** — execute 엔드포인트를 작업 큐 기반으로 변경하여 타임아웃 및 orphan 상태 방지.
