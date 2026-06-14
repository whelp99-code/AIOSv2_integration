# Phase Plan v2 — PHASE-B-3

> **기반**: `phase-plan-v1.md`  
> **변경사유**: Step 0-1 리뷰/실제 구현 데이터 반영  
> **날짜**: 2026-06-14  
> **상태**: Approved

---

## 1. 목표 (업데이트)

### 1.1 도메인 레이어
- Zod 스키마를 기반으로 IVO(Immutable Value Object)를 구성
- 엔티티 위치: `packages/domain/{mail,workflow,coding,sangfor}/src/`
- 공통: `EmailVO`, `Severity`, `Money` 등 모듈 재사용 가능한 VO는 `packages/domain/common`에 배치

### 1.2 애플리케이션 레이어
- `packages/application/*/src/*.service.ts`에 UseCase 중심 서비스 구현
- `AppError` 기반 도메인 예외 계층 통일
- 비동기 흐름, 트랜잭션, LLM 호출 처리 로직 포함

### 1.3 API Layer
- tRPC v10 기준 라우터 정의
- Express 미들웨어: 토큰 검증, 리소스 권한 확인, 요청 로깅, 헬스체크
- 입력은 Zod, 출력은 타입 안전성 유지

---

## 2. 변경된 범위

| 구분 | B-3 v1 | B-3 v2 |
|------|--------|--------|
| DI 컨테이너 | tsyringe 도입 예정 | 직접 DI (수동) — 미니멀 |
| Auth 헤더 | JWT | Bearer 토큰 + 간단 JWT (의사 구현) |
| Stats | 별도 집계 API | DB 레벨 COUNT 쿼리로 대체 |
| 테스트 | 204건 | 정의된 UseCase 중심 60-80건 + 통합 10건 |

---

## 3. 산출물 상세 스펙

### 3.1 도메인
- `entities.ts`: `MailMessage`, `Workflow`, `CodeReview` 등
- `value-objects.ts`: `Email`, `Severity`
- `schemas.ts`: Zod 입력/출력 스키마
- `errors.ts`: `DomainError` 하위 타입 (NotFound, AlreadyExists, InvalidState)

### 3.2 애플리케이션
- `*Service` 인터페이스: `registerMailUseCase`, `executeWorkflowUseCase`
- Repository 인터페이스 준수 (`B-2`에서 정의)
- LLM 응답 Zod 검증 추가

### 3.3 API
- `routers/mail.router.ts`, `workflow.router.ts`, `coding.router.ts`
- 미들웨어: `auth.ts`, `logging.ts`

### 3.4 운영
- `src/index.ts` 헬스체크, graceful shutdown 기본형 적용
- pino 기반 구조화 로깅

---

## 4. 일정

- Step 4~7: 코드 구현
- Step 8: 테스트
- Step 9: 정리
- Step 10~11: 리뷰, 보고

---

## 5. 합의 의사결정

- Auth: JWT 간단 구현 (Base64), 추후 SSO 연동은 추후 단계로 분리
- ID: `crypto.randomUUID()` 도입 (Date.now() 제거)
- Rate Limit: in-memory 유지하되 Redis 도입 준비 코드는 주석 아웃
