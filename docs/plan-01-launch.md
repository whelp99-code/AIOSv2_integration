# 계획서 1: 실서비스 런칭

## 목표
에이전틱 OS를 실제 1인기업 업무 환경에 배포하여 매일 사용할 수 있는 상태로 만든다.

## 기간: 2주 (Week 1-2)

---

## Phase 1: 실제 메일 연동 (Week 1, Day 1-3)

### 1.1 Microsoft Graph API 연동

**목적**: Outlook 메일 수신 → MailClassifier 자동 분류

**구현 범위**:
- Microsoft Graph API 인증 (OAuth 2.0)
- 메일 웹훅 구독 (mail received 이벤트)
- 메일 수신 → IngestionItem 변환 → 파이프라인 실행

**기술 상세**:
```
Outlook 메일 수신
    ↓
Graph API Webhook (notification URL)
    ↓
Webhook handler (packages/api/src/webhooks/outlook.ts)
    ↓
MailClassifier.classify(mail)
    ↓
PersonaRouter.route(classification)
    ↓
해당 페르소나.processMail()
```

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| Azure AD 앱 등록 | Client ID, Secret | 1시간 |
| Graph API OAuth 구현 | `packages/auth/src/graph-oauth.ts` | 4시간 |
| Webhook 엔드포인트 | `packages/api/src/webhooks/outlook.ts` | 3시간 |
| 메일 → IngestionItem 변환 | `packages/api/src/adapters/outlook-adapter.ts` | 2시간 |
| 통합 테스트 | `tests/integration/outlook-webhook.test.ts` | 2시간 |

**검증 기준**:
- [ ] Outlook에서 메일 수신 시 자동으로 분류됨
- [ ] 분류 결과가 Redis Stream에 발행됨
- [ ] 페르소나가 라우팅되어 처리 시작

### 1.2 Gmail API 연동 (보조)

**목적**: Gmail 사용자를 위한 보조 채널

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| Gmail API 인증 | `packages/auth/src/gmail-oauth.ts` | 3시간 |
| Gmail 웹훅 (Push Notification) | `packages/api/src/webhooks/gmail.ts` | 3시간 |
| 메일 어댑터 | `packages/api/src/adapters/gmail-adapter.ts` | 2시간 |

---

## Phase 2: CEO 대시보드 UI (Week 1, Day 4-5)

### 2.1 브리핑 대시보드

**목적**: CEO가 아침에 접속하면 오늘의 브리핑을 볼 수 있는 화면

**화면 구성**:
```
┌─────────────────────────────────────────────────────────┐
│  📊 CEO 일일 브리핑 - 2026-06-24                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [요약 카드]                                            │
│  처리: 15건 | 자동: 12건 | 승인대기: 2건 | 알림: 1건    │
│                                                         │
│  [⚠️ 승인 필요]                                         │
│  🔴 500만원 계약 건 - 영업 페르소나                      │
│     [승인] [거부] [상세보기]                             │
│  🟡 300만원 청구서 - 재무 페르소나                        │
│     [승인] [거부] [상세보기]                             │
│                                                         │
│  [📈 페르소나별 현황]                                    │
│  영업: 3건 ✅ | 재무: 2건 ✅ | 엔지니어: 4건 ✅          │
│  프리세일즈: 2건 ✅ | PM: 1건 ✅ | 마케팅: 1건 ✅        │
│  업무지원: 2건 ✅                                        │
│                                                         │
│  [📋 최근 처리 내역]                                     │
│  - 견적 요청 → 영업 라우팅 (95%)                        │
│  - 기술 문의 → 프리세일즈 라우팅 (80%)                   │
│  - 청구서 → 재무 라우팅 (90%)                            │
└─────────────────────────────────────────────────────────┘
```

**기술 상세**:
- 프레임워크: Next.js (기존 `apps/web` 활용)
- 상태 관리: React Query (API 폴링)
- UI 컴포넌트: 기존 Shadcn/ui + Tailwind CSS

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| 브리핑 API 엔드포인트 | `packages/api/src/routes/briefing.ts` | 2시간 |
| 브리핑 대시보드 페이지 | `apps/web/src/app/briefing/page.tsx` | 4시간 |
| 승인/거부 API | `packages/api/src/routes/approval.ts` | 2시간 |
| 승인 UI 컴포넌트 | `apps/web/src/components/ApprovalCard.tsx` | 3시간 |
| 실시간 업데이트 (SSE) | `packages/api/src/routes/events.ts` | 2시간 |

### 2.2 승인 인터페이스

**목적**: CEO가 승인/거부/수정 요청을 할 수 있는 인터페이스

**API 엔드포인트**:
```
GET  /api/briefing/today          # 오늘의 브리핑
POST /api/approval/:id/approve    # 승인
POST /api/approval/:id/reject     # 거부
POST /api/approval/:id/changes    # 수정 요청
GET  /api/approval/pending        # 대기 목록
```

---

## Phase 3: Docker Compose 통합 (Week 2, Day 1-2)

### 3.1 프로덕션 Docker Compose

**목적**: PostgreSQL + Redis + API + Web을 한 번에 기동

**`docker-compose.yml`**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: aios
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: aios_v2
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aios"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    ports:
      - "3200:3200"
    environment:
      DATABASE_URL: postgresql://aios:${DB_PASSWORD}@postgres:5432/aios_v2
      REDIS_URL: redis://redis:6379
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api:3200
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| API Dockerfile | `packages/api/Dockerfile` | 2시간 |
| Web Dockerfile | `apps/web/Dockerfile` | 2시간 |
| docker-compose.yml | 프로젝트 루트 | 1시간 |
| 환경 변수 설정 | `.env.example` 업데이트 | 1시간 |
| 헬스체크 엔드포인트 | `/api/health` | 1시간 |

### 3.2 데이터베이스 마이그레이션 자동화

**목적**: 컨테이너 시작 시 자동으로 마이그레이션 실행

```yaml
# docker-compose.yml에 추가
  migrate:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    command: npx prisma migrate deploy
    environment:
      DATABASE_URL: postgresql://aios:${DB_PASSWORD}@postgres:5432/aios_v2
    depends_on:
      postgres:
        condition: service_healthy
```

---

## Phase 4: 실데이터 E2E 테스트 (Week 2, Day 3-4)

### 4.1 테스트 시나리오

| 시나리오 | 메일 유형 | 기대 동작 | 검증 기준 |
|----------|----------|----------|----------|
| 시나리오 1 | 견적 요청 메일 | SALES 페르소나 라우팅 | 분류 정확도 ≥ 80% |
| 시나리오 2 | 청구서 메일 | FINANCE 페르소나 라우팅 | 청구서 자동 등록 |
| 시나리오 3 | 기술 문의 메일 | PRESALES 페르소나 라우팅 | 기술 검토 시작 |
| 시나리오 4 | 프로젝트 일정 메일 | PM 페르소나 라우팅 | 프로젝트 상태 업데이트 |
| 시나리오 5 | 코드 리뷰 메일 | ENGINEER 페르소나 라우팅 | 리뷰 시작 |
| 시나리오 6 | 뉴스레터 메일 | MARKETING 페르소나 라우팅 | 콘텐츠 기획 |
| 시나리오 7 | 승인 요청 메일 | CEO 브리핑 포함 | 승인 대기 항목 표시 |
| 시나리오 8 | 긴급 메일 | 우선순위 높음 | 즉시 처리 |

### 4.2 성능 기준

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 메일 분류 시간 | < 1초 | 메일 수신 → 분류 완료 |
| 라우팅 시간 | < 500ms | 분류 → 페르소나 실행 |
| 브리핑 생성 시간 | < 3초 | 전체 메일 → 브리핑 완료 |
| 시스템 가용성 | 99%+ | Docker 컨테이너 health check |

### 4.3 테스트 자동화

**E2E 테스트 스크립트**:
```bash
#!/bin/bash
# tests/e2e/run-e2e.sh

echo "=== E2E 테스트 시작 ==="

# 1. 시스템 기동
docker-compose up -d
sleep 10

# 2. 마이그레이션 확인
docker-compose exec api npx prisma migrate status

# 3. 테스트 메일 발송 (Mock)
curl -X POST http://localhost:3200/api/test/send-mail \
  -H "Content-Type: application/json" \
  -d '{"subject": "견적 요청", "from": "customer@customer.com", "body": "견적 요청합니다."}'

# 4. 분류 결과 확인
sleep 5
curl http://localhost:3200/api/briefing/today | jq .

# 5. 승인 테스트
curl -X POST http://localhost:3200/api/approval/test/approve

echo "=== E2E 테스트 완료 ==="
```

---

## Phase 5: 런칭 체크리스트 (Week 2, Day 5)

### 5.1 기술 체크리스트

- [ ] Docker Compose로 전체 시스템 기동 성공
- [ ] Prisma 마이그레이션 자동 실행
- [ ] Outlook/Gmail 웹훅 정상 수신
- [ ] 메일 분류 정확도 80% 이상
- [ ] CEO 브리핑 정상 생성
- [ ] 승인/거부 기능 동작
- [ ] Redis Stream 정상 동작
- [ ] 에러 로깅 (GlitchTip 연동)

### 5.2 운영 체크리스트

- [ ] `.env` 파일 보안 설정
- [ ] 데이터베이스 백업 설정
- [ ] 모니터링 알림 설정
- [ ] 사용자 매뉴얼 작성
- [ ] CEO 교육 (브리핑 확인 방법, 승인 방법)

### 5.3 런칭 후 모니터링

| 지표 | 확인 주기 | 알림 기준 |
|------|----------|----------|
| 메일 분류 성공률 | 매일 | < 80% |
| 시스템 응답 시간 | 매시간 | > 5초 |
| 에러 발생 건수 | 매시간 | > 10건 |
| 승인 대기 건수 | 매일 | > 20건 |

---

## 예상 총 기간: 2주

| 주차 | 작업 | 산출물 |
|------|------|--------|
| Week 1 | 메일 연동 + CEO 대시보드 | 실제 메일 → 분류 → 브리핑 E2E |
| Week 2 | Docker 통합 + E2E 테스트 + 런칭 | 프로덕션 배포 완료 |

## 리스크

| 리스크 | 확률 | 영향 | 완화 |
|--------|------|------|------|
| Graph API 인증 복잡도 | 중간 | 중간 | Microsoft 문서 + 샘플 코드 활용 |
| 메일 분류 정확도 부족 | 중간 | 중간 | 규칙 기반 → LLM 기반 업그레이드 |
| Docker 환경 차이 | 낮음 | 낮음 | 동일 Docker Compose 사용 |
