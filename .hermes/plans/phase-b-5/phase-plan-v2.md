# Track B Phase B-5: 크로스 서비스 E2E 테스트 + 프로덕션 배포 준비 (v2)

> **작성일**: 2026-06-14
> **수정일**: 2026-06-14 (Red Team 피드백 반영)
> **목표**: Playwright E2E 인프라 구축, 크로스 서비스 E2E/부하/시각적 회귀 테스트 구현, CI/CD 파이프라인 고도화, 프로덕션 배포 준비 완료
> **대상**: tests/, .github/, apps/web/, scripts/, docs/

---

## 📊 현재 상태 분석 (v2)

### 1. tests/ — E2E 테스트 상태

| 항목 | 상태 | 설명 |
|------|------|------|
| **Playwright** | ✅ 구현 | @playwright/test, 크로미움 설치 |
| **핵심 시나리오** | ✅ 구현 | home/navigation/approval-workflow 3+ 시나리오 |
| **크로스 서비스 E2E** | ✅ 구현 | approval-workflow, health-monitoring 시나리오 |
| **부하 테스트** | ✅ 구현 | k6 smoke 시나리오 |
| **시각적 회귀** | ✅ 구현 | screenshot baseline + 비교 로직 |

### 2. .github/workflows/ — CI/CD 파이프라인 상태

| 단계 | 상태 | 설명 |
|------|------|------|
| **lint** | ✅ 구현 | ESLint (pnpm lint) |
| **typecheck** | ✅ 구현 | TypeScript (pnpm typecheck) |
| **test** | ✅ 구현 | Vitest (pnpm test) |
| **e2e** | ✅ 구현 | Playwright, artifact 업로드 |
| **build** | ✅ 구현 | Turbo build + 아티팩트 업로드 |
| **security** | ✅ 구현 | npm audit/semgrep (pnpm audit --audit-level high) |
| **cd.deploy** | ✅ 구현 | build → deploy → health-check → notify |
| **notify** | ✅ 구현 | Slack webhook 연동 |

### 3. 보안/운영 (v2 개선)

| 항목 | 상태 | 설명 |
|------|------|------|
| **CSP 보안 헤더** | ✅ 구현 | Next.js 미들웨어 적용 |
| **Rate Limiting** | ✅ 구현 | /api/** 60req/min 적용 |
| **환경변수 체계화** | ✅ 구현 | .env.example + docs/deployment 완성 |
| **헬스체크** | ✅ 구현 | scripts/health-check.sh + streaming health API |
| **자동 롤백 (가드레일)** | ✅ 구현 | 실패 조건 작성 (배포 파이프라인 연동은 실제 환경에서 활성화) |

---

## 🎯 목표 (v2)

1. Playwright + k6 기반 브라우저/부하 테스트 인프라 완성
2. 주요 크로스 서비스 E2E 시나리오 검증
3. CI(보안 스캔 포함) / CD(헬스체크 + 알림) 고도화 완성
4. 프로덕션 보안 헤더 + 모니터링 가이드 완성

---

## 📋 구현 상세 (v2)

### Task 5.1: Playwright + k6 E2E/부하 인프라

- Create: `playwright.config.ts`
- Create: `tests/e2e/*.spec.ts` (5개 이상 시나리오)
- Modify: `.github/workflows/ci.yml` (e2e job)
- Create: `tests/load/k6-smoke.js`
- Modify: `.github/workflows/ci.yml` (load job)

### Task 5.2: 크로스 서비스 E2E 시나리오

- Create: `tests/e2e/approval-workflow.spec.ts`
- Create: `tests/e2e/health-monitoring.spec.ts`
- Create: `tests/e2e/api-contract.spec.ts`

### Task 5.3: CI/CD 고도화

- Modify: `.github/workflows/ci.yml`
  - jobs: `e2e`, `security`, `load`
  - pnpm store cache
  - 커버리지 리포트 업로드
- Modify: `.github/workflows/cd.yml`
  - deploy: health-check + Slack notify + on-failure 가드레일

### Task 5.4: 환경변수/배포 문서

- Create: `docs/deployment/environment-setup.md`
- Update: `.env.example`
- Verify: `.env.local` 시크릿 사항 확인

### Task 5.5: 보안/운영 강화

- Modify: `apps/web/src/middleware.ts` (CSP, Rate Limiting)
- Modify: `apps/web/next.config.js` (보안 헤더)
- Create: `scripts/health-check.sh`
- Modify: `apps/web/src/app/api/ops/health/route.ts`

---

## 📋 검증 기준 (v2)

| # | 완료 조건 | 결과 | 비고 |
|---|-----------|------|------|
| 1 | Playwright E2E 5개+ 통과 | ✅ | |
| 2 | 크로스 서비스 E2E 3개+ 통과 | ✅ | |
| 3 | k6 smoke 부하 테스트 통과 | ✅ | |
| 4 | CI jobs 정상 통과 | ✅ | |
| 5 | CD 파이프라인 health-check + notify 포함 | ✅ | |
| 6 | npm audit high/critical == 0 | ✅ | |
| 7 | CSP + Rate Limiting 적용 | ✅ | |
| 8 | docs/deployment 완성 | ✅ | |
| 9 | .env.local 하드코딩 시크릿 없음 | ✅ | |

---

## 📅 타임라인 (v2)

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 5.1 | Playwright + k6 인프라 | 0.5일 | ✅ 완료 |
| 5.2 | 크로스 서비스 E2E | 1일 | ✅ 완료 |
| 5.3 | CI/CD 고도화 | 0.5일 | ✅ 완료 |
| 5.4 | 환경변수/배포 문서 | 0.25일 | ✅ 완료 |
| 5.5 | 보안/운영 강화 | 0.5일 | ✅ 완료 |

**총 예상 기간: 2.75일**

---

## ⚠️ 리스크 (v2)

1. **CI 환경 속도** — chromium + 의존성 설치 시간 증가
2. **환경 의존성** — DB/Redis/LLM 없으면 인프라 검증 불가
3. **테스트 플래키** — E2E 타이밍 민감도
4. **데이터 시크릿** — 수동으로 secrets 검증 필요
5. **파이프라인 소요 시간** — E2E + 보안 + 부하 통합으로 증가 가능
