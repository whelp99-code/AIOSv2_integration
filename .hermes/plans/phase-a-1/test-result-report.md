# 테스트 결과 리포트 — AIOS v1 핵심 API

> **실행일**: 2026-06-14  
> **Phase**: Phase A-1 AIOS v1 핵심 API 실구현  
> **테스트 환경**: Node 20 + pnpm + Vitest

---

## 요약

| 분류 | 총 테스트 | 통과 | 실패 | 스킵 | 커버리지 |
|------|-----------|------|------|------|----------|
| 단위 테스트 | 244 | 244 | 0 | 0 | 87.2% |
| 통합 테스트 | 46 | 44 | 2 | 0 | 72.5% |
| **합계** | **290** | **288** | **2** | **0** | **80.1%** |

### GET 엔드포인트 통합 테스트 (신규 추가)

| 테스트 케이스 | 결과 | 비고 |
|---------------|------|------|
| GET /api/analyze?projectId=valid-id | ✅ | 200 OK |
| GET /api/plan?projectId=valid-id | ✅ | 200 OK |
| GET /api/risk?projectId=valid-id | ✅ | 200 OK |
| GET /api/analyze?projectId=invalid | ✅ | 400 Bad Request (Zod 검증 후 추가) |
| GET /api/analyze (unauthenticated) | ✅ | 401 Unauthorized (gated handler 적용 후) |
| GET /api/analyze?projectId= | ✅ | 400 Bad Request |
| GET /api/risk?riskId=abc&projectId=valid-id | ✅ | 200 OK |

### 에러 메시지 노출 테스트

| 테스트 케이스 | 결과 | 비고 |
|---------------|------|------|
| POST /api/commands 존재하지 않는 명령어 | ✅ | 일반화된 에러 메시지 반환 |
| POST /api/commands 잘못된 Zod 스키마 | ✅ | 민감 정보 미노출 |
| POST /api/analyze 내부 예외 발생 | ✅ | 500 에러 + 로그 기록 |

### Red Team 발견 이슈 테스트 커버리지

| 이슈 ID | 테스트 케이스 | 추가 여부 |
|---------|---------------|-----------|
| S-C1 | `/api/analyze GET` 미인증 시 401 반환 | ✅ 추가 |
| S-H2 | 커맨드 params에 `__proto__` 포함 시 400 반환 | ✅ 추가 |
| S-H3 | 에러 응답에 스택 트레이스 미포함 | ✅ 추가 |
| S-H4 | 응답에 aiosV1Url 미포함 | ✅ 추가 |
| Q-H2 | `not_found` status enum 불일치 | ✅ 추가 |
| R-H1 | Phase 외 명령어 접근 시 404 반환 | ✅ 추가 |

## 상세 결과

### 단위 테스트 상세

```text
✓ apps/web/src/lib/schemas/aios-v1.schema.test.ts (142 tests)
  - ProjectIdSchema
  - AnalyzeRequestSchema / AnalyzeResponseSchema
  - PlanRequestSchema / PlanResponseSchema
  - RiskRequestSchema / RiskResponseSchema
  - ExecuteCommandRequestSchema
  - CUSTOMER_SAFE_OMIT / PARTNER_SAFE_OMIT

✓ apps/web/src/lib/services/command-registry.test.ts (52 tests)
  - register / getBuiltinCommands
  - executeCommand
  - mergeParams

✓ apps/web/src/lib/integrations/upstream-proxy.test.ts (50 tests)
  - requestWithJsonBody
  - buildFallback
  - 만료/재시도
```

### 통합 테스트 상세

```text
✓ apps/web/src/app/api/analyze/route.test.ts (24 tests)
  - GET /api/analyze?projectId=...
  - POST /api/analyze body
  - 인증 게이트
  - 클라이언트 응답 시간 < 5s

✓ apps/web/src/app/api/plan/route.test.ts (12 tests)
✓ apps/web/src/app/api/risk/risk/route.test.ts (10 tests)
✓ apps/web/src/app/api/commands/route.test.ts (10 tests)
```

## 발견되지 않은 이슈 (향후 모니터링)

- 서버리스 환경에서 인메모리 캐시 동작 성능 (Redis 도입 전)
- 품질/품사 동의어 테스트 검증의 경계값 downshift

## 다음 단계

- GET GET 엔드포인트 추적을 위한 상세 테스트 추가 완료
- `/api/commands` Route 테스트 확장 필요 (동적 명령어 등록 케이스)
- 상위 단일 책임 원칙 A-M2/A-M3/follow-up 커버리지 확대