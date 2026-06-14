# Fix Summary — Phase A-2

**Date:** 2026-06-14
**Phase:** Track A Phase A-2 — Sangfor MCP Operator Console API 계약 확정

---

## 🔒 보안 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| S1 | src/middleware/auth.ts | API 키 하드코딩 폴백 | 환경변수 미설정 시 서버 기동 거부 (fail-fast) |
| S2 | src/server.ts | 인증 미들웨어 미적용 | Health Check API에 apiKeyAuth 적용 |
| S3 | src/routes/health.routes.ts | 입력 검증 부재 | Zod schema (CheckSchema)로 deviceIds 배열 검증 추가 |
| S4 | src/routes/health.routes.ts | 에러 응답 불일관 | 표준 에러 응답 형식 적용 |

---

## 🏗️ 아키텍처 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| A1 | src/routes/health.routes.ts | server.ts에 라우트 하드코딩 | Express Router 분리 |
| A2 | src/routes/index.ts | 라우트 관리 중앙화 없음 | Barrel export로 라우트 통합 관리 |

---

## 🧪 품질 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| Q1 | src/routes/health.routes.ts | deviceIds undefined 시 500 | try/catch + 400/404 명시적 처리 |
| Q2 | src/routes/health.routes.ts | ZodError 시 응답 형식 불일관 | `{ error: 'Invalid input', details: error.errors }` 표준화 |

---

## ⚙️ 운영 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| O1 | src/middleware/auth.ts | 타이밍 공격 취약 | timingSafeEqual 적용 |

---

## 📋 요구사항 수정

| ID | 파일 | 문제 | 수정 내용 |
|----|------|------|----------|
| R1 | docs/openapi-health.yaml | OpenAPI 스펙 불완전 | Health Check API 3개 엔드포인트 + 스키마 정의 |
| R2 | src/routes/health.routes.ts | 기존 health-checker 패키지 무시 | 래핑 설계는 하였으나, 구현은 모킹 데이터 기반 |
| R3 | src/middleware/auth.ts | 공개/보호 엔드포인트 혼재 | 시스템 헬스체크 인증 제외 명시 |

---

## 🎯 수정 확인 방법

```bash
# 통합 테스트 실행
pnpm test

# 타입체크
pnpm typecheck

# 린트
pnpm lint
```
