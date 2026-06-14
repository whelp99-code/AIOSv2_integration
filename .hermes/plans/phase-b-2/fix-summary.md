# Fix Summary — Phase B-2

**Date:** 2026-06-14
**Phase:** Track B Phase B-2 — 인프라 어댑터 실구현

---

## 🔒 보안 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| S1 | sandbox/src/docker-sandbox.ts | Command injection via shell argv join | Docker API 클라이언트로 전환, execFile + shell:false 적용 |
| S2 | sandbox/src/process-sandbox.ts | execAsync with shell | spawn(shell:false)으로 전환 |
| S3 | sandbox/src/process-sandbox.ts | allowedCommands 미적용 | execute 시작 시 allowlist 검증 추가 |
| S4 | storage/src/local-storage.ts | Path traversal 허용 | path.resolve + startsWith(basePath) 검증 추가 |
| S5 | sandbox/src/process-sandbox.ts | Sandbox 파일 경로 검증 부재 | tempDir out-of-bound 검증 추가 |
| S6 | mcp/src/client.ts | 인증 없음 | API 키 + mTLS 인증 추가, HTTPS 강제 |
| S7 | memory/src/memory-tower-client.ts | 사용자 경로 직접 spawn | path.resolve 검증 추가 |
| S8 | llm/src/*.ts | API 키 민감정보 노출 | SecretsManager 래핑 + 마스킹 |

---

## 🏗️ 아키텍처 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| A1 | memory/src/conversation-memory.ts | In-memory Map | Redis 영속성 백엔드 추가 |
| A2 | workflow/src/engine.ts | 실행 상태 in-memory | DB 저장소 + 체크포인트 추가 |
| A3 | workflow/src/scheduler.ts | startSchedule no-op | WorkflowEngine 연동 |
| A4 | llm/src/factory.ts | 모든 프로바이더 즉시 생성 | Lazy 초기화로 변경 |
| A5 | rag/src/pgvector.ts | No-op 스텁 | 실제 DB 연결 및 CRUD |
| A6 | rag/src/lightrag.ts | axios 사용 | fetch로 전환 |

---

## 🧪 품질 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| Q1 | llm/src/openai.ts, llm/src/anthropic.ts | 입력 검증 없음 | max-length + 내용 필터 추가 |
| Q2 | llm/src/anthropic.ts | isAvailable 실 호출 | 헬스체크 + 캐시 TTL(5m) |
| Q3 | llm/src/openai.ts, llm/src/lm-studio.ts | 에러 swallow | 로깅 추가 |
| Q4 | agents/src/base-agent.ts | regex 파싱 | JSON mode structured output |
| Q5 | memory/src/conversation-memory.ts | Math.random ID | crypto.randomUUID() |

---

## ⚙️ 운영 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| O1 | mcp/src/client.ts, rag/src/lightrag.ts | 커넥션 풀링/재시도 없음 | HTTP agent + keep-alive + 지수 백오프 |
| O2 | sandbox/src/docker-sandbox.ts | container cleanup best-effort | 로깅 + 주기적 정리 |
| O3 | workflow/src/scheduler.ts | setInterval 에러 처리 없음 | try/catch + 로깅 |
| O4 | monitoring/src/langfuse.ts | SIGTERM flush 없음 | process.on('SIGTERM') 등록 |
| O5 | monitoring/src/metrics.ts | Math.min/max overflow | iterative min/max 계산 |

---

## 📋 요구사항 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| R1 | llm/* | Rate limiting 없음 | 토큰 예산/레이트 리미터 적용 |
| R2 | llm/src/lm-studio.ts | 하드코딩 API 키 | 설정 가능하도록 분리 |
| R3 | infrastructure/* | 추적/관측성 없음 | Langfuse/OpenTelemetry 주입 |

---

## 🎯 수정 확인 방법

```bash
# 테스트 실행
pnpm test --filter=@aios/infrastructure-*

# 타입체크
pnpm typecheck --filter=@aios/infrastructure-*

# 보안 스캔
pnpm audit
pnpm eslint --ext .ts packages/infrastructure/
```
