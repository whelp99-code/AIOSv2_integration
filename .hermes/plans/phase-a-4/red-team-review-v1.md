# Phase A-4 Red Team Review v1 — F-aios-v3-core 패키지

> **검토일시**: 2026-06-14  
> **검토 범위**: `packages/` 디렉토리 전체 (domain, application, infrastructure, db, config, auth, shared, proxy-core, health, ui)  
> **제외**: `packages/domain/sangfor/` (Phase A-2 대상)  
> **검토 대상 소스 파일**: ~80+ TypeScript 소스 파일 (src 기준, dist 제외)

---

## 1. Security Reviewer (보안 취약점, 인증/권한, 데이터 노출 위험)

### CRITICAL

#### SEC-001: Graph OAuth 토큰 평문 메모리 저장소
- **파일**: `packages/auth/src/token-manager.ts:66,130-145`
- **Evidence**: `TokenManager` 클래스의 `store`가 `Map<ProductName, StoredToken>`이며, `storeGraphToken()`이 평문 accessToken/refreshToken을 메모리에 저장. 주석에 "암호화는 추후" 명시.
- **위험**: 프로세스 메모리 덤프, 디버거, `/proc/[pid]/mem` 등으로 토큰 탈취 가능. refreshToken이 평문으로 노출되면 공격자가 사용자 대신 Microsoft Graph API 호출 가능.
- **권장사항**: refreshToken은 AES-256-GCM 등으로 암호화 후 저장. 프로덕션에서는 Keychain/Secret Manager 연동 필수.

#### SEC-002: Approval Gate 우회 (항상 auto-approve)
- **파일**: `packages/proxy-core/src/aios-v1-adapter.ts:183-194`
- **Evidence**: `evaluateApprovalGate()` 메서드가 `console.warn`만 남기고 항상 `{ approved: true }` 반환. 주석에 "현재는 경고 로그만 남기고 허용 (개발 단계)" 명시.
- **위험**: 프로덕션 환경에서 이 코드가 그대로 배포되면, DELETE/PUT 등 destructive operation에 대한 승인 게이트가 완전히 무력화됨. data-mutation, deploy, config-change, external-share 등 모든 게이트 타입이 우회됨.
- **권장사항**: 프로덕션 배포 전에 반드시 `IApprovalGate.evaluate()` 연동 구현 또는 환경별 분기 필요.

### HIGH

#### SEC-003: NEXTAUTH_SECRET 길이 검증 부족
- **파일**: `packages/config/src/schema.ts:30`
- **Evidence**: `NEXTAUTH_SECRET: z.string().min(32)` — 32자 minimum이지만 HMAC-SHA256 키로 사용 (token-manager.ts:86-90). 32바이트 ASCII 문자열은 충분하지만, 유니코드 문자 등으로 32자이나 엔트로피가 낮을 수 있음.
- **권장사항**: 엔트로피 검증 또는 최소 64자 권장.

#### SEC-004: ProcessSandbox 명령어 인젝션 위험
- **파일**: `packages/infrastructure/sandbox/src/process-sandbox.ts:29`
- **Evidence**: `const fullCommand = [command, ...args].map((a) => JSON.stringify(a)).join(' ');` — `execAsync(fullCommand)`으로 셸 문자열 실행. JSON.stringify는 따옴표 이스케이프를 하지만 셸 특수문자(`$`, `` ` `` 등)에 대한 완전한 이스케이프가 아님.
- **위험**: command나 args에 셸 특수문자가 포함되면 명령어 인젝션 가능.
- **권장사항**: `execFile` 사용 또는 `spawn`으로 변경하여 셸 해석 방지.

#### SEC-005: DockerSandbox writeFile 셸 인젝션
- **파일**: `packages/infrastructure/sandbox/src/docker-sandbox.ts:111-113`
- **Evidence**: `sh -c \`echo '${encoded}' | base64 -d > ${filePath}\`` — filePath가 사용자 제어 가능하면 셸 인젝션 가능 (예: `; rm -rf /`).
- **권장사항**: filePath를 whitelist 검증하거나, docker cp API 사용.

#### SEC-006: LLM API 키 환경변수 평문 노출
- **파일**: `packages/infrastructure/llm/src/openai.ts:27`, `packages/infrastructure/llm/src/anthropic.ts:27`
- **Evidence**: `apiKey: config.apiKey || process.env.OPENAI_API_KEY` — API 키가 환경변수에서 직접 읽혀지고, config 객체로 전달 가능.
- **위험**: config 객체가 직렬화되어 로그에 노출될 수 있음.
- **권장사항**: API 키를 config 객체에 직접 넣지 말고, 키 매니저에서만 가져오도록 제한.

### MEDIUM

#### SEC-007: getConfig() 캐시된 설정 반환 시 마스킹 없음
- **파일**: `packages/config/src/schema.ts:91-112`
- **Evidence**: `getConfig()`가 `cachedConfig`를 반환하는데, 이 객체에 모든 시크릿( DATABASE_URL, NEXTAUTH_SECRET 등)이 평문으로 포함됨.
- **위험**: 실수로 `getConfig()` 결과를 로그에 출력하면 시크릿 노출.
- **권장사항**: 반환 타입을 `Readonly`로 만들고, `console.log` 시 자동 마스킹 적용 고려.

#### SEC-008: ApprovalFileStore 기본 승인 항목에 하드코딩된 세션 ID
- **파일**: `packages/infrastructure/src/collaboration/approval-file-store.ts:124-152`
- **Evidence**: `createDefaultApprovalState()`이 하드코딩된 `sessionId: "cursor-opencode-main-session"`, `resolvedBy: "admin"` 등으로 사전 정의된 승인 항목을 생성.
- **위험**: 프로덕션에서 이 기본 데이터가 실제 승인 이력으로 오인될 수 있음.
- **권장사항**: 프로덕션 환경에서는 빈 상태로 시작하도록 분리.

### LOW

#### SEC-009: Langfuse 인증 정보 Base64 평문 전송
- **파일**: `packages/infrastructure/monitoring/src/langfuse.ts:258`
- **Evidence**: `Basic ${Buffer.from(\`\${this.publicKey}:\${this.secretKey}\`).toString('base64')}` — Base64는 암호화가 아님.
- **참고**: HTTPS 사용 시 전송 계층 보호되므로 LOW.

---

## 2. Architecture Reviewer (설계 모순, 과도한 범위, 결합도, 확장성)

### HIGH

#### ARCH-001: Application 레이어 스텁 구현 (의존성 역전 위반)
- **파일**: `packages/application/src/use-cases/task-creation.ts:86-94`, `packages/application/src/use-cases/phase-progression.ts:95-134`
- **Evidence**: `validateDependencies()`가 항상 `true` 반환, `checkDuplicateTask()`가 항상 `false` 반환, `getPhaseProgress()`가 항상 0 반환, `getCurrentPhase()`가 항상 `'phase-1'` 반환.
- **위험**: Application 레이어가 Repository 인터페이스를 주입받지 않고 스텁 로직으로 구현됨. Domain-Driven Design의 핵심 원칙(Repository 추상화) 위반. 프로덕션에서 이 코드가 사용되면 의존성 검증, 중복 검사, Phase 진행이 전혀 동작하지 않음.
- **권장사항**: Repository 인터페이스를 주입받아 실제 구현체와 연결하도록 변경.

#### ARCH-002: AgentTaskDispatcher — 실제 에이전트 런타임 미연결
- **파일**: `packages/application/src/agents/task-dispatcher.ts:41-64`
- **Evidence**: `dispatchTask()`가 `AgentJob` 객체를 생성만 하고 실제 에이전트 실행을 트리거하지 않음. `checkDependencies()`와 `checkAgentAvailability()`가 항상 `true` 반환.
- **위험**: 작업 분배가 실제로 이루어지지 않음.
- **권장사항**: `CommandAgentRuntime` 또는 다른 런타임에 연결.

#### ARCH-003: PgVectorClient 완전 스텁
- **파일**: `packages/infrastructure/rag/src/pgvector.ts:19-33`
- **Evidence**: `index()`, `search()`, `delete()` 모두 `console.log`만 수행하고 실제 DB 연동 없음.
- **위험**: 이 클라이언트를 사용하는 코드가 RAG 검색 결과를 받지 못함.
- **권장사항**: Prisma/pgvector 드라이버 연동 구현 또는 미구현 표시 강화.

### MEDIUM

#### ARCH-004: 중복 타입 정의 — AgentType
- **파일**: `packages/domain/src/models/task.ts:31`, `packages/domain/src/models/agent-job.ts:19`
- **Evidence**: 두 파일 모두 `AgentType = 'hermes' | 'opencode' | 'manual'`로 정의. `packages/infrastructure/src/agents/command-agent-runtime.ts:17`에서 `import type { AgentType }` from domain.
- **위험**: 타입 변경 시 동기화 누락 가능.
- **권장사항**: 단일 소스(`domain/src/models/agent-job.ts`)에서만 정의하고 재사용.

#### ARCH-005: ApprovalDecision 타입 중복
- **파일**: `packages/domain/src/models/approval-policy.ts:107-113`, `packages/application/src/agents/hermes-role.ts:67-71`
- **Evidence**: 두 파일 모두 `ApprovalDecision` 인터페이스를 정의하지만 필드 구조가 다름 (前者: `requestId, decision, reason, decidedBy, decidedAt` / 后者: `approved, reason, conditions`).
- **위험**: 혼동으로 인한 타입 오류 가능.
- **권장사항**: domain에서 통합 정의 후 재사용.

#### ARCH-006: WorkflowEngine 실행 컨텍스트 메모리 누수
- **파일**: `packages/infrastructure/workflow/src/engine.ts:38,53`
- **Evidence**: `executions: Map<string, WorkflowExecutionContext>`에 실행 결과가 계속 쌓이고, 제거 메서드 없음.
- **위험**: 장시간 실행 시 메모리 무제한 증가.
- **권장사항**: TTL 기반 정리 또는 완료된 실행 컨텍스트 제거 메서드 추가.

#### ARCH-007: ConversationMemory 인메모리 전용
- **파일**: `packages/infrastructure/memory/src/conversation-memory.ts:9`
- **Evidence**: `sessions: Map<string, MemorySession>` — 프로세스 재시작 시 모든 대화 기록 소실.
- **권장사항**: 영속성 옵션(DB, 파일) 추가 또는 명확한 volatile 라벨링.

### LOW

#### ARCH-008: getConfigUnsafe() 함수 이름과 동작 불일치
- **파일**: `packages/config/src/schema.ts:115-117`
- **Evidence**: `getConfigUnsafe()`가 `getConfig()`를 그대로 호출. "검증 없이 설정 읽기"라고 주석에 적혀있지만 실제로는 검증 수행.
- **권장사항**: 이름 변경 또는 실제 unsafe 동작 구현.

---

## 3. Quality Reviewer (테스트 부족, 코드 품질, 타입 안전성, 회귀 위험)

### CRITICAL

#### QUA-001: 전체 테스트 파일 8개에 불과 — 핵심 모듈 테스트 부재
- **Evidence**: 전체 packages에서 테스트 파일 8개 발견:
  - `infrastructure/tests/` (6개): workspace-root, session-file-store, project-health-probe, evidence-writer, command-agent-runtime, approval-file-store
  - `infrastructure/memory/tests/` (1개): memory-tower-client
  - `application/tests/` (1개): session-coordinator
- **미테스트 핵심 모듈**:
  - `auth/token-manager.ts` — JWT 발급/검증 로직
  - `config/schema.ts` — 환경변수 검증 로직
  - `db/scripts/migrate-v3.ts`, `rollback.ts` — 마이그레이션/롤백
  - `proxy-core/` 전체 — 프록시 어댑터, 서킷 브레이커
  - `infrastructure/llm/` 전체 — OpenAI/Anthropic/LM Studio 클라이언트
  - `infrastructure/sandbox/` 전체 — 샌드박스 실행
  - `infrastructure/rag/` 전체 — RAG 클라이언트
  - `infrastructure/workflow/` 전체 — 워크플로우 엔진/스케줄러
  - `infrastructure/monitoring/` 전체 — Langfuse/Metrics
  - `application/src/use-cases/` 전체
  - `application/src/agents/` 대부분
  - `domain/` 전체 (도메인 모델은 타입만이라 테스트 불필요할 수 있으나, 유틸리티 함수 테스트 필요)
- **위험**: 회귀 감지 불가, 리팩토링 시 안전망 부재.
- **권장사항**: 최소한 auth, config, proxy-core, sandbox에 대한 단위 테스트 필수.

### HIGH

#### QUA-002: 타입 안전성 무시 — `as any` 사용
- **파일**: `packages/auth/src/token-manager.ts:77`
- **Evidence**: `this.signingKey = null as any;` — null을 CryptoKey로 타입 캐스팅.
- **권장사항**: `CryptoKey | null` 타입으로 변경하고 null 체크 후 사용.

#### QUA-003: 타입 안전성 무시 — `as unknown as` 사용
- **파일**: `packages/auth/src/token-manager.ts:123`
- **Evidence**: `return payload as unknown as TokenPayload;` — JWT payload를 직접 타입 캐스팅.
- **위험**: JWT 페이로드에 예상 필드가 없으면 런타임 에러.
- **권장사항**: Zod 스키마로 런타임 검증 후 타입 변환.

#### QUA-004: AiosV1ProxyAdapter의 `tokenManager: any` 타입
- **파일**: `packages/proxy-core/src/aios-v1-adapter.ts:93`
- **Evidence**: `private tokenManager: any = null;` — 타입 안전성 완전 무시.
- **권장사항**: `TokenManager | null` 타입 사용.

### MEDIUM

#### QUA-005: 타임스탬프 ID 생성 — 충돌 위험
- **파일**: 여러 파일 (`task-creation.ts:72`, `deferred-decision-handler.ts:68`, `task-dispatcher.ts:56`, `session-coordinator.ts:293`)
- **Evidence**: `id: \`task-${Date.now()}\`` 패턴 — 같은 밀리초에 여러 작업 생성 시 ID 충돌.
- **권장사항**: `crypto.randomUUID()` 사용 또는 `Date.now()` + 랜덤 문자열 조합.

#### QUA-006: SelfLearningSystem ID 생성 — Math.random() 사용
- **파일**: `packages/infrastructure/learning/src/self-learning.ts:29`
- **Evidence**: `id: \`learn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}\`` — Math.random()은 암호학적으로 안전하지 않음.
- **권장사항**: `crypto.randomUUID()` 사용.

#### QUA-007: DB 마이그레이션 롤백 시 전체 삭제 위험
- **파일**: `packages/db/scripts/rollback.ts:35`
- **Evidence**: `prisma.workflowStep.deleteMany({})` — WHERE 절 없이 모든 WorkflowStep 삭제.
- **위험**: 다른 마이그레이션에서 생성된 데이터도 함께 삭제됨.
- **권장사항**: 마이그레이션 레코드를 추적하고, 특정 마이그레이션의 데이터만 롤백하도록 변경.

### LOW

#### QUA-008: `dist/` 디렉토리에 `index 2.d.ts` 파일 존재
- **파일**: `packages/domain/dist/models/index 2.d.ts`
- **Evidence**: 파일명에 공백 포함 — 빌드 아티팩트 오류.
- **권장사항**: clean build 후 확인.

---

## 4. Operations Reviewer (운영 리스크, 롤백 가능성, 모니터링, 장애점)

### HIGH

#### OPS-001: DB 마이그레이션 트랜잭션 미사용
- **파일**: `packages/db/scripts/migrate-v3.ts:63-93`
- **Evidence**: `migrateWorkflowSteps()`에서 여러 DB 작업을 개별적으로 실행 (prisma.workflowStep.create, prisma.workflow.update). 트랜잭션으로 묶지 않음.
- **위험**: 중간에 실패하면 부분 마이그레이션 상태로 남음. 롤백 시 원래 상태로 복원 불가.
- **권장사항**: `prisma.$transaction()`으로 전체 마이그레이션을 원자적으로 실행.

#### OPS-002: 마이그레이션 상태 추적 없음
- **파일**: `packages/db/scripts/migrate-v3.ts` 전체
- **Evidence**: 마이그레이션 실행 이력(버전, 실행 시각, 성공/실패)을 기록하는 테이블이나 파일 없음.
- **위험**: 어떤 마이그레이션이 실행되었는지 확인 불가. 중복 실행 시 데이터 손상 가능.
- **권장사항**: `_migration_history` 테이블 추가.

#### OPS-003: Circuit Breaker 상태가 프로세스 생명주기에 종속
- **파일**: `packages/proxy-core/src/base-adapter.ts:11-16`
- **Evidence**: `circuitBreaker` 상태가 인스턴스 필드로만 존재. 프로세스 재시작 시 초기화.
- **위험**: 프로세스 재시작 직후 이미 장애 중인 업스트림에 요청을 보내 실패 반복.
- **권장사항**: 서킷 브레이커 상태를 파일/DB에 영속화하거나, 시작 시 health check 수행 후 결정.

#### OPS-004: WorkflowScheduler 실제 워크플로우 실행 미구현
- **파일**: `packages/infrastructure/workflow/src/scheduler.ts:62-66`
- **Evidence**: `startSchedule()`에서 `console.log(\`Scheduled workflow ${schedule.workflowId} triggered\`)`만 수행.
- **위험**: 스케줄이 트리거되어도 실제 워크플로우가 실행되지 않음.
- **권장사항**: WorkflowEngine과 연결.

### MEDIUM

#### OPS-005: LangfuseMonitor 이벤트 큐 무제한 성장
- **파일**: `packages/infrastructure/monitoring/src/langfuse.ts:70`
- **Evidence**: `eventQueue: Array<Record<string, unknown>> = []` — 큐 크기 제한 없음. flush 실패 시 이벤트가 다시 큐에 추가됨 (line 271).
- **위험**: Langfuse 서버 장애 시 메모리 무제한 증가.
- **권장사항**: 최대 큐 크기 설정 및 오래된 이벤트 드롭.

#### OPS-006: MetricsCollector 메모리 제한 있지만 슬라이스 연산 비효율
- **파일**: `packages/infrastructure/monitoring/src/metrics.ts:34`
- **Evidence**: `this.metrics = this.metrics.slice(-this.maxMetrics)` — 매 기록마다 배열 전체 복사.
- **위험**: 고빈도 메트릭 수집 시 GC 프레셔 증가.
- **권장사항**: Ring buffer 사용.

#### OPS-007: DB 클라이언트 개발 환경에서 query 로그 활성화
- **파일**: `packages/db/src/client.ts:8`
- **Evidence**: `log: process.env.NODE_ENV === 'development' ? ['query' as const] : []` — 개발 환경에서 모든 SQL 쿼리 로그 출력.
- **참고**: 프로덕션에서는 비활성화되므로 LOW.

### LOW

#### OPS-008: Health SSE 스트림 에러 핸들링 부족
- **파일**: `packages/health/src/registry.ts:217-234`
- **Evidence**: `checkAll().then(...)`에서 catch가 없고, 내부 try-catch에서 controller closed 에러만 무시.
- **권장사항**: `.catch()` 추가하여 unhandled promise rejection 방지.

---

## 5. Requirements Reviewer (요구사항 누락, 제외 범위 침범, 비즈니스 로직 검증)

### HIGH

#### REQ-001: refreshGraphToken() 스텁 — 토큰 갱신 불가
- **파일**: `packages/auth/src/token-manager.ts:163-167`
- **Evidence**: `console.warn(\`[TokenManager] Refresh token flow not yet implemented for ${product}\`)` — refreshToken으로 accessToken 갱신 로직 미구현.
- **위험**: Graph API 토큰 만료 후 자동 갱신 불가. 사용자가 15분마다 재인증해야 함.
- **권장사항**: Microsoft OAuth2 refresh_token grant 구현 필수.

#### REQ-002: IGitHubRepositoryAdapter 인터페이스 미구현
- **파일**: `packages/infrastructure/src/github/repository-adapter.ts` 전체
- **Evidence**: 인터페이스만 정의되어 있고 구현체 없음. `GitHubService` (service.ts)와 별도로 존재.
- **위험**: 두 인터페이스가 같은 역할을 하는데 구현체가 다를 수 있음.
- **권장사항**: 단일 인터페이스로 통합하거나, 명확한 책임 분리 문서화.

#### REQ-003: Git 충돌 해결 로직 없음
- **파일**: `packages/infrastructure/src/github/repository-adapter.ts`, `packages/infrastructure/src/github/octokit/service.ts`
- **Evidence**: `createOrUpdateFile()`에서 기존 파일 SHA를 가져오는 로직이 주석 처리됨 (service.ts:107-112).
- **위험**: 파일 업데이트 시 충돌 발생 가능.
- **권장사항**: SHA 조회 로직 활성화 및 충돌 처리 구현.

### MEDIUM

#### REQ-004: 비즈니스 규칙 검증 로직 부재
- **파일**: `packages/application/src/use-cases/task-creation.ts:86-94`
- **Evidence**: `validateDependencies()`가 항상 true, `checkDuplicateTask()`가 항상 false.
- **위험**: 순환 의존성, 자기 참조 등 비즈니스 규칙 위반이 감지되지 않음.

#### REQ-005: Phase 전환 시 전제조건 검증 없음
- **파일**: `packages/application/src/use-cases/phase-progression.ts:117-119`
- **Evidence**: `validatePhaseCompletion()`이 항상 true 반환.
- **위험**: 이전 Phase가 완료되지 않았는데 다음 Phase로 진행 가능.

#### REQ-006: AutoApprovalResolver 조건 문자열 평가 없음
- **파일**: `packages/application/src/agents/auto-approval-resolver.ts:125-133`
- **Evidence**: `evaluateRules()`에서 `rule.action === 'auto-approve'`이면 무조건 true 반환. `rule.condition` 문자열(`'type === "file-change" && action === "create"'`)을 실제로 평가하지 않음.
- **위험**: 조건과 무관하게 모든 auto-approve 규칙이 통과.
- **권장사항**: 조건 문자열을 안전하게 평가하는 엔진 구현 (예: JSONata, jexl).

### LOW

#### REQ-007: sangfor 제외 범위 침범 없음 확인
- **Evidence**: `packages/domain/sangfor/` 및 `packages/application/sangfor/`는 검토에서 제외. `packages/domain/sangfor/`의 타입을 import하는 코드 없음 확인 (다른 패키지에서).
- **결과**: 제외 범위 침범 없음 ✅

---

## 요약 통계

| Severity | Security | Architecture | Quality | Operations | Requirements | **합계** |
|----------|----------|-------------|---------|------------|-------------|---------|
| Critical | 2        | 0           | 1       | 0          | 0           | **3**   |
| High     | 4        | 3           | 3       | 4          | 3           | **17**  |
| Medium   | 2        | 4           | 3       | 3          | 3           | **15**  |
| Low      | 1        | 1           | 1       | 2          | 1           | **6**   |
| **합계** | **9**    | **8**       | **8**   | **9**      | **7**       | **41**  |

## 우선순위 Top 10 (즉시 조치 필요)

| # | ID | Severity | 요약 |
|---|-----|----------|------|
| 1 | SEC-002 | Critical | Approval Gate 항상 우회 (프로덕션 배포 시 치명적) |
| 2 | SEC-001 | Critical | OAuth 토큰 평문 메모리 저장 |
| 3 | QUA-001 | Critical | 핵심 모듈 테스트 부재 (8개 파일만 존재) |
| 4 | SEC-004 | High | ProcessSandbox 명령어 인젝션 |
| 5 | SEC-005 | High | DockerSandbox 셸 인젝션 |
| 6 | OPS-001 | High | DB 마이그레이션 트랜잭션 미사용 |
| 7 | ARCH-001 | High | Application 레이어 전면 스텁 |
| 8 | REQ-001 | High | 토큰 갱신 미구현 |
| 9 | OPS-002 | High | 마이그레이션 상태 추적 없음 |
| 10 | SEC-003 | High | NEXTAUTH_SECRET 엔트로피 검증 부족 |

## 핵심 관찰

1. **많은 코드가 "스텁/인터페이스 전용" 상태**: Application 레이어의 use-case, RAG 클라이언트, 스케줄러 등이 실제 구현 없이 반환값만 생성. 이는 의도적일 수 있으나, 프로덕션 배포 시 주의 필요.

2. **보안 게이트가 개발 단계에서 우회됨**: proxy-core의 approval gate가 항상 통과하도록 설계됨. 프로덕션 배포 전 반드시 구현 필요.

3. **테스트 커버리지 매우 낮음**: ~80+ 소스 파일 대비 8개 테스트 파일. 특히 auth, config, proxy-core 등 보안/운영 핵심 모듈의 테스트 부재.

4. **파일 기반 상태 저장 (.aios/context/)**: 협업 세션, 승인 큐가 로컬 파일에 저장됨. 다중 인스턴스 환경에서 동시성 문제 가능.

5. **Domain 모델 타입 정의 우수**: TypeScript 타입 시스템을 잘 활용하고 있으나, 런타임 검증(Zod)과의 연결이 부족.
