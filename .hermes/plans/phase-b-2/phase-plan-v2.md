# Track B Phase B-2: 인프라 어댑터 실구현 (v2)

> **작성일**: 2026-06-14
> **수정일**: 2026-06-14 (Red Team 피드백 반영)
> **목표**: LLM 클라이언트, 메모리, MCP, 샌드박스, RAG, 모니터링, 워크플로우 인프라 어댑터 완성
> **대상**: `packages/infrastructure/`

---

## 📊 Red Team 검토 결과 반영

### ✅ 반영된 개선사항

| 이슈 | 수정 내용 |
|------|----------|
| Command injection (Docker/Process 샌드박스) | execFile + shell:false 적용, Docker API 클라이언트로 전환 |
| Path traversal (LocalStorage, ProcessSandbox) | basePath/tempDir 벗어난 접근 검증 추가 |
| allowedCommands 미적용 | execute() 시작 시 허용 명령어 검증 추가 |
| MCP 인증 부재 | API 키 + mTLS 인증 추가 |
| API 키 시크릿 노출 | SecretsManager 래핑, toString/serialization 시 마스킹 |
| 메모리 영속성 부재 | Redis/DB 백엔드 추가 (ConversationMemory, Metrics, Workflow) |
| Workflow 스케줄러 no-op | WorkflowEngine 연동 및 에러 처리 추가 |
| LLM 팩토리 eager 초기화 | Lazy initialization으로 변경 |
| PgVector 스텁 | 실제 DB 연결 및 CRUD 구현 |
| LightRAG axios 의존성 | fetch 기반으로 전환 |
| LLM 입력 검증 부재 | 메시지 길이/내용 제한 추가 |
| isAvailable() 실 API 호출 | 헬스체크 엔드포인트 + 캐시 TTL 적용 |
| 에러 swallow 로깅 | isAvailable 에러 로깅 추가 |
| BaseAgent regex 파싱 | JSON mode structured output으로 전환 |
| ID generation 취약점 | crypto.randomUUID() 적용 |
| HTTP 연결 풀링/재시도 | HTTP agent + keep-alive + 지수 백오프 |
| Docker cleanup best-effort | 로깅 + 주기적 정리 |
| Scheduler 에러 처리 | try/catch + 로깅 추가 |
| Graceful shutdown | SIGTERM 핸들러로 Langfuse flush 추가 |
| Metrics unbounded | 메모리 리미트 추가 |
| LLM rate limiting | 토큰 예산/레이트 리미터 적용 |

--- 

## 🎯 Phase B-2 목표 (v2)

### 1차 목표: 인프라 어댑터 핵심 기능 완성
- LLM 클라이언트 (OpenAI, Anthropic, LM Studio) 안정화
- Memory 어댑터 (ConversationMemory, MemoryTower) 완성
- MCP 클라이언트/서버 프로토콜 구현
- Sandbox 실행 환경 (Docker + Process) 완성

### 2차 목표: 보안 및 신뢰성 강화
- Command injection 방지 완료
- Path traversal 방지 완료
- 입력 검증 및 에러 처리 표준화
- 테스트 커버리지 70% 이상

### 3차 목표: 관측성 및 운영 준비
- 모니터링 어댑터 (Langfuse, Metrics) 완성
- 워크플로우 엔진/스케줄러 완성
- Storage 및 RAG 어댑터 완성

---

## 📋 구현 상세 (v2)

### Task 2.1: LLM 클라이언트 완성

**Objective:** OpenAI, Anthropic, LM Studio 클라이언트 표준화

**Files:**
- Modify: `packages/infrastructure/llm/src/openai.ts`
- Modify: `packages/infrastructure/llm/src/anthropic.ts`
- Modify: `packages/infrastructure/llm/src/lm-studio.ts`
- Modify: `packages/infrastructure/llm/src/factory.ts`

**Step 1: 공통 인터페이스 정의**
- 입력 검증 추가 (최대 토큰 수, 메시지 수)
- API 키 시크릿 관리 개선 (SecretsManager)
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

## 📋 검증 기준 (v2)

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

## 📅 타임라인 (v2)

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

## ⚠️ 리스크 (v2)

1. **보안 취약점** - 샌드박스 injection 위험
2. **메모리 의존성** - 영속성 추가 시 설계 변경
3. **외부 의존성** - Docker, Redis, DB 필요

---

## 🎯 성공 기준 (v2)

1. ✅ 모든 인프라 어댑터 기능 완성
2. ✅ Critical/High 보안 이슈 해결
3. ✅ 테스트 54건 이상 통과
4. ✅ 타입체크 통과
5. ✅ Red Team 승인

---

## 📝 Git Diff 요약 (vs v1)

### 신규/변경 파일

```
packages/infrastructure/llm/src/openai.ts              | +12 -4
packages/infrastructure/llm/src/anthropic.ts           | +15 -6
packages/infrastructure/llm/src/lm-studio.ts           | +10 -3
packages/infrastructure/llm/src/factory.ts             | +22 -18
packages/infrastructure/memory/src/conversation-memory.ts | +18 -2
packages/infrastructure/memory/src/memory-tower-client.ts   | +14 -4
packages/infrastructure/mcp/src/client.ts              | +28 -12
packages/infrastructure/mcp/src/server.ts              | +16 -2
packages/infrastructure/sandbox/src/docker-sandbox.ts  | +24 -16
packages/infrastructure/sandbox/src/process-sandbox.ts | +20 -10
packages/infrastructure/storage/src/local-storage.ts   | +8 -2
packages/infrastructure/rag/src/pgvector.ts            | +35 -10
packages/infrastructure/rag/src/lightrag.ts            | +6 -4
packages/infrastructure/monitoring/src/metrics.ts      | +12 -4
packages/infrastructure/monitoring/src/langfuse.ts     | +10 -4
packages/infrastructure/workflow/src/engine.ts         | +18 -6
packages/infrastructure/workflow/src/scheduler.ts      | +12 -4
```

### 주요 변경점 요약

| 파일 | 변경 내용 |
|------|----------|
| docker-sandbox.ts | Docker API 클라이언트로 전환, execFile 적용 |
| process-sandbox.ts | spawn으로 전환, allowedCommands 검증 추가 |
| local-storage.ts | path.resolve + startsWith 검증 추가 |
| memory-tower-client.ts | path 검증, UUID request ID |
| mcp/client.ts | API 키 인증, HTTPS 강제, 재시도 로직 |
| llm/factory.ts | lazy initialization |
| conversation-memory.ts | crypto.randomUUID, Redis 백엔드 옵션 |
| pgvector.ts | 실제 DB 연결 및 CRUD |
| lightrag.ts | fetch로 전환 |
| scheduler.ts | WorkflowEngine 연동, try/catch |
| langfuse.ts | SIGTERM 핸들러 |

---

## 🔒 보안 변경 (v2)

### S1~S4 Critical 이슈 해결

| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| S1: Command injection (Docker) | docker-sandbox.ts | Docker API 클라이언트 + execFile |
| S2: Command injection (Process) | process-sandbox.ts | spawn(shell:false) + args 배열 |
| S3: allowedCommands 미적용 | process-sandbox.ts | 실행 전 allowlist 검증 |
| S4: Path traversal (Storage) | local-storage.ts | path.resolve + startsWith |

### S5~S7 High 이슈 해결

| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| S5: Sandbox file path traversal | process-sandbox.ts | tempDir 검증 추가 |
| S6: MCP 인증 부재 | mcp/client.ts, mcp/server.ts | API 키 + mTLS |
| S7: MemoryTower 경로 주입 | memory-tower-client.ts | path.resolve 검증 |

### S8 Medium 이슈 해결

| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| S8: API 키 노출 | llm/*.ts | SecretsManager 래핑 + 마스킹 |

---

## 🏗️ 아키텍처 변경 (v2)

### A1~A3 High 이슈 해결

| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| A1: 메모리-only 상태 | conversation-memory.ts, metrics.ts | Redis 영속성 |
| A2: Workflow 상태 | engine.ts | DB 저장소 + 체크포인트 |
| A3: 스케줄러 no-op | scheduler.ts | WorkflowEngine 연동 |

### A4~A6 Medium 이슈 해결

| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| A4: Eager LLM 팩토리 | factory.ts | Lazy initialization |
| A5: PgVector 스텁 | pgvector.ts | 실제 DB 연결 |
| A6: HTTP 클라이언트 불일치 | lightrag.ts | fetch로 전환 |

---

## 🧪 품질 변경 (v2)

### Q1 High 해결
| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| Q1: LLM 입력 검증 | llm/openai.ts, llm/anthropic.ts | 길이 제한 + 내용 필터 |

### Q2~Q5 Medium 해결
| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| Q2: isAvailable API 호출 | llm/anthropic.ts | 헬스체크 + 캐시 |
| Q3: 에러 swallow | llm/*.ts | 로깅 추가 |
| Q4: Fragile regex | base-agent.ts | JSON mode structured output |
| Q5: ID generation | conversation-memory.ts | crypto.randomUUID |

---

## ⚙️ 운영 변경 (v2)

### O1 High 해결
| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| O1: 연결 풀링/재시도 | mcp/client.ts, rag/lightrag.ts | HTTP agent + keep-alive + 지수 백오프 |

### O2~O3 Medium 해결
| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| O2: Docker cleanup | docker-sandbox.ts | 로깅 + 주기적 정리 |
| O3: Scheduler 에러 | scheduler.ts | try/catch + 로깅 |

### O4~O5 Low 해결
| 이슈 | 파일 | 해결 방법 |
|------|------|----------|
| O4: Graceful shutdown | langfuse.ts | SIGTERM 핸들러 |
| O5: Math.min/max | metrics.ts | 순회 방식으로 변경 |

---

## 📋 검증 기준 (v2)

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

## 📅 타임라인 (v2)

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

## ⚠️ 리스크 (v2)

1. **보안 취약점** - 샌드박스 injection 위험
2. **메모리 의존성** - 영속성 추가 시 설계 변경
3. **외부 의존성** - Docker, Redis, DB 필요

---

## 🎯 성공 기준 (v2)

1. ✅ 모든 인프라 어댑터 기능 완성
2. ✅ Critical/High 보안 이슈 해결
3. ✅ 테스트 54건 이상 통과
4. ✅ 타입체크 통과
5. ✅ Red Team 승인
