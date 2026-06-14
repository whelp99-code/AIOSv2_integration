# Phase A-1 Red Team Review: AIOS v1 핵심 API

**검토 일시:** 2026-06-14
**검토 대상:** AIOS v1 연동 API 레이어 (4개 라우트 + 서비스 레이어 + 스키마 + 테스트)

---

## 1. Security Reviewer

### 🔴 Critical

#### S-C1: GET 엔드포인트 인증/인가 완전 부재
- **파일:** `apps/web/src/app/api/analyze/route.ts:36-46`, `plan/route.ts:36-46`, `risk/risk/route.ts:36-46`
- **Evidence:** GET 핸들러는 `createGatedHandler` 없이 직접 export되어 있다. `projectId`만으로 누구든 분석 결과, 계획, 리스크 평가를 조회할 수 있다.
  ```ts
  // analyze/route.ts
  export async function GET(request: Request) {
    const projectId = searchParams.get('projectId');
    const service = getAnalysisService();
    return service.getResults(projectId); // 인증 없음
  }
  ```
- **영향:** 데이터 노출. 인증되지 않은 사용자가 임의 projectId로 결과를 조회할 수 있다.
- **권장 조치:** GET 핸들러에도 `createGatedHandler` 적용 또는 최소한 세션 인증 미들웨어 추가.

#### S-C2: `requestedBy` 기본값 하드코딩 — 사용자 위장 가능
- **파일:** `apps/web/src/lib/integrations/approval-middleware.ts:155, 277`
- **Evidence:** `x-requested-by` 헤더가 없으면 `"api-client"`로 기본 설정됨. 공격자가 헤더를 조작하여 다른 사용자로 위장 가능.
  ```ts
  const requestedBy = req.headers.get("x-requested-by") || "api-client";
  ```
- **영향:** 감사 로그 위조, 다른 사용자의 승인 컨텍스트 오염.
- **권장 조치:** 서버사이드 세션에서 사용자 ID를 추출하도록 변경. 클라이언트 제공 헤더 신뢰 금지.

### 🟠 High

#### S-H1: 개발 모드 승인 게이트 완전 우회 (`NODE_ENV` 의존)
- **파일:** `apps/web/src/lib/integrations/approval-middleware.ts:223`
- **Evidence:** `createGatedHandler`은 `NODE_ENV !== "production"`일 때 모든 승인 검증을 건너뛴다.
  ```ts
  if (process.env.NODE_ENV !== "production") {
    // approvalId 검증 없이 바로 핸들러 실행
    const mockApprovalContext = { approvalId: "dev-bypass", ... };
    return handler(...);
  }
  ```
- **영향:** `NODE_ENV`가 `"production"`으로 설정되지 않은 환경(스테이징 등)에서 승인 게이트가 무력화됨.
- **권장 조치:** `NODE_ENV` 대신 별도의 명시적 플래그(`APPROVAL_GATE_ENABLED`) 사용. 스테이징 환경에서 `NODE_ENV` 설정 검증 추가.

#### S-H2: `CommandExecuteRequestSchema.params`가 `z.record(z.string(), z.unknown())` — 임의 파라미터 허용
- **파일:** `apps/web/src/lib/schemas/aios-v1.schema.ts:101`
- **Evidence:** `params` 필드가 `z.record(z.string(), z.unknown())`로 정의되어 어떤 키-값이든 허용됨. `command-registry.ts:85`에서 이를 핸들러에 그대로 전달.
  ```ts
  params: z.record(z.string(), z.unknown()).optional(),
  // ...
  const result = await entry.handler(body.params ?? {});
  ```
- **영향:** 등록된 커스텀 핸들러에 악의적 파라미터 주입 가능 (예: prototype pollution 키 `__proto__`, `constructor`).
- **권장 조치:** 각 명령어별 params 스키마를 분리하고, 명령어 실행 전 검증하도록 변경.

#### S-H3: 에러 메시지에 내부 정보 노출
- **파일:** `apps/web/src/lib/services/command-registry.ts:96`, `apps/web/src/lib/integrations/approval-middleware.ts:21`
- **Evidence:** 핸들러 에러 시 `err.message`가 클라이언트에 그대로 반환됨. Zod 에러 `.flatten()`도 details로 노출.
  ```ts
  error: err instanceof Error ? err.message : String(err)
  // ...
  { error: '요청 데이터 검증 실패', details: parsed.error.flatten() }
  ```
- **영향:** 내부 스택 트레이스, 파일 경로 등 민감 정보 유출 가능.
- **권장 조치:** 프로덕션에서는 일반화된 에러 메시지 반환. 상세 에러는 서버 로그에만 기록.

#### S-H4: `aiosV1Url`이 응답에 직접 노출
- **파일:** `apps/web/src/lib/services/analysis-service.ts:56`, `planning-service.ts:63`, `risk-service.ts:62`
- **Evidence:** fallback 응답에 내부 업스트림 URL이 포함됨.
  ```ts
  results: { aiosV1Url: getAiosV1Url() }
  ```
- **영향:** 내부 네트워크 토폴로지 정보 유출. SSRF 공격에 활용 가능.
- **권장 조치:** 프로덕션 응답에서 `aiosV1Url` 제거. 관리자 전용 API로 분리.

### 🟡 Medium

#### S-M1: GET 파라미터 `projectId` 미검증
- **파일:** `apps/web/src/app/api/analyze/route.ts:38`, `plan/route.ts:38`, `risk/route.ts:38`
- **Evidence:** GET 핸들러에서 `searchParams.get('projectId')`를 null 체크만 하고 Zod 검증 없이 서비스에 전달.
- **권장 조치:** GET 파라미터에도 `ProjectIdSchema.safeParse()` 적용.

#### S-M2: 인메모리 멱등성 캐시 — 서버리스 환경에서 보장 불가
- **파일:** `apps/web/src/lib/services/aios-v1-action-service.ts:24`, `approval-middleware.ts:16`
- **Evidence:** `Map` 기반 인메모리 캐시. 서버리스 환경에서는 컨테이너 간, 인스턴스 간 캐시 공유 불가.
- **권장 조치:** Redis 등 외부 캐시 사용 또는 서버리스 환경에서 멱등성 보장 전략 재설계.

---

## 2. Architecture Reviewer

### 🟠 High

#### A-H1: 이중 멱등성 캐시 — 중복 및 불일치 위험
- **파일:** `apps/web/src/lib/integrations/approval-middleware.ts:293-298` + `apps/web/src/lib/services/aios-v1-action-service.ts:64-69`
- **Evidence:** `createGatedHandler`과 `AiosV1ActionService.execute()` 모두 각각 인메모리 멱등성 캐시를 운영. 두 캐시의 TTL, maxSize, 키 생성 로직이 다름.
  - 미들웨어: maxSize=500, 키=`userId:sessionId:resourceId:key`
  - 액션서비스: maxSize=1000, 키=`userId:sessionId:resourceId:path:key`
- **영향:** 같은 요청이 두 캐시에 각각 저장되어 메모리 낭비. 캐시 불일치 시 동일 요청에 다른 응답 반환 가능.
- **권장 조치:** 멱등성 캐시를 한 곳(미들웨어 또는 서비스)에서만 관리. 또는 외부 캐시로 통합.

#### A-H2: `NEXT_PUBLIC_` 접두사 feature flag — 빌드 타임 상수
- **파일:** `apps/web/src/lib/services/feature-flag.ts:1`
- **Evidence:** `NEXT_PUBLIC_AIOS_V1_REAL_LOGIC`는 Next.js 빌드 시점에 번들에 포함되는 클라이언트 노출 변수. 서버사이드에서 런타임 변경 불가.
  ```ts
  const FLAG_KEY = 'NEXT_PUBLIC_AIOS_V1_REAL_LOGIC';
  ```
- **영향:** 빌드 없이 feature flag를 변경할 수 없어, 런타임 전환(예: 장애 시 fallback 전환)이 불가능.
- **권장 조치:** 서버사이드 전용 환경 변수(`AIOS_V1_REAL_LOGIC`)로 변경. 또는 feature flag 서비스 도입.

### 🟡 Medium

#### A-M1: 싱글턴 서비스 — 서버리스 상태 누출
- **파일:** `aios-v1-action-service.ts:98-103`, `command-registry.ts:110-114`, `analysis-service.ts:6-13`, `planning-service.ts:70-75`, `risk-service.ts:69-76`
- **Evidence:** 모든 서비스가 모듈 레벨 `_instance` 변수로 싱글턴 관리. `resetXxx()` 함수가 export되어 있지만 테스트 외에 호출되지 않음.
- **영향:** 서버리스 환경에서 컨테이너 재사용 시 이전 요청의 상태(캐시, 등록된 명령어 등)가 남을 수 있음.
- **권장 조치:** 요청 스코프 DI 패턴 도입 또는 싱글턴의 상태 불변성 보장.

#### A-M2: `CommandRegistry`의 `register()`에 접근 제어 없음
- **파일:** `apps/web/src/lib/services/command-registry.ts:36-38`
- **Evidence:** `register()` 메서드가 public. 런타임에 임의 명령어를 등록/덮어쓰기 가능.
  ```ts
  register(entry: CommandEntry): void {
    this.commands.set(entry.id, entry);
  }
  ```
- **영향:** 빌트인 명령어(`analyze`, `plan` 등)가 런타임에 오버라이드될 수 있음. 보안상 위험한 명령어 등록 가능.
- **권장 조치:** `register()`에 권한 검증 추가. 또는 `register`를 `protected`로 변경하고 초기화 시에만 등록 허용.

#### A-M3: `CUSTOMER_SAFE_OMIT` / `PARTNER_SAFE_OMIT` — `omit` vs `select` 불일치
- **파일:** `apps/web/src/lib/schemas/aios-v1.schema.ts:163-169`
- **Evidence:** `PROJECT_SAFE_SELECT`, `USER_SAFE_SELECT` 등은 `select` 방식(허용 목록)인데, `CUSTOMER_SAFE_OMIT`과 `PARTNER_SAFE_OMIT`은 `omit` 방식(차단 목록). 두 패턴이 혼용됨.
  ```ts
  export const CUSTOMER_SAFE_OMIT = { userId: true } as const;
  ```
- **영향:** `omit`은 새 필드 추가 시 자동으로 노출됨(기본값 허용). `select`와 혼용 시 보안 의도가 불명확.
- **권장 조치:** 일관되게 `select`(허용 목록) 패턴으로 통일.

#### A-M4: 서비스 간 중복 구조 (AnalysisService / PlanningService / RiskService)
- **파일:** `analysis-service.ts`, `planning-service.ts`, `risk-service.ts`
- **Evidence:** 세 서비스의 구조가 거의 동일 (actionService.execute → fallback → schema.parse). 차이는 path, schema, fallback 데이터뿐.
- **권장 조치:** 제네릭 서비스 팩토리 패턴으로 중복 제거.

### 🟢 Low

#### A-L1: `command-registry 2.ts` — 불필요한 파일 존재
- **파일:** `apps/web/src/lib/services/command-registry 2.ts`
- **Evidence:** `command-registry.ts`의 복사본이 이름에 공백 포함하여 존재.
- **권장 조치:** 삭제.

---

## 3. Quality Reviewer

### 🟠 High

#### Q-H1: GET 엔드포인트 통합 테스트 부재
- **파일:** `tests/integration/aios-v1-routes.test.ts`
- **Evidence:** 통합 테스트 파일이 존재하지만, GET 엔드포인트에 대한 테스트가 없는 것으로 보임 (라우트 파일에 GET이 있는데 테스트가 schema/action-service 단위에 집중).
- **영향:** GET 핸들러의 projectId 파싱, 서비스 호출, 에러 핸들링이 테스트되지 않음.
- **권장 조치:** GET /api/analyze, /api/plan, /api/risk에 대한 통합 테스트 추가.

#### Q-H2: `AnalyzeResponseSchema.not_found` status — enum 불일치
- **파일:** `apps/web/src/lib/services/analysis-service.ts:43` vs `apps/web/src/lib/schemas/aios-v1.schema.ts:27`
- **Evidence:** `getResults()` fallback이 `status: 'not_found'`를 반환하지만, `AnalyzeResponseSchema`의 status enum은 `['completed', 'failed', 'in-progress']`만 허용. 스키마 검증 없이 응답 반환.
  ```ts
  // analysis-service.ts
  fallback: () => NextResponse.json({ status: 'not_found', ... })
  // aios-v1.schema.ts
  status: z.enum(['completed', 'failed', 'in-progress'])
  ```
- **영향:** `getResults()` 응답이 스키마를 위반. 프론트엔드에서 스키마 기반 검증 시 실패.
- **권장 조치:** `not_found`를 status enum에 추가하거나, 별도 에러 응답 스키마 정의.

### 🟡 Medium

#### Q-M1: 서비스 레이어 이중 Zod 검증
- **파일:** `analyze/route.ts:18-23` + `analysis-service.ts:27`
- **Evidence:** 라우트에서 `AnalyzeRequestSchema.safeParse(body)` 수행 후, 서비스의 `actionService.execute()`에서 동일 스키마로 다시 검증.
- **영향:** 성능 소모는 미미하지만, 코드 의도가 불명확. 검증 실패 시 어느 레이어에서 발생했는지 추적 어려움.
- **권장 조치:** 검증을 한 곳(라우트 또는 서비스)에서만 수행하도록 일원화.

#### Q-M2: `buildFallback`의 `AnalyzeResponseSchema.parse()` — 검증 실패 시 unhandled throw
- **파일:** `analysis-service.ts:59`, `planning-service.ts:65`, `risk-service.ts:64`
- **Evidence:** `.parse()`는 실패 시 예외를 던지지만, fallback 함수 내에서 try-catch 없이 사용.
  ```ts
  const validated = AnalyzeResponseSchema.parse(response);
  ```
- **영향:** fallback 데이터가 스키마를 위반하면 500 에러. 장애 시 fallback이 동작하지 않는 역설적 상황.
- **권장 조치:** `.safeParse()` 사용 후 실패 시 기본 에러 응답 반환.

#### Q-M3: `CommandExecuteRequestSchema`의 command 값에 화이트리스트 없음
- **파일:** `apps/web/src/lib/schemas/aios-v1.schema.ts:99-101`
- **Evidence:** `command` 필드가 `z.string().min(1)`만 검증. 빌트인 ID(`analyze`, `plan`, `risk`, `customers`, `partners`, `workflows`) 외 임의 문자열 허용.
- **영향:** 존재하지 않는 명령어에 대해 404를 반환하지만, 향후 명령어 등록 시 예상치 못한 명령어 실행 가능.
- **권장 조치:** 허용된 command 목록 enum 정의 또는 CommandRegistry에서 등록된 명령어만 허용.

#### Q-M4: `next()` 호출이 없는 `requestWithJsonBody` — 원본 request body 소비 후 재사용 문제
- **파일:** `approval-middleware.ts:61-77`
- **Evidence:** `request.json()`를 미들웨어에서 먼저 읽고, `requestWithJsonBody()`로 새 Request를 생성하여 핸들러에 전달. 이 패턴은 동작하지만, 원본 request의 스트림이 소비됨.
- **영향:** 미들웨어 체인이 길어질 경우 추가 미들웨어에서 body 재읽기 불가.
- **권장 조치:** Next.js의 `middleware.ts` 패턴 또는 body 캐싱 유틸리티 사용.

### 🟢 Low

#### Q-L1: `analysis-service.ts` getAnalysisService에 `resetAnalysisService` export 누락 확인 필요
- **파일:** `analysis-service.ts:15-17`
- **Evidence:** `resetAnalysisService()`가 존재하지만, `getRiskService()`와 달리 `_instance` 변수명이 `analysisServiceInstance`으로 불일치.
- **권장 조치:** 일관된 네이밍 컨벤션 적용.

---

## 4. Operations Reviewer

### 🟠 High

#### O-H1: 인메모리 캐시 2중 — 서버리스 롤백 시 상태 불일치
- **파일:** `aios-v1-action-service.ts:24`, `approval-middleware.ts:16`
- **Evidence:** 두 곳의 인메모리 캐시가 서버리스 환경에서 컨테이너 간 공유 불가. 롤백 시 이전 버전의 캐시가 남아있어 불일치 가능.
- **권장 조치:** 외부 캐시(Redis) 사용 또는 서버리스 무상태 설계.

#### O-H2: 장애 시 fallback 전략 — 항상 성공 응답 반환
- **파일:** `aios-v1-action-service.ts:91-93`, `analysis-service.ts:48-61`
- **Evidence:** 업스트림 실패 시 fallback이 항상 `status: 'completed'`로 응답. 클라이언트가 실패를 인지하지 못함.
  ```ts
  } catch {
    return await fallback(); // fallback은 항상 "completed" 반환
  }
  ```
- **영향:** 업스트림 장애 시에도 사용자는 성공으로 인식. 잘못된 의사결정 유발.
- **권장 조치:** fallback 응답에 `status: 'degraded'` 또는 `warning` 필드 추가. 또는 적절한 HTTP 상태 코드(503) 반환.

#### O-H3: 모니터링/메트릭 부재
- **파일:** 전체 서비스 레이어
- **Evidence:** 업스트림 호출 성공/실패, fallback 사용률, 응답 시간 등의 메트릭 수집 코드가 없음. `console.error`만 존재(`upstream-proxy.ts:56`).
- **영향:** 장애 감지 불가, 성능 병목 파악 불가.
- **권장 조치:** 구조화된 로깅 + 메트릭 카운터(업스트림 성공/실패, fallback 호출, 멱등성 히트율) 추가.

### 🟡 Medium

#### O-M1: 멱등성 캐시 maxSize 초과 시 단일 항목만 제거
- **파일:** `aios-v1-action-service.ts:44-47`, `approval-middleware.ts:40-43`
- **Evidence:** 캐시가 maxSize 초과 시 가장 오래된 항목 1개만 삭제. 고부하 시 캐시가 maxSize를 계속 초과.
  ```ts
  if (this.idempotencyCache.size > 1000) {
    const oldestKey = this.idempotencyCache.keys().next().value;
    if (oldestKey) this.idempotencyCache.delete(oldestKey);
  }
  ```
- **권장 조치:** LRU 캐시 라이브러리 사용 또는 배치 제거 로직 추가.

#### O-M2: `ensureApprovedAction` — `approvalStore.list()` 전체 조회
- **파일:** `approval-gate.ts:50-51`
- **Evidence:** 승인 확인 시 전체 승인 목록을 조회한 후 `.find()`로 검색. 데이터베이스 부하 증가.
  ```ts
  const approvals = await approvalStore.list();
  const approval = approvals.find((entry) => entry.id === input.approvalId);
  ```
- **권장 조치:** `approvalStore.getById(id)` 메서드 추가하여 인덱스 기반 조회.

#### O-M3: 업스트림 타임아웃 하드코딩 (10초)
- **파일:** `upstream-proxy.ts:33`
- **Evidence:** `AbortSignal.timeout(options.timeoutMs ?? 10_000)` — 기본 10초. API별로 다른 타임아웃이 필요할 수 있음.
- **권장 조치:** API별 타임아웃 설정 가능하도록 구성화.

### 🟢 Low

#### O-L1: `console.error`만 사용 — 구조화된 로깅 없음
- **파일:** `upstream-proxy.ts:56`
- **권장 조치:** Winston/Pino 등 구조화된 로거 도입.

---

## 5. Requirements Reviewer

### 🟠 High

#### R-H1: Phase A-1 범위에 포함된 `customers`, `partners`, `workflows` 명령어 — 라우트/API 미구현
- **파일:** `command-registry.ts:21-23`
- **Evidence:** `BUILT_IN_COMMANDS`에 `customers`, `partners`, `workflows`가 등록되어 있지만, 해당 라우트 파일(`/api/customers`, `/api/partners`, `/api/workflows`)은 Phase A-1 범위에 포함되지 않았을 수 있음. 명령어 목록에 노출되지만 실행 시 404 또는 fallback.
- **영향:** Phase A-1 범위를 벗어난 명령어가 사용자에게 노출됨.
- **권장 조치:** Phase A-1에서는 `analyze`, `plan`, `risk` 명령어만 등록하거나, 미구현 명령어에 `disabled` 플래그 추가.

#### R-H2: `plan` 명령어의 `requirements` 파라미터 미전달
- **파일:** `command-registry.ts:18` + `routes/commands/route.ts:32`
- **Evidence:** `commands/route.ts` POST에서 `executeCommand` 호출 시 `body.params`가 `PlanRequestSchema`의 `requirements` 필드로 매핑되지 않음. `command-registry`의 `executeLocal`은 단순히 핸들러에 params를 전달할 뿐, `plan` 라우트의 `requirements` 처리 로직과 연결되지 않음.
- **영향:** `/api/commands` POST로 `plan` 실행 시 requirements를 전달해도 무시됨.
- **권장 조치:** 명령어별 파라미터 매핑 정의 또는 commands 라우트에서 직접 서비스 호출로 변경.

### 🟡 Medium

#### R-M1: `command-registry`의 `executeCommand` — `actionContext` 누락 시 멱등성 보장 불가
- **파일:** `commands/route.ts:32-37`
- **Evidence:** `executeCommand` 호출 시 `ctx`를 전달하지만, `CommandRegistry.executeLocal`에서는 `ctx`를 사용하지 않음. 멱등성 키가 actionService 레벨에서만 처리됨.
- **권장 조치:** `executeLocal`에도 idempotency 체크 로직 추가.

#### R-M2: `CUSTOMER_SAFE_OMIT` / `PARTNER_SAFE_OMIT` 상수 — Phase A-1에서 미사용
- **파일:** `aios-v1.schema.ts:163-169`
- **Evidence:** Phase A-1 범위(Analyze, Plan, Risk, Commands)에서 이 상수들이 사용되지 않음. 향후 Phase에서 사용될 것으로 예상되지만, 현재는 데드 코드.
- **권장 조치:** Phase A-2 이상으로 이동 또는 주석 처리.

### 🟢 Low

#### R-L1: 한국어 에러 메시지 혼용
- **파일:** 전체
- **Evidence:** 에러 메시지가 한국어(`'요청 데이터 검증 실패'`, `'알 수 없는 명령어'`)와 영어(`'Invalid request body'`, `'Project ID required'`)가 혼용됨.
- **권장 조치:** 일관된 언어 정책 적용 또는 i18n 도입.

---

## 📊 Summary

| Severity | Security | Architecture | Quality | Operations | Requirements | 합계 |
|----------|----------|-------------|---------|------------|-------------|------|
| Critical | 2 | 0 | 0 | 0 | 0 | **2** |
| High | 4 | 2 | 2 | 3 | 2 | **13** |
| Medium | 2 | 4 | 4 | 3 | 2 | **15** |
| Low | 0 | 1 | 1 | 1 | 1 | **4** |
| **합계** | **8** | **7** | **7** | **7** | **5** | **34** |

### 🚨 Top Priority Fixes (Critical + High)

1. **S-C1**: GET 엔드포인트 인증 적용 (즉시)
2. **S-C2**: `requestedBy` 서버사이드 검증 (즉시)
3. **S-H1**: 개발 모드 승인 게이트 우회 제거/명시화 (즉시)
4. **A-H1**: 이중 멱등성 캐시 통합 (1주 내)
5. **A-H2**: feature flag 서버사이드 전용 변수로 변경 (1주 내)
6. **S-H2**: command params 화이트리스트/스키마 검증 (1주 내)
7. **Q-H2**: `not_found` status enum 불일치 수정 (1주 내)
8. **O-H2**: fallback 응답에 degraded 상태 표시 (1주 내)
9. **R-H1**: Phase 외 명령어 노출 제어 (1주 내)
10. **S-H3/S-H4**: 에러 메시지/내부 URL 노출 제거 (2주 내)

### ✅ 잘된 점

- Zod 기반 요청/응답 스키마 검증이 체계적으로 구현됨
- 계약 테스트(contract-tests)가 스키마 호환성을 보장
- `createGatedHandler` 패턴으로 승인 게이트 일관 적용 (POST)
- 싱글턴 `reset` 함수가 테스트 격리에 활용됨
- Prisma select/omit 상수로 데이터 노출 범위 명시적 관리
