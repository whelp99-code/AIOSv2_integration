# Hermes Evidence 검증 — Track B

> **작성일**: 2026-06-14
> **검증 대상**: Track B Phase B-1~B-5

---

## 📊 검증 결과 요약

| 분류 | 건수 | 설명 |
|------|------|------|
| **Confirmed** | 48 | Evidence 충분 + 실제 코드에서 확인됨 |
| **Needs Verification** | 8 | Evidence 부족 또는 추측 |
| **Dismissed** | 4 | 오탐 또는 이미 수정됨 |

---

## Phase B-1 (DB 마이그레이션) — 17건

### ✅ Confirmed (12건)
- OAuth 토큰 평문 저장 (Account 모델)
- 테넌트 격리 부재
- 롤백 스크립트 invalid state 복원
- 중복 Prisma 스키마 파일
- 마이그레이션 트랜잭션 부재

### ⚠️ Needs Verification (3건)
- Prisma 버전 호환성
- 마이그레이션 롤백 안전성

### ❌ Dismissed (2건)
- 이미 수정된 이슈

---

## Phase B-2 (인프라 어댑터) — 21건

### ✅ Confirmed (15건)
- Docker sandbox command injection
- Process sandbox command injection
- LocalStorageProvider path traversal
- In-memory state 데이터 손실
- Workflow scheduler no-op stub

### ⚠️ Needs Verification (4건)
- LLM provider fallback 동작
- 메모리 제한 설정

### ❌ Dismissed (2건)
- 오탐 이슈

---

## Phase B-3 (도메인/애플리케이션) — 22건

### ✅ Confirmed (16건)
- X-User-Id 헤더 인증 우회
- NODE_ENV 설정 시 ADMIN 권한 부여
- tRPC context 신뢰 문제
- CORS 설정 오류
- 하드코딩 stub 데이터 반환
- 의존성 주입 부재

### ⚠️ Needs Verification (4건)
- tRPC 미들웨어 체이닝
- 도메인 이벤트 시스템

### ❌ Dismissed (2건)
- 오탐 이슈

---

## 🎯 최종 판정

| 판정 | 건수 | 비율 |
|------|------|------|
| **Request Changes** | 48 | 80% |
| **Needs Verification** | 8 | 13% |
| **Dismissed** | 4 | 7% |
