# Fix Summary — Phase B-5: 크로스 서비스 E2E + 프로덕션 배포 준비
**날짜**: 2026-06-14
**Phase**: Track B Phase B-5

---

## 변경 파일

| 파일 | 변경 유형 | 요약 |
|------|-----------|------|
| .github/workflows/ci.yml | 수정 | e2e/load/security job 추가, pnpm cache 통합 |
| .github/workflows/cd.yml | 수정 | build → deploy → health-check → notify → on-failure guardrail |
| apps/web/src/middleware.ts | 수정 | CSP, Rate Limiting 적용 |
| apps/web/next.config.js | 수정 | 보안 헤더 강화 |
| apps/web/src/app/api/ops/health/route.ts | 수정 | 헬스체크 로직 정교화 |
| apps/web/src/app/api/ops/health/stream/route.ts | 수정 | SSE stream/backpressure 가드 추가 |
| tests/e2e/*.spec.ts | 신규 | Playwright E2E 5+ 시나리오 |
| tests/load/k6-smoke.js | 신규 | k6 smoke 부하 테스트 |
| scripts/health-check.sh | 신규 | 6개 항목 헬스체크 스크립트 |
| docs/deployment/environment-setup.md | 신규 | 환경변수/시크릿 가이드 |

---

## Red Team 이슈 반영 상세

| ID | 이슈 | 파일 | 해결 방법 |
|----|------|------|----------|
| S1 | CSP script-src 'self' 누락 | next.config.js + middleware | 명시 CSP 헤더 적용 |
| S2 | GitHub Action 시크릿 노출 위험 | cd.yml | secrets 참조 단일화 |
| S3 | E2E 환경 의존성 | approval-workflow.spec.ts | vitest stub + Playwright mock 사용 |
| S4 | Playwright CI 캐시 미사용 | ci.yml | actions/cache 적용 |
| S5 | CD 헬스체크 타임아웃 정책 누락 | cd.yml | 재시도 3회/5초 간격 |
| Q1 | screenshot baseline 관리 | api-contract.spec.ts | PR artifact 가이드 제공 |
| Q2 | k6 threshold 미정 | k6-smoke.js | http_req_duration{max:X} 임계값 |
| O1 | health-check.sh exit 코드 | scripts/health-check.sh | 정확한 exit 코드 및 로그 형식 |
| O2 | SSE health streaming 백로그 | stream/route.ts | 동시 클라이언트 제한 추가 |
| R1 | CI coverage 게이트 미적용 | ci.yml | vitest coverageThreshold 적용 |

---

## 개선/보완

- E2E 시나리오: 홈/인증/대시보드/사이드바/Approval 5+ 시나리오
- 3개 크로스 서비스 E2E(Approval+Workflow, Health Monitoring, API Contract)
- 부하 테스트 smoke 시나리오
- git ops 준비 완료 (commit-log, push-result)

---

## 미해결 / 후속 TODO

- PR 머지 대기 상태 → main merge 예정
- 실제 환경(DB/Redis/LLM) 연동은 준비 완료, 검증은 후속 Phase
- 스크린샷 baseline 장기화 관리 필요
