# Track B Phase B-5: 크로스 서비스 E2E 테스트 + 프로덕션 배포 준비

> **작성일**: 2026-06-14
> **목표**: 크로스 서비스 E2E 테스트 구현, CI/CD 파이프라인 고도화, 프로덕션 배포 준비
> **대상**: tests/, .github/, apps/web/, scripts/

---

## 📊 현재 상태 분석

### 1. tests/ — E2E 테스트 상태

| 항목 | 상태 | 설명 |
|------|------|------|
| **테스트 프레임워크** | ✅ 구현 | Vitest 3 (node 환경) |
| **설정** | ✅ 구현 | vitest.config.ts (v8 coverage, tests/** include) |
| **단위 테스트** | ✅ 다수 | 15개 파일 (domain-services, command-registry, contract-tests, feature-flag 등) |
| **통합 테스트** | ✅ 구현 | integration.test.ts (Approval, Collaboration, Health, Gated proxy) |
| **E2E 테스트 (브라우저)** | ❌ 없음 | Playwright 미설정, 브라우저 기반 E2E 없음 |
| **크로스 서비스 E2E** | ❌ 없음 | 서비스 간 통합 흐름 검증 없음 |
| **부하 테스트** | ❌ 없음 | k6/artillery 등 부하 테스트 없음 |
| **시각적 회귀 테스트** | ❌ 없음 | 스크린샷 비교 테스트 없음 |

#### 기존 테스트 상세

| 파일 | 유형 | 테스트 수 | 검증 대상 |
|------|------|-----------|-----------|
| `tests/basic.test.ts` | 단위 | 3 | 기본 구조 (placeholder) |
| `tests/integration.test.ts` | 통합 | 8 | Collaboration, Approval, Health, Gated proxy, UI route |
| `tests/approval-gate.test.ts` | 단위 | 4 | Approval gate pending/approve/reject/dev-bypass |
| `tests/phase5-smoke.test.ts` | 스모크 | - | Phase 5 검증 |
| `tests/unit/domain-services.test.ts` | 단위 | 다수 | AnalysisService, PlanningService, RiskService |
| `tests/unit/command-registry.test.ts` | 단위 | - | Command registry |
| `tests/unit/contract-tests.test.ts` | 단위 | - | API contract |
| `tests/unit/feature-flag.test.ts` | 단위 | - | Feature flag |
| `tests/unit/boundary-values.test.ts` | 단위 | - | 경계값 검증 |
| `tests/unit/aios-v1-*.test.ts` | 단위 | - | AIOS v1 스키마, 액션 서비스 |
| `tests/unit/approval-idempotency.test.ts` | 단위 | - | Approval 멱등성 |
| `tests/unit/infrastructure-*.test.ts` | 단위 | 5 | MCP, Memory, Monitoring, Sandbox, Storage |

---

### 2. .github/workflows/ — CI/CD 파이프라인 상태

#### ci.yml

```yaml
jobs:
  lint → typecheck → test → build
```

| 단계 | 상태 | 설명 |
|------|------|------|
| **lint** | ✅ 구현 | ESLint (pnpm lint) |
| **typecheck** | ✅ 구현 | TypeScript (pnpm typecheck) |
| **test** | ✅ 구현 | Vitest (pnpm test) |
| **build** | ✅ 구현 | Turbo build + 아티팩트 업로드 |
| **E2E 테스트** | ❌ 없음 | 브라우저 E2E 파이프라인 없음 |
| **보안 스캔** | ❌ 없음 | npm audit/Snyk 등 없음 |
| **커버리지 리포트** | ❌ 없음 | 커버리지 게이트/리포트 없음 |
| **캐싱** | ❌ 없음 | pnpm store 캐시 미적용 |

#### cd.yml

```yaml
jobs:
  deploy (placeholder echo만 있음)
```

| 단계 | 상태 | 설명 |
|------|------|------|
| **트리거** | ✅ 구현 | main push + apps/**, packages/** 경로 변경 |
| **빌드** | ✅ 구현 | pnpm build (NODE_ENV=production) |
| **배포** | ⚠️ placeholder | echo만 출력, 실제 배포 없음 |
| **알림** | ⚠️ placeholder | echo만 출력, Slack/Discord 연동 없음 |
| **롤백** | ❌ 없음 | 자동 롤백 메커니즘 없음 |
| **헬스체크** | ❌ 없음 | 배포 후 헬스체크 없음 |
| **스테이징** | ❌ 없음 | 스테이징 환경 없음 |

---

### 3. 크로스 서비스 통합 분석

#### 서비스 간 의존성

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  apps/web   │────▶│  API Server  │────▶│  PostgreSQL   │
│  (Next.js)  │     │  (Express)   │     │  (Prisma)     │
└──────┬──────┘     └──────┬───────┘     └───────────────┘
       │                   │
       │                   ▼
       │           ┌──────────────┐
       │           │  LLM Services│
       │           │  (OpenAI/    │
       │           │   Anthropic) │
       │           └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  Plugins     │────▶│  Plugin Core │
│  (mail 등)   │     │  (registry)  │
└──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  Upstream    │────▶│  External    │
│  Proxies     │     │  Services    │
│  (Sangfor,   │     │  (F-aios-v3, │
│   Vibe, etc) │     │   v1 등)     │
└──────────────┘     └──────────────┘
```

#### 크로스 서비스 E2E 시나리오 (미구현)

1. **Approval Flow E2E**: 웹 UI → API → Approval → Resume
2. **Workflow Execution E2E**: 웹 UI → Workflow API → Sangfor Upstream → 결과 반환
3. **Collaboration E2E**: 웹 UI → Collaboration API → Agent 실행 → Handoff → 결과
4. **Mail Intelligence E2E**: 웹 UI → Mail Plugin → LLM 분석 → 결과 표시
5. **Health Monitoring E2E**: Ops Console → Health API → 각 서비스 상태 → UI 표시

---

## 🎯 Phase B-5 목표

### 1차 목표: Playwright E2E 테스트 인프라
- Playwright 설치 및 설정
- 핵심 사용자 시나리오 E2E 테스트 작성
- CI 파이프라인에 E2E 테스트 통합

### 2차 목표: 크로스 서비스 E2E 테스트
- 서비스 간 통합 흐름 검증
- Approval → Collaboration → Agent 실행 시나리오
- Health Monitoring 시나리오

### 3차 목표: 프로덕션 배포 준비
- CD 파이프라인 실제 배포 로직 구현
- 환경변수/시크릿 관리
- 헬스체크 + 자동 롤백
- 보안 스캔 통합

---

## 📋 구현 상세

### Task 5.1: Playwright E2E 테스트 인프라

**Objective:** 브라우저 기반 E2E 테스트 환경 구축

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/` 디렉토리
- Modify: `package.json` (e2e 스크립트 추가)
- Modify: `.github/workflows/ci.yml` (E2E job 추가)

**Setup:**
```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

**playwright.config.ts:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3110',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    port: 3110,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Status:** ⏸️ 대기

---

### Task 5.2: 핵심 E2E 테스트 시나리오

**Objective:** 사용자 시나리오 기반 E2E 테스트

**Files:**
- Create: `tests/e2e/home.spec.ts`
- Create: `tests/e2e/navigation.spec.ts`
- Create: `tests/e2e/collaboration.spec.ts`
- Create: `tests/e2e/workflows.spec.ts`
- Create: `tests/e2e/approval-flow.spec.ts`

**시나리오 상세:**

#### 5.2.1 home.spec.ts
```
- 홈 페이지 로드
- "Sign In" 버튼 클릭 → /auth/signin 이동
- "Dashboard" 버튼 클릭 → /dashboard 이동
```

#### 5.2.2 navigation.spec.ts
```
- Sidebar 네비게이션 링크 클릭 → 각 페이지 이동
- 활성 링크 하이라이트 확인
- Header 표시 확인
```

#### 5.2.3 collaboration.spec.ts
```
- Collaboration 페이지 로드
- 세션 목록 표시 확인
- "Cursor 실행" 버튼 클릭 → API 호출 확인
- Approval 요청 → 승인/반려 UI 확인
```

#### 5.2.4 workflows.spec.ts
```
- Workflows 페이지 로드
- 워크플로우 목록 표시
- 새 워크플로우 생성 모달
- 상태 필터 동작
```

#### 5.2.5 approval-flow.spec.ts
```
- Collaboration에서 approval 요청
- Approvals API 응답 확인
- 승인 후 assignment 상태 변경 확인
- 반려 시 차단 확인
```

**Status:** ⏸️ 대기

---

### Task 5.3: 크로스 서비스 E2E 테스트

**Objective:** 서비스 간 통합 흐름 검증

**Files:**
- Create: `tests/e2e/cross-service/approval-workflow.spec.ts`
- Create: `tests/e2e/cross-service/health-monitoring.spec.ts`
- Create: `tests/e2e/cross-service/api-contract.spec.ts`

**시나리오 상세:**

#### 5.3.1 approval-workflow.spec.ts
```
1. Collaboration 세션 생성
2. Approval 필요한 assignment 실행
3. 409 Pending 응답 확인
4. Approval API로 승인
5. Assignment 재개 → 성공 확인
6. UI에서 상태 변경 확인
```

#### 5.3.2 health-monitoring.spec.ts
```
1. Ops Console 페이지 접속
2. /api/integrations/health 호출
3. 각 프로젝트 상태 확인 (aios-v1, f-aios-v3, sangfor, vibe, jarvis)
4. degraded 상태 UI 표시 확인
5. 개별 서비스 health endpoint 확인
```

#### 5.3.3 api-contract.spec.ts
```
1. 모든 API 엔드포인트 응답 스키마 검증
2. 에러 응답 형식 일관성 확인
3. 상태 코드 일관성 확인
4. Content-Type 헤더 확인
```

**Status:** ⏸️ 대기

---

### Task 5.4: CI/CD 파이프라인 고도화

**Objective:** CI 파이프라인에 E2E 통합, CD 파이프라인 실배포

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/cd.yml`

#### ci.yml 수정

```yaml
# 추가할 job:
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
    - run: pnpm install --frozen-lockfile
    - run: npx playwright install chromium --with-deps
    - run: pnpm build
    - run: pnpm test:e2e
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/

security:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: pnpm audit --audit-level high
```

#### cd.yml 수정

```yaml
# 수정할 내용:
deploy:
  steps:
    # ... 기존 빌드 후:
    - name: Health Check
      run: |
        # 배포 후 헬스체크
        for i in $(seq 1 10); do
          curl -f ${{ secrets.DEPLOY_URL }}/api/ops/health/check && break
          sleep 5
        done

    - name: Rollback on Failure
      if: failure()
      run: |
        echo "롤백 실행..."
        # 이전 버전으로 롤백

notify-slack:
  name: Notify Slack
  needs: [deploy]
  if: always()
  steps:
    - uses: slackapi/slack-github-action@v2
      with:
        webhook: ${{ secrets.SLACK_WEBHOOK }}
        message: "배포 ${{ needs.deploy.result }}: ${{ github.sha }}"
```

**Status:** ⏸️ 대기

---

### Task 5.5: 환경변수/시크릿 관리

**Objective:** 프로덕션 환경변수 체계화

**Files:**
- Create: `.env.example` 업데이트
- Create: `docs/deployment/environment-setup.md`
- Modify: `.env.local` (시크릿 제거 확인)

**환경변수 목록:**
```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# LLM
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Upstream Services
AIOS_V1_URL=...
FAISOS_V3_URL=...
SANGFOR_MCP_URL=...
VIBE_CODING_URL=...

# Plugin
PLUGIN_DIR=./plugins

# Monitoring
LANGFUSE_SECRET_KEY=...
LANGFUSE_PUBLIC_KEY=...

# Redis
REDIS_URL=...
```

**Status:** ⏸️ 대기

---

### Task 5.6: 헬스체크 + 모니터링 강화

**Objective:** 프로덕션 모니터링 체계

**Files:**
- Modify: `apps/web/src/app/api/ops/health/route.ts`
- Modify: `apps/web/src/app/api/ops/health/stream/route.ts`
- Create: `scripts/health-check.sh`

**헬스체크 항목:**
1. PostgreSQL 연결 상태
2. Redis 연결 상태
3. LLM API 접근 가능 여부
4. 각 업스트림 서비스 상태
5. 메모리/CPU 사용량
6. 디스크 사용량

**Status:** ⏸️ 대기

---

### Task 5.7: 보안 강화 (프로덕션)

**Objective:** 프로덕션 보안 요구사항 충족

**Files:**
- Modify: `apps/web/next.config.js` (CSP, 보안 헤더)
- Create: `apps/web/src/middleware.ts` (Rate limiting, 인증 강화)
- Modify: `.github/workflows/ci.yml` (보안 스캔 job)

**보안 항목:**
1. Content-Security-Policy 헤더
2. Rate Limiting (API 엔드포인트)
3. CORS 정책 설정
4. 인증 토큰 만료/갱신
5. SQL Injection 방지 (Prisma 기본)
6. XSS 방지 (React 기본)
7. npm audit 통과

**Status:** ⏸️ 대기

---

## 📋 검증 기준

### ✅ 완료 조건

1. **Playwright E2E**
   - 5개 이상 E2E 테스트 통과
   - CI 파이프라인에서 실행 가능

2. **크로스 서비스 E2E**
   - Approval flow E2E 통과
   - Health monitoring E2E 통과
   - API contract 검증 통과

3. **CI/CD 파이프라인**
   - CI: lint → typecheck → test → E2E → build
   - CD: build → deploy → health-check → notify
   - 보안 스캔 통합

4. **환경변수/시크릿**
   - .env.example 완성
   - .env.local에 하드코딩 시크릿 없음
   - 배포 문서 완성

5. **보안**
   - npm audit high/critical 0건
   - CSP 헤더 적용
   - Rate limiting 적용

---

## 📅 타임라인

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 5.1 | Playwright E2E 인프라 | 0.5일 | ⏸️ 대기 |
| 5.2 | 핵심 E2E 시나리오 | 1일 | ⏸️ 대기 |
| 5.3 | 크로스 서비스 E2E | 1일 | ⏸️ 대기 |
| 5.4 | CI/CD 파이프라인 고도화 | 0.5일 | ⏸️ 대기 |
| 5.5 | 환경변수/시크릿 관리 | 0.25일 | ⏸️ 대기 |
| 5.6 | 헬스체크 + 모니터링 | 0.5일 | ⏸️ 대기 |
| 5.7 | 보안 강화 | 0.5일 | ⏸️ 대기 |

**총 예상 기간: 4.25일**

---

## ⚠️ 리스크

1. **Playwright CI 환경** — headless Chromium 설치 시간/안정성
2. **외부 서비스 의존성** — 업스트림 서비스 미실행 시 E2E 실패
3. **배포 환경 미확정** — 실제 배포 대상 (Vercel, Docker, K8s 등) 미정
4. **시크릿 관리** — GitHub Secrets 설정 필요
5. **E2E 테스트 안정성** — 타이밍 이슈, 플래키 테스트 가능성
6. **보안 스캔 false positive** — npm audit 경고 처리 시간 소요
7. **Next.js 16 빌드 시간** — CI 파이프라인 시간 증가 가능

---

## 📊 배포 아키텍처 옵션

### Option A: Vercel (권장 — Next.js 최적화)
- 장점: Zero-config, ISR/SSR 자동, Edge Functions
- 단점: 비용, 제한된 커스터마이징

### Option B: Docker + Cloud Run
- 장점: 유연성, 비용 효율
- 단점: Dockerfile 작성, 인프라 관리

### Option C: AWS (EC2/ECS)
- 장점: 완전한 제어
- 단점: 복잡성, 관리 부담

---

## 🎯 성공 기준

1. ✅ Playwright E2E 테스트 5개 이상 통과
2. ✅ 크로스 서비스 E2E 시나리오 3개 이상 통과
3. ✅ CI 파이프라인: lint → typecheck → test → E2E → build
4. ✅ CD 파이프라인: build → deploy → health-check → notify
5. ✅ .env.example 완성, 하드코딩 시크릿 제거
6. ✅ npm audit high/critical 0건
7. ✅ `pnpm test` + `pnpm test:e2e` 전체 통과
8. ✅ `pnpm build` 프로덕션 빌드 성공
