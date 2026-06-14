# Phase Plan v1 — AIOS v1 핵심 API 실구현

> **Phase**: Phase A-1 AIOS v1 핵심 API 실구현  
> **작성일**: 2026-06-14  
> **상태**: Draft

---

## 1. 목표

AIOS v1 핵심 API 레이어(analyze, plan, risk)를 실제 코드로 구현한다.  
기존 계약(contract) 검증과 red team 기준을 충족한다.

## 2. 범위

### 포함
- `apps/web/src/app/api/analyze/route.ts` — GET/POST
- `apps/web/src/app/api/plan/route.ts` — GET/POST
- `apps/web/src/app/api/risk/risk/route.ts` — GET/POST
- `apps/web/src/app/api/commands/route.ts` — POST (executeCommand)
- `apps/web/src/lib/services/analysis-service.ts`
- `apps/web/src/lib/services/planning-service.ts`
- `apps/web/src/lib/services/risk-service.ts`
- `apps/web/src/lib/services/aios-v1-action-service.ts`
- `apps/web/src/lib/services/command-registry.ts`
- `apps/web/src/lib/integrations/approval-middleware.ts`
- `apps/web/src/lib/schemas/aios-v1.schema.ts`
- `apps/web/src/lib/integrations/upstream-proxy.ts`
- 관련 통합 테스트

### 제외
- `/api/customers`, `/api/partners`, `/api/workflows` (후속 Phase)
- 기능 플래그 대시보드
- 실 운영 환경 배포 파이프라인

## 3. 아키텍처 (v1 초안)

```
Request
 └─ API Route
     └─ Zod 스키마 검증
         └─ createGatedHandler (승인 게이트)
             └─ AiosV1ActionService.execute (멱등성)
                 ├─ CommandRegistry
                 └─ UpstreamProxy → AIOS v1 업스트림
                     └─ Redis 캐시 (향후)
```

## 4. 실행 계획 (Step 분해)

| Step | 설명 | 산출물 |
|------|------|--------|
| 0 | 환경 정비, 브랜치 생성 | dev/phase-a-1 |
| 1 | 계약(Contract) 정의 — 스키마 확정 | `aios-v1.schema.ts` |
| 2 | 서비스 레이어 스탠드업 — 인터페이스 확정 | service interfaces |
| 3 | 핵심 로직 구현 — 라우트/서비스/미들웨어 | 구현 PR |
| 4 | 단위 테스트 — 서비스/스키마 | 테스트 리포트 |
| 5 | 통합 테스트 — API 엔드포인트 | 테스트 리포트 |
| 6 | Red Team 검증 — 보안/아키/품질/운영/요구사항 | red-team-v1.md |
| 7 | Red Team 결과 반영 — 이슈 triage | fix 목록 |
| 8 | 리팩터링 — 이중 캐시 통합, 모니터링 추가 | 수정 코드 |
| 9 | 품질 재검증 — 최종 리뷰 | red-team-final.md |
| 10 | GitHub PR 오픈 + 리뷰 반영 | PR 머지 |
| 11 | 프로덕션 배포 롤아웃 (후속) | 배포 manifest |

## 5. 리스크

| 리스크 | 확률 | 영향 | 완화 방안 |
|--------|------|------|-----------|
| 인메모리 캐시 불일치 | 중 | 상 | Redis 도입 시기 명시 |
| GET 인증 누락 | 상 | 상 | 즉시 수정 + 리뷰 |
| 레거시 명령어 과다 노출 | 중 | 중 | 화이트리스트 적용 |

## 6. 성공 기준

- [ ] 구현된 모든 API가 스키마 검증 통과
- [ ] Red Team Critical 0건, High 5건 이하
- [ ] 통합 테스트 100% 통과 (sans-IO 제외)
- [ ] PR 리뷰 승인
