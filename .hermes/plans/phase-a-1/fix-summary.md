# Fix Summary — Phase A-1

> **수정일**: 2026-06-14  
> **대상 Red Team**: `red-team-review-v1.md` (Gemini)  
> **고정된 이슈**: 0 / 총 34건

---

## 수정 현황 요약

| Severity | Open | Fixed | Wontfix / Deferred |
|----------|------|-------|--------------------|
| Critical | 2 (S-C1, S-C2) | 0 | 0 |
| High | 13 | 0 | 0 |
| Medium | 15 | 0 | 0 |
| Low | 4 | 0 | 0 |
| 합계 | 34 | **0** | **0** |

## 상세 이슈 트라이에이지

### Critical (즉시 조치 필요)

| 이슈 | 파일 | 현재 상태 | 수정 계획 |
|------|------|-----------|-----------|
| S-C1 GET 인증 부재 | analyze/route.ts, plan/route.ts, risk/route.ts | 변경 없음 | Step 8에서 `createGatedHandler` 적용 또는 세션 인증 미들웨어 추가 |
| S-C2 requestedBy 하드코딩 | approval-middleware.ts | 변경 없음 | Step 8에서 서버사이드 세션 기반 사용자 ID 추출로 변경 |

### High (1주 내 조치)

| 이슈 | 파일 | 현재 상태 | 수정 계획 |
|------|------|-----------|-----------|
| S-H1 NODE_ENV 의존 bypass | approval-middleware.ts | 변경 없음 | 명시적 플래그 `APPROVAL_GATE_ENABLED` 도입 |
| S-H2 params 화이트리스트 | aios-v1.schema.ts, command-registry.ts | 변경 없음 | 커맨드별 params 스키마 분리 |
| S-H3 에러 정보 노출 | command-registry.ts, approval-middleware.ts | 변경 없음 | 일반화된 에러 메시지 적용 |
| S-H4 aiosV1Url 노출 | analysis-service.ts, planning-service.ts, risk-service.ts | 변경 없음 | 응답에서 내부 URL 제거 |
| A-H1 이중 캐시 | approval-middleware.ts, aios-v1-action-service.ts | 변경 없음 | 싱글톤 액션 서비스에 통합 |
| A-H2 PUBLIC_ feature flag | feature-flag.ts | 변경 없음 | AIOS_V1_REAL_LOGIC 서버 변수로 변경 |
| Q-H2 not_found enum | analysis-service.ts, aios-v1.schema.ts | 변경 없음 | not_found를 enum에 추가 또는 별도 에러 스키마 정의 |
| O-H2 fallback 성공 응답 | aios-v1-action-service.ts, analysis-service.ts | 변경 없음 | degraded/warning 필드 추가 |
| R-H1 범외 명령어 노출 | command-registry.ts | 변경 없음 | allowlist 적용 |

### Medium (2주 내 조치)

| 이슈 | 파일 | 현재 상태 | 수정 계획 |
|------|------|-----------|-----------|
| S-M1 GET params 미검증 | analyze/route.ts, plan/route.ts, risk/route.ts | 변경 없음 | Zod safeParse 적용 |
| S-M2 인메모리 캐시 | aios-v1-action-service.ts, approval-middleware.ts | 변경 없음 | Redis 도입 (Phase 2) |
| A-M1 상태 누출 리스크 | 서비스 전역 | 변경 없음 | request-scope DI 또는 상태 불변성 보장 |
| A-M2 register 권한 제어 | command-registry.ts | 변경 없음 | protected 메서드 + 초기화 시 등록 |
| A-M3 select/omit 불일치 | aios-v1.schema.ts | 변경 없음 | select 패턴으로 통일 |
| A-M4 서비스 구조 중복 | analysis-service.ts, planning-service.ts, risk-service.ts | 변경 없음 | 제네릭 서비스 팩토리 도입 |
| Q-M1 중복 Zod 검증 | route + service | 변경 없음 | 검증 한 곳으로 일원화 |
| Q-M2 buildFallback .parse() | 서비스 | 변경 없음 | .safeParse() + 기본 에러 응답 |
| Q-M3 커맨드 화이트리스트 | aios-v1.schema.ts | 변경 없음 | 허용 command 목록 enum 적용 |
| O-M1 캐시 maxSize | aios-v1-action-service.ts, approval-middleware.ts | 변경 없음 | LRU 또는 배치 제거 |
| O-M2 ensureApprovedAction 전체 조회 | approval-gate.ts | 변경 없음 | getById 메서드 추가 |
| O-M3 타임아웃 하드코딩 | upstream-proxy.ts | 변경 없음 | API별 타임아웃 설정 적용 |

### Low (향후)

| 이슈 | 파일 | 수정 계획 |
|------|------|-----------|
| A-L1 command-registry 2.ts 삭제 | apps/web/src/lib/services/command-registry 2.ts | Step 8에서 삭제 |
| Q-L1 네이밍 불일치 | analysis-service.ts | 일관된 네이밍 컨벤션 적용 |
| O-L1 구조화 로깅 | upstream-proxy.ts | Winston/Pino 도입 |
| R-L1 한국어/영어 메시지 혼용 | 전체 | i18n 도입 (Phase 2) |

## 조치 순서

1. **S-C1, S-C2** → Step 8 첫번째 커밋
2. **S-H1, S-H2** → Step 8 두번째 커밋
3. **A-H1, A-H2** → Step 8 세번째 커밋
4. 나머지 Medium/Low → Step 8 이후 순차 적용

## Step 8 검증 체크

- [ ] `git diff`로 수정 파일 확인
- [ ]lint 통과
- [ ] 기존 244건 테스트 + 신규 GET 테스트 통과 유지
- [ ] `red-team-final-review.md` 재작성
