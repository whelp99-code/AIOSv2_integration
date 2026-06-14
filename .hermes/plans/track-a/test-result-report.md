# Test Result Report

> 생성일시: 2026-06-14 15:35 KST  
> Vitest v3.2.6 | Transform 848ms | Collect 753ms | Tests 3.89s | Total 1.21s

---

## 전체 결과 (총 306건 통과 / 0건 실패)

| 항목 | 값 |
|------|-----|
| 테스트 파일 | **18개 전체 통과** |
| 테스트 케이스 | **306건 전체 통과** |
| 실패 | 0건 |
| 스킵 | 0건 |
| 소요 시간 | 1.21초 |

---

## Phase A-1 테스트 결과: AIOS v1 래퍼 (호환성 계층)

**✅ 전체 통과 — 143건**

| 테스트 파일 | 통과 | 비고 |
|-------------|------|------|
| `tests/unit/aios-v1-schema.test.ts` | 44 | Zod 스키마 유효성 검증 (Analyze/Plan/Risk/Command) |
| `tests/unit/aios-v1-action-service.test.ts` | 14 | Feature flag, 멱등성, fallback, 업스트림 프록시 |
| `tests/unit/command-registry.test.ts` | 12 | 명령어 등록/조회/실행, feature flag 분기 |
| `tests/unit/contract-tests.test.ts` | 18 | API 계약 테스트 + Prisma select/omit 상수 |
| `tests/unit/domain-services.test.ts` | 28 | AnalysisService, PlanningService, RiskService |
| `tests/unit/approval-idempotency.test.ts` | 12 | createGatedHandler 멱등성 키, sessionId 추출 |
| `tests/approval-gate.test.ts` | 4 | 승인 게이트 409/차단/re-wrapping |
| `tests/unit/feature-flag.test.ts` | 10 | 환경변수 파싱, withFeatureFlag 패턴 |
| `tests/unit/boundary-values.test.ts` | ~40 | projectId/type/scope/score/requirements 경계값 |

### 주요 커버리지
- **스키마 검증**: AnalyzeRequest, PlanRequest, RiskRequest, CommandExecuteRequest, Response 스키마 전체
- **Feature Flag**: 환경변수 없는 경우, true/false/"1"/"0"/빈문자열 처리
- **멱등성**: idempotencyKey body/헤더 추출, 캐시 응답 반환
- **승인 게이트**: 409 pending, 승인 후 재개, 거부 후 차단
- **Domain Services**: Analysis/Planning/Risk 서비스 fallback 분기, getResults 조회

---

## Phase A-2 테스트 결과: Sangfor 도메인 통합

**✅ 해당 독립 테스트 파일 없음 — Phase 5 smoke test에서 간접 커버**

| 테스트 파일 | 통과 | 비고 |
|-------------|------|------|
| `tests/phase5-smoke.test.ts` (Sangfor 섹션) | 2 | GET /api/sangfor/events 프록시 + upstream unreachable 처리 |

### 주요 커버리지
- Sangfor events 프록시 → upstream 정상 연결 시 응답 반환
- Upstream 연결 실패 시 에러 응답 반환 (ECONNREFUSED 처리)
- ⚠️ `packages/domain/sangfor/` 전용 단위 테스트 파일은 현재 없음

---

## Phase A-3 테스트 결과: Collaboration UI/백엔드

**✅ 전체 통과 — 3건**

| 테스트 파일 | 통과 | 비고 |
|-------------|------|------|
| `tests/integration.test.ts` (Collaboration 섹션) | 3 | Cursor assignment E2E, 승인/거부 후 재개 |

### 주요 커버리지
- **Cursor assignment E2E**: 생성 → 실행 전체 워크플로우 (214ms)
- **승인 후 재개**: approval → assignment resume 정상 동작 (155ms)
- **거부 후 차단**: rejection → assignment resume 차단 확인 (36ms)
- ⚠️ `apps/web/src/app/collaboration/` 프론트엔드 독립 테스트는 현재 없음

---

## Phase A-4 테스트 결과: 인프라/패키지 레이어

**✅ 전체 통과 — 129건**

| 테스트 파일 | 통과 | 비고 |
|-------------|------|------|
| `tests/unit/infrastructure-sandbox.test.ts` | 7 | ProcessSandbox: 명령 실행, stderr, 타임아웃, 파일 I/O, 정리 |
| `tests/unit/infrastructure-storage.test.ts` | 9 | LocalStorageProvider: 업로드/다운로드/삭제/목록/signed URL |
| `tests/unit/infrastructure-mcp.test.ts` | 11 | MCPServerImpl + MCPClient: 도구 등록/호출/리소스/에러 처리 |
| `tests/unit/infrastructure-memory.test.ts` | 10 | ConversationMemory: 세션 관리/검색/제한/메타데이터 |
| `tests/unit/infrastructure-monitoring.test.ts` | 20 | LangfuseMonitor(11) + MetricsCollector(9) + timed 유틸(2) |
| `tests/unit/boundary-values.test.ts` | ~40 | 스키마 경계값 종합 (A-1과 공유) |
| `tests/basic.test.ts` | 3 | 프로젝트 구조, domain/application export 확인 |
| `tests/phase5-smoke.test.ts` (Customers/whelp99) | 6 | Customers 프록시, whelp99 health bridge |
| `tests/integration.test.ts` (기타) | 5 | Approvals API, F-aios-v3 health, gated proxy, integrations health |
| `tests/integration/aios-v1-routes.test.ts` | 18 | Analyze/Plan/Risk/Commands API 라우트 통합 테스트 |

### 주요 커버리지
- **ProcessSandbox**: 명령 실행, stderr 캡처, 타임아웃(508ms), 임시파일 I/O, 정리
- **LocalStorageProvider**: 업로드/중첩 디렉토리/다운로드/삭제/목록/signed URL/덮어쓰기
- **MCPServerImpl**: 초기화, 도구 등록, tools/list, tools/call, 에러 처리
- **MCPClient**: 도구 등록/호출, 서버 미연결 시 에러 반환
- **ConversationMemory**: 세션 추가/조회/제한/검색/삭제/메타데이터/최대 항목 제한
- **LangfuseMonitor**: 설정 확인, trace/generation/span/score 생성/종료, 필터링, 플러시
- **MetricsCollector**: record/increment/decrement/gauge/timer/histogram/summary/eviction
- **API Routes**: POST/GET /api/analyze, /plan, /risk, /commands 전체 라우트

---

## 커버리지 분석

### 테스트 분포 요약

| Phase | 파일 수 | 테스트 수 | 상태 |
|-------|---------|-----------|------|
| A-1 (AIOS v1 래퍼) | 9 | ~143 | ✅ 전체 통과 |
| A-2 (Sangfor 도메인) | 1 (smoke) | 2 | ✅ 통과 (단위 테스트 부재) |
| A-3 (Collaboration) | 1 (통합) | 3 | ✅ 통과 (프론트엔드 테스트 부재) |
| A-4 (인프라/패키지) | 10 | ~129 | ✅ 전체 통과 |
| **합계** | **18** | **306** | **✅ 전체 통과** |

### 커버리지 격차 (Gap Analysis)

| 영역 | 현재 상태 | 권장 보강 |
|------|-----------|-----------|
| `packages/domain/sangfor/` | 독립 단위 테스트 없음 | sangfor 도메인 서비스 단위 테스트 추가 |
| `apps/web/src/app/collaboration/` | 프론트엔드 독립 테스트 없음 | React 컴포넌트 렌더링/상호작용 테스트 추가 |
| 프록시 라우트 에러 핸들링 | smoke test만 존재 | 다양한 에러 시나리오(타임아웃, 5xx, malformed response) 테스트 |
| 인증/권한 | 테스트 없음 | 인증 미들웨어, 토큰 검증 테스트 추가 |

### 성능 관찰

- **가장 빠른 테스트**: 스키마 검증 테스트 (0~2ms)
- **가장 느린 테스트**: ProcessSandbox 타임아웃 테스트 (508ms), approval-idempotency 초기화 (251ms)
- **전체 실행 시간**: 1.21초 (306건) → 테스트당 평균 4ms
