# Track B Phase B-2: 인프라 어댑터 실구현

> **작성일**: 2026-06-14
> **목표**: LLM 클라이언트, 메모리, MCP, 샌드박스, RAG, 모니터링, 워크플로우 인프라 어댑터 완성
> **대상**: `packages/infrastructure/`

---

## 📊 현재 상태 분석

### 기존 인프라 레이어
- LLM: OpenAI, Anthropic, LM Studio 클라이언트 및 팩토리
- Memory: ConversationMemory, MemoryTowerClient
- MCP: 클라이언트/서버 스텁
- Sandbox: ProcessSandbox, DockerSandbox
- Storage: 로컬 스토리지 제공자
- Monitoring: MetricsCollector, LangfuseMonitor
- Workflow: 엔진, 스케줄러
- Agents: BaseAgent 및 구현체
- Learning: SelfLearningSystem
- RAG: LightRAG, PgVector 클라이언트

### 문제점
- 많은 컴포넌트가 메모리-only 스텁 상태
- 보안 취약점 (command injection, path traversal)
- 에러 처리 및 관측성 부재
- Docker/프로세스 샌드박스 기능 미완성

---

## 🎯 Phase B-2 목표

### 1차 목표: 인프라 어댑터 핵심 기능 완성
- LLM 클라이언트 (OpenAI, Anthropic, LM Studio) 안정화
- Memory 어댑터 (ConversationMemory, MemoryTower) 완성
- MCP 클라이언트/서버 프로토콜 구현
- Sandbox 실행 환경 (Docker + Process) 완성

### 2차 목표: 보안 및 신뢰성 강화
- Command injection 방지
- Path traversal 방지
- 입력 검증 및 에러 처리 표준화
- 테스트 커버리지 70% 이상

### 3차 목표: 관측성 및 운영 준비
- 모니터링 어댑터 (Langfuse, Metrics) 완성
- 워크플로우 엔진/스케줄러 완성
- Storage 및 RAG 어댑터 완성

---

## 📋 구현 상세

### Task 2.1: LLM 클라이언트 완성

**Objective:** OpenAI, Anthropic, LM Studio 클라이언트 표준화

**Files:**
- Modify: `packages/infrastructure/llm/src/openai.ts`
- Modify: `packages/infrastructure/llm/src/anthropic.ts`
- Modify: `packages/infrastructure/llm/src/lm-studio.ts`
- Modify: `packages/infrastructure/llm/src/factory.ts`

**Step 1: 공통 인터페이스 정의**
- 입력 검증 추가 (최대 토큰 수, 메시지 수)
- API 키 시크릿 관리 개선
- 에러 로깅 표준화

**Step 2: isAvailable() 개선**
- 실제 API 호출 대신 헬스체크 엔드포인트 사용
- 캐시 TTL 적용 (5분)

**Step 3: 팩토리 lazy 초기화**
- 필요할 때만 클라이언트 생성
- 순환 참조 방지

**Step 4: 테스트**
```bash
pnpm test --filter=@aios/infrastructure-llm
pnpm typecheck --filter=@aios/infrastructure-llm
```

---

### Task 2.2: 메모리 어댑터 완성

**Objective:** ConversationMemory, MemoryTower 안정화

**Files:**
- Modify: `packages/infrastructure/memory/src/conversation-memory.ts`
- Modify: `packages/infrastructure/memory/src/memory-tower-client.ts`

**Step 1: ConversationMemory 영속성**
- Redis 백엔드 추가 옵션
- crypto.randomUUID() 사용

**Step 2: MemoryTower 보안**
- 경로 검증 추가
- JSON-RPC ID 생성기 개선

**Step 3: 테스트**
```bash
pnpm test --filter=@aios/infrastructure-memory
```

---

### Task 2.3: MCP 프로토콜 구현

**Objective:** MCP 클라이언트/서버 완성

**Files:**
- Modify: `packages/infrastructure/mcp/src/client.ts`
- Modify: `packages/infrastructure/mcp/src/server.ts`

**Step 1: 인증 추가**
- API 키 / mTLS 지원
- HTTPS 강제 (프로덕션)

**Step 2: 연결 풀링 및 재시도**
- HTTP keep-alive
- 지수 백오프 재시도

**Step 3: 테스트**
```bash
pnpm test --filter=@aios/infrastructure-mcp
```

---

### Task 2.4: 샌드박스 실행 환경

**Objective:** Docker/Process 샌드박스 보안 및 안정화

**Files:**
- Modify: `packages/infrastructure/sandbox/src/docker-sandbox.ts`
- Modify: `packages/infrastructure/sandbox/src/process-sandbox.ts`

**Step 1: Command injection 방지**
- execFile 사용 (shell: false)
- Docker API 클라이언트 사용

**Step 2: Path traversal 방지**
- basePath 벗어난 접근 차단
- tempDir 검증

**Step 3: allowedCommands 검증**
- config.allowedCommands 실제 적용
- 미리 정의된 명령만 허용

**Step 4: 테스트**
```bash
pnpm test --filter=@aios/infrastructure-sandbox
```

---

### Task 2.5: Storage 및 RAG 어댑터

**Objective:** 스토리지 및 벡터 검색 완성

**Files:**
- Modify: `packages/infrastructure/storage/src/local-storage.ts`
- Modify: `packages/infrastructure/rag/src/pgvector.ts`
- Modify: `packages/infrastructure/rag/src/lightrag.ts`

**Step 1: LocalStorage 보안**
- Path traversal 방지
- 파일 크기 제한

**Step 2: PgVector 구현**
- 실제 DB 연결
- CRUD 연산 완성

**Step 3: HTTP 클라이언트 표준화**
- axios → fetch 전환

---

### Task 2.6: 모니터링 및 워크플로우

**Objective:** Metrics, Langfuse, Workflow 완성

**Files:**
- Modify: `packages/infrastructure/monitoring/src/metrics.ts`
- Modify: `packages/infrastructure/monitoring/src/langfuse.ts`
- Modify: `packages/infrastructure/workflow/src/engine.ts`
- Modify: `packages/infrastructure/workflow/src/scheduler.ts`

**Step 1: Metrics 안정화**
- Math.min/max 대체
- 메모리 리미트 추가

**Step 2: Langfuse 완성**
- Graceful shutdown
- 자동 flush 개선

**Step 3: Workflow 엔진 영속성**
- DB 저장소 추가
- 체크포인트/재개 지원

**Step 4: 스케줄러 구현**
- WorkflowEngine 연동
- 에러 처리 추가

---

## 📋 검증 기준

### ✅ 완료 조건

1. **LLM 어댑터**
   - 3개 프로바이더 모두 isAvailable() 정상 동작
   - 입력 검증 통과
   - 에러 로깅 확인

2. **메모리 어댑터**
   - ConversationMemory CRUD 정상
   - MemoryTower 보안 검증 통과

3. **MCP 어댑터**
   - 인증 동작
   - 재시도 로직 동작

4. **샌드박스**
   - Path traversal 차단
   - Command injection 차단
   - allowedCommands 검증

5. **Storage/RAG**
   - Path traversal 차단
   - PgVector CRUD 동작

6. **모니터링/워크플로우**
   - Metrics 수집/요약 정상
   - Workflow 스케줄러 실행 확인

7. **테스트**
   - 54건 이상 통과
   - 타입체크 통과

---

## 📅 타임라인

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 2.1 | LLM 클라이언트 완성 | 0.5일 | ⏸️ 대기 |
| 2.2 | 메모리 어댑터 완성 | 0.5일 | ⏸️ 대기 |
| 2.3 | MCP 프로토콜 구현 | 0.5일 | ⏸️ 대기 |
| 2.4 | 샌드박스 보안 강화 | 0.5일 | ⏸️ 대기 |
| 2.5 | Storage/RAG 완성 | 0.5일 | ⏸️ 대기 |
| 2.6 | 모니터링/워크플로우 완성 | 0.5일 | ⏸️ 대기 |

**총 예상 기간: 3일**

---

## ⚠️ 리스크

1. **보안 취약점** - 샌드박스 injection 위험
2. **메모리 의존성** - 영속성 추가 시 설계 변경
3. **외부 의존성** - Docker, Redis, DB 필요

---

## 🎯 성공 기준

1. ✅ 모든 인프라 어댑터 기능 완성
2. ✅ Critical/High 보안 이슈 해결
3. ✅ 테스트 54건 이상 통과
4. ✅ 타입체크 통과
5. ✅ Red Team 승인
