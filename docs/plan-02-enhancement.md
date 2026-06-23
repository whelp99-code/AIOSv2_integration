# 계획서 2: 고도화

## 목표
에이전틱 OS의 분류 정확도, 확장성, 관측성을 향상시켜 엔터프라이즈급 시스템으로 발전시킨다.

## 기간: 4주 (Week 3-6)

---

## Phase 1: LLM 기반 분류기 업그레이드 (Week 3)

### 1.1 현재 규칙 기반 분류기 한계

| 한계 | 설명 | 영향 |
|------|------|------|
| 키워드 의존 | 정확한 키워드 매칭만 가능 | 유사 표현 미인식 |
| 컨텍스트 무시 | 메일 본문 맥락 고려 안 됨 | 오분류 증가 |
| 규칙 관리 부담 | 새 패턴마다 규칙 추가 필요 | 운영 비용 증가 |

### 1.2 LLM 기반 분류기 설계

**하이브리드 접근**: 규칙 기반(빠름) + LLM 기반(정확함)

```
메일 수신
    ↓
[1단계] 규칙 기반 분류 (confidence ≥ 0.9) → 즉시 라우팅
    ↓ (confidence < 0.9)
[2단계] LLM 분류 (GPT-4o / Claude) → 정확한 분류
    ↓
[3단계] 결과 캐싱 (동일 패턴 → 규칙으로 승격)
```

**LLM 프롬프트 설계**:
```typescript
const CLASSIFICATION_PROMPT = `
당신은 이메일 분류 전문가입니다.
아래 메일을 분석하여 가장 적합한 페르소나 카테고리를 선택하세요.

카테고리:
- SALES: 영업, 견적, 제안, 계약
- FINANCE: 청구서, 비용, 예산, 결제
- PRESALES: 기술 문의, 데모, 솔루션 설계
- PM: 프로젝트, 일정, 작업, 마일스톤
- ENGINEER: 코드 리뷰, 버그, 빌드, 배포
- MARKETING: 콘텐츠, 뉴스레터, 브랜드
- CEO: 승인, 긴급, 전략
- WORK_SUPPORT: 일반 업무, 일정 관리

메일:
제목: {subject}
발신자: {from}
내용: {body}

JSON 형식으로 응답:
{
  "category": "카테고리",
  "confidence": 0.0~1.0,
  "reasoning": "분류 이유"
}`;
```

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| LLM 분류기 구현 | `packages/persona/src/mail/llm-classifier.ts` | 6시간 |
| 프롬프트 최적화 | 분류 정확도 테스트 | 4시간 |
| 하이브리드 분류기 | `packages/persona/src/mail/hybrid-classifier.ts` | 4시간 |
| 규칙 자동 승격 로직 | 캐시 → 규칙 변환 | 3시간 |
| A/B 테스트 프레임워크 | 규칙 vs LLM 비교 | 3시간 |

**목표 성과**:
| 지표 | 현재 (규칙 기반) | 목표 (LLM 기반) |
|------|-----------------|-----------------|
| 분류 정확도 | 80% | 95%+ |
| 분류 시간 | < 1ms | < 2초 |
| 커버리지 | 키워드만 | 맥락 이해 |

### 1.3 분류 결과 피드백 루프

**목적**: CEO가 분류를 수정하면 자동으로 규칙/모델에 반영

```
CEO가 "이 메일은 영업이 아닌 재무입니다" 수정
    ↓
피드백 수집 (packages/persona/src/feedback/collector.ts)
    ↓
규칙 업데이트 OR LLM fine-tuning 데이터 수집
    ↓
주간 규칙/모델 업데이트
```

---

## Phase 2: 70개 모델 점진적 통합 (Week 4)

### 2.1 현재 상태

- **사용 중**: 22개 핵심 모델 (MailItem, Customer, Project 등)
- **미사용**: 70개 모델

### 2.2 통합 우선순위

| 우선순위 | 모델 | 페르소나 | Phase |
|----------|------|----------|-------|
| P1 | `Document`, `DocumentVersion` | Presales, Engineer | Week 4 |
| P1 | `Meeting`, `MeetingNote` | PM | Week 4 |
| P1 | `Product`, `ProductFamily` | Sales | Week 4 |
| P2 | `Notification`, `NotificationPreference` | 전체 | Week 5 |
| P2 | `Integration`, `Webhook` | Engineer | Week 5 |
| P3 | `Report`, `Dashboard` | CEO | Week 6 |
| P3 | `AuditLog`, `ActivityLog` | 전체 | Week 6 |

### 2.3 모델 통합 방법론

**각 모델 통합 시**:
1. Prisma 스키마 확인 (이미 존재하는 모델인지)
2. 페르소나 매핑 (어떤 페르소나가 사용하는지)
3. API 엔드포인트 추가 (CRUD)
4. UI 컴포넌트 추가 (필요 시)
5. 테스트 추가

**예시: Document 모델 통합**:
```prisma
// 이미 존재하는 모델 활용
model Document {
  id        String   @id @default(cuid())
  title     String
  content   String
  type      String   // SOP, BRAND_GUIDE, FAQ, PRODUCT_DOC 등
  projectId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**페르소나 연동**:
```typescript
// PresalesPersona에서 기술 문서 검색
async function searchTechDocs(query: string): Promise<Document[]> {
  return prisma.document.findMany({
    where: {
      type: 'PRODUCT_DOC',
      content: { contains: query, mode: 'insensitive' },
    },
  });
}
```

---

## Phase 3: 모니터링/관측성 (Week 5)

### 3.1 메트릭 수집

**Prometheus 메트릭**:
```typescript
// packages/monitoring/src/metrics.ts
import { Counter, Histogram, Gauge } from 'prom-client';

// 메일 처리 메트릭
export const mailProcessedTotal = new Counter({
  name: 'aios_mail_processed_total',
  help: 'Total mails processed',
  labelNames: ['persona', 'status'],
});

export const mailClassificationDuration = new Histogram({
  name: 'aios_mail_classification_duration_seconds',
  help: 'Mail classification duration',
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const activePersonas = new Gauge({
  name: 'aios_active_personas',
  help: 'Number of active personas',
});

export const approvalPendingCount = new Gauge({
  name: 'aios_approval_pending_count',
  help: 'Number of pending approvals',
});
```

### 3.2 Grafana 대시보드

**대시보드 구성**:
| 패널 | 메트릭 | 알림 기준 |
|------|--------|----------|
| 메일 처리량 | `rate(aios_mail_processed_total[5m])` | < 10건/시간 |
| 분류 정확도 | `aios_classification_accuracy` | < 80% |
| 분류 지연 시간 | `aios_mail_classification_duration_seconds` | > 2초 |
| 페르소나별 처리량 | `aios_mail_processed_total by persona` | - |
| 승인 대기 건수 | `aios_approval_pending_count` | > 20건 |
| 에러율 | `rate(aios_errors_total[5m])` | > 1% |

### 3.3 로깅 구조

**구조화된 로그**:
```json
{
  "timestamp": "2026-06-23T12:00:00Z",
  "level": "info",
  "service": "persona-engine",
  "personaType": "SALES",
  "mailId": "mail-123",
  "action": "classify",
  "duration": 150,
  "result": {
    "category": "SALES",
    "confidence": 0.95,
    "matchedRules": ["sales-keywords"]
  },
  "traceId": "abc-123"
}
```

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| Prometheus 메트릭 | `packages/monitoring/src/metrics.ts` | 4시간 |
| Grafana 대시보드 JSON | `monitoring/grafana-dashboard.json` | 3시간 |
| 구조화된 로깅 | `packages/monitoring/src/logger.ts` | 3시간 |
| 알림 규칙 | `monitoring/alerts.yml` | 2시간 |
| Docker Compose 모니터링 | Prometheus + Grafana 서비스 | 2시간 |

---

## Phase 4: 멀티테넌트 (Week 6)

### 4.1 현재 구조 문제

- 모든 사용자가 동일 Organization 공유
- 페르소나 설정이 전역으로 공유
- 데이터 격리 없음

### 4.2 멀티테넌트 아키텍처

**Organization 기반 격리**:
```
Organization A
├── Users (CEO, 팀원들)
├── Personas (설정 커스터마이징)
├── MailItems (데이터 격리)
└── Briefings (Organization별 독립)

Organization B
├── Users
├── Personas
├── MailItems
└── Briefings
```

**데이터 격리 구현**:
```prisma
// 모든 주요 테이블에 organizationId 추가
model MailItem {
  id             String        @id @default(cuid())
  organizationId String        @map("organization_id")
  subject        String
  // ...
  
  organization Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId])
}
```

**페르소나 설정 격리**:
```typescript
// Organization별 페르소나 설정
interface OrgPersonaConfig {
  organizationId: string;
  personaType: PersonaType;
  rules: ClassificationRule[];  // Organization별 커스텀 규칙
  thresholds: {
    autoApproveBelow: number;   // Organization별 승인 임계값
    confidenceThreshold: number;
  };
}
```

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| Prisma 스키마 업데이트 | organizationId 추가 | 4시간 |
| API 미들웨어 | Organization 격리 | 4시간 |
| 페르소나 설정 API | Organization별 설정 | 3시간 |
| 데이터 마이그레이션 | 기존 데이터 Organization 할당 | 2시간 |
| 테스트 | 멀티테넌트 격리 검증 | 3시간 |

---

## 예상 총 기간: 4주

| 주차 | 작업 | 핵심 산출물 |
|------|------|------------|
| Week 3 | LLM 분류기 | 분류 정확도 95%+ |
| Week 4 | 모델 통합 | 70개 모델 활용 |
| Week 5 | 모니터링 | Grafana 대시보드 |
| Week 6 | 멀티테넌트 | Organization 격리 |

## 기술 부채 정리

| 부채 | 현재 | 목표 | 우선순위 |
|------|------|------|----------|
| 테스트 커버리지 | 단위 테스트 위주 | E2E + 통합 테스트 확대 | P1 |
| 에러 처리 | 기본 try-catch | 재시도 + DLQ + 알림 | P1 |
| 타입 안전성 | 일부 any 사용 | strict TypeScript | P2 |
| 문서화 | README만 | API 문서 + 아키텍처 문서 | P2 |
