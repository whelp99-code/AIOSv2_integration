# Fix Summary — Phase B-3

> 작성일: 2026-06-14  
> Phase: B-3 도메인/애플리케이션/API 레이어 완성  
> 근거: `red-team-review-v1.md`

## 개요

Red Team 초기 리뷰 22건(CRITICAL 4, HIGH 13, MEDIUM 4, LOW 1) 중 우선순위에 따라 핵심 6개 항목 수정 완료. 기타 미달성 항목은 후속 단계에서 처리.

---

## 수정 항목

### [CRITICAL] S1 — 헤더 스푸핑 기반 인증 우회 (완료)
- 변경 파일: `apps/api/src/middleware/auth.ts`
- 작업: 클라이언트에서 제공하는 `X-UserId`/`X-User-Email` 직접 사용을 제거하고 Bearer 기반 JWT 토큰 검증 도입.
- 영향: `/api`, `/trpc` 라우터에서 사용자 측정 가능.

### [CRITICAL] S2 — 개발 모드 ADMIN 자동 부여 (완료)
- 변경 파일: `apps/api/src/middleware/auth.ts`
- 작업: `NODE_ENV=development` 분기 제거. `AUTH_DISABLED` 환경 변수로 제어하며 기본 false.

### [CRITICAL] S3 — tRPC 컨텍스트 신뢰 (완료)
- 변경 파일: `apps/api/src/context/index.ts`
- 작업: Express 미들웨어에서 검증된 사용자 정보를 컨텍스트에 주입.

### [CRITICAL] S4 — CORS misconfig 보호
- 변경 파일: `apps/api/src/index.ts`
- 작업: `CORS_ORIGIN`에 대해 시작 시 검증 로직 추가. `*`가 credentials=true와 함께 사용되는 경우 서버 시작 차단.

### [HIGH] A1 — 스텁 응답 제거
- 변경 파일: `apps/api/src/routers/mail.router.ts`, `workflow.router.ts`, `coding.router.ts`
- 작업: `protectedProcedure` 내에서 리포지토리/서비스 호출로 실제 CRUD 처리.
- 영향: use-case 수준의 행위로 전환.

### [HIGH] Q1 — LLM JSON 검증
- 변경 파일: `packages/application/mail/src/mail.service.ts`, `packages/application/coding/src/coding.service.ts`
- 작업: JSON.parse 결과를 각 도메인 스키마로 `parse()` 검증.

---

## 미적용 항목 (후속 단계)

| ID | 이유 | 예정 |
|----|------|------|
| S5 | 권한 검증(소유자) 정책 | B-4 |
| S6 | Request body size 정책 조정 | B-4 |
| A2 | tsyringe → 요구사항 단순화로 수동 DI 유지 | 유지 |
| Q2, O1 등 | 공통 개선은 운영 이슈로 별도 트랙 | 별도 |