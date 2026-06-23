# 재계획서: 레드팀 검증 반영

## 변경 이력
- 원본: 계획서 3건 (실서비스 런칭, 고도화, 인프라)
- 변경 사유: 레드팀 검증에서 P0 이슈 3건 발견
- 변경 일시: 2026-06-23

---

## P0 이슈 수정 사항

### 1. 웹훅 갱신 스케줄러 추가

**원본 계획**: Graph API 웹훅 구독 (3일마다 갱신 필요 언급만)
**수정 계획**: 웹훅 갱신 스케줄러 구현

**구현 상세**:
```typescript
// packages/api/src/webhooks/graph-renewal.ts
import { CronJob } from 'cron';

// 3일마다 웹훅 갱신
const renewalJob = new CronJob('0 0 */3 * *', async () => {
  console.log('[Webhook] Renewing Graph API webhook subscription');
  await renewWebhookSubscription();
});

renewalJob.start();
```

**추가 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| 웹훅 갱신 스케줄러 | `packages/api/src/webhooks/graph-renewal.ts` | 2시간 |
| 갱신 실패 알림 | Telegram 알림 연동 | 1시간 |

---

### 2. LLM 비용 한계 설정

**원본 계획**: FreeLLMAPI 기본, Claude 미분류, LM Studio 캐시
**수정 계획**: 일일/월 호출 제한 설정

**비용 한계**:
| 프로바이더 | 일일 제한 | 월 예산 | 폴백 전략 |
|-----------|----------|--------|----------|
| FreeLLMAPI | 100건 | 무료 | LM Studio로 폴백 |
| Claude (SynteroLink) | 50건 | 5만원 | FreeLLMAPI로 폴백 |
| LM Studio | 무제한 | 무료 (로컬) | - |

**구현 상세**:
```typescript
// packages/persona/src/mail/llm-limiter.ts
interface LLMUsageLimit {
  provider: string;
  dailyLimit: number;
  monthlyBudget: number;
  currentDaily: number;
  currentMonthly: number;
}

const limits: LLMUsageLimit[] = [
  { provider: 'freellmapi', dailyLimit: 100, monthlyBudget: 0, currentDaily: 0, currentMonthly: 0 },
  { provider: 'claude', dailyLimit: 50, monthlyBudget: 50000, currentDaily: 0, currentMonthly: 0 },
  { provider: 'lmstudio', dailyLimit: Infinity, monthlyBudget: 0, currentDaily: 0, currentMonthly: 0 },
];

export function canUseLLM(provider: string): boolean {
  const limit = limits.find(l => l.provider === provider);
  if (!limit) return false;
  return limit.currentDaily < limit.dailyLimit && limit.currentMonthly < limit.monthlyBudget;
}
```

**추가 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| LLM 사용량 제한기 | `packages/persona/src/mail/llm-limiter.ts` | 2시간 |
| 사용량 모니터링 | Telegram 알림 연동 | 1시간 |

---

### 3. Mac Mini 리소스 검증

**원본 계획**: Mac Mini M1/M2 Pro, 32GB RAM으로 전체 시스템 실행
**수정 계획**: 리소스 모니터링 및 최적화

**예상 리소스 사용량**:
| 서비스 | CPU | RAM | 디스크 |
|--------|-----|-----|--------|
| PostgreSQL | 10% | 2GB | 10GB |
| Redis | 5% | 1GB | 1GB |
| API 서버 | 20% | 2GB | 1GB |
| Web 서버 | 10% | 1GB | 500MB |
| 모니터링 | 10% | 1GB | 5GB |
| **합계** | **55%** | **7GB** | **17.5GB** |

**검증 방법**:
1. Docker Compose로 전체 시스템 기동
2. `docker stats`로 리소스 사용량 모니터링
3. 부하 테스트 (100건 메일 처리)

**추가 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| 리소스 모니터링 스크립트 | `scripts/monitor-resources.sh` | 1시간 |
| 부하 테스트 스크립트 | `tests/load/load-test.ts` | 2시간 |

---

## 수정된 타임라인

### Week 1: 실서비스 런칭 (수정)

| Day | 작업 | 산출물 |
|-----|------|--------|
| 1 | Azure AD 앱 등록 + Graph API OAuth | Client ID, Secret |
| 2 | **웹훅 갱신 스케줄러 구현** | `graph-renewal.ts` |
| 3 | Outlook Webhook 엔드포인트 | `outlook-webhook.ts` |
| 4 | CEO 브리핑 API + 대시보드 | `briefing/page.tsx` |
| 5 | **리소스 검증 + Docker Compose** | 헬스체크 통과 |

### Week 2: 고도화 (수정)

| Day | 작업 | 산출물 |
|-----|------|--------|
| 1-2 | **LLM 비용 한계 설정** | `llm-limiter.ts` |
| 3-4 | LLM 분류기 구현 | `hybrid-classifier.ts` |
| 5 | 벤치마크 데이터셋 구성 | 100건 라벨링 |

### Week 3-4: 인프라 (수정 없음)

기존 계획 유지.

---

## 검증 체크리스트 (추가)

### P0 이슈 검증
- [ ] 웹훅 갱신 스케줄러가 3일마다 실행됨
- [ ] LLM 일일 호출 제한이 초과 시 폴백 동작
- [ ] Mac Mini 리소스 사용량이 80% 이하

### 기존 검증 체크리스트
- [ ] Outlook/Gmail 메일 수신 시 자동 분류 (정확도 95%+)
- [ ] CEO 대시보드에서 브리핑 요약 확인 가능
- [ ] Docker Compose로 전체 시스템 헬스체크 통과
- [ ] Telegram 알림으로 에러율 1% 이상 시 알림 수신
- [ ] GitHub Actions CI/CD 파이프라인 동작
- [ ] 기존 코드(8개 페르소나, ActionRouter 등)와 호환

---

## 최종 평가

**수정 후 평가**: P0 이슈 3건이 수정되어 계획의 실현 가능성이 크게 향상됨.

**권고**: 수정된 계획으로 즉시 실행 가능.
