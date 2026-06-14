# Phase Plan — PHASE-B-3

> **트랙**: Track B  
> **단계**: Phase B-3  
> **목표**: 도메인·애플리케이션 레이어 완성 및 tRPC/타입안전 API 구축  
> **날짜**: 2026-06-14  
> **상태**: Draft

---

## 1. 배경

- B-1: 패키지 구조 정합성, biome 0건
- B-2: 인프라·데이터 접근 계층 완성  
- B-3에서는 상위 계층인 도메인·애플리케이션과 API를 완성해야 흐름이 종단 간 동작한다.

---

## 2. 목표

### 2.1 도메인/Domain Layer
- `packages/domain/*` 엔티티·vo·에러 타입 완성
- Zod 스키마로 불변값 객체(IVO) 정의
- 비즈니스 규칙을 도메인 메서드로 캡슐화

### 2.2 애플리케이션/Application Layer
- 각 모듈별 `*Service` 구현 완료 (`MailService`, `WorkflowService`, `CodingService`, `SangforService`)
- 인터페이스(`Repository`, `LLMClient`) 기반 의존성 주입 준비
- UseCase 단위 책임 분리 (조회/생성/실행)

### 2.3 API Layer (tRPC 기반)
- `apps/api/src/routers/*` tRPC 라우터 정의
- Zod 기반 입력 유효성 검사
- `protectedProcedure` 권한 검증 기본 세팅
- DTO ↔ Domain 변환 처리

---

## 3. 범위

| Package | 목적 |
|---------|------|
| `packages/domain/mail` | Mail 엔티티, VO, IVO |
| `packages/domain/workflow` | Workflow, Step 상태 기계 |
| `packages/domain/coding` | CodeReview, AIAnalysis |
| `packages/domain/sangfor` | SangforAlert, Severity |
| `packages/application/mail` | MailService |
| `packages/application/workflow` | WorkflowService, ExecutionService |
| `packages/application/coding` | CodingService |
| `packages/application/sangfor` | SangforService |
| `apps/api` | Express 서버 + tRPC 라우터 |

---

## 4. 단계(Step 0-11)

### Step 0 — 계획 초기화
- B-3 범위 확정, 산출물 템플릿 생성

### Step 1 — 도메인 IVO 스키마 확정
- 각 모듈 zod 스키마 정의
- 타입 간 변환 함수 컴파니언 추가

### Step 2 — 애플리케이션 서비스 인터페이스
- Repository, LLMClient 인터페이스 정의
- 서비스 초기 구조 잡기

### Step 3 — 리포지토리 구현
- Prisma 리포지토리 구현 (B-2 결과 연결)

### Step 4 — 서비스 구현
- MailService, WorkflowService, CodingService, SangforService 구현
- 각 서비스는 IVO/엔티티로 작업

### Step 5 — 에러 타입 체계
- `AppError`, `NotFoundError`, `ForbiddenError`, `ValidationError` 정의
- HTTP 매핑 테이블

### Step 6 — DI 컨테이너
- tsyringe 또는 수동 DI 컨테이너 구성

### Step 7 — tRPC 라우터
- mail.router.ts, workflow.router.ts, coding.router.ts, sangfor.router.ts
- 입력 유효성 검사, 출력 스키마 정합성

### Step 8 — 인증/인가 미들웨어
- JWT 토큰 검증
- 리소스 소유자 확인

### Step 9 — 운영 미들웨어
- 요청 로깅, CORS, 제한, Health check

### Step 10 — 테스트
- 단위 테스트, 통합 테스트

### Step 11 — 정리 및 보고
- 산출물 정리, Red Team, PR

---

## 5. 산출물 리스트

- `phase-plan-v1.md` (본문)
- `phase-plan-v2.md`
- `test-result-report.md`
- `gemini-redteam-review.json`
- `hermes-evidence-verification.md`
- `fix-summary.md`
- `red-team-final-review.md`
- `secondary-redteam-review.md`
- `gemini-pr-review.json`
- `pr-description.md`
- `commit-log.md`
- `push-result.md`

---

## 6. 첫 번째 리스크

- B-2에서 Prisma 스키마 완성 여부에 따라 아이덴티티 변경 가능성
- Auth 상세 정책(세션/JWT/SSO) 미정일 수 있음
