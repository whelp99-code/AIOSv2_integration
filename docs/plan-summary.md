# 에이전틱 OS (AIOS v2) — 다음 단계 통합 계획

## 현재 상태

| 항목 | 상태 |
|------|------|
| Phase 0-4 | ✅ 전체 완료 |
| 페르소나 | 8개 전체 구현 |
| 테스트 | 315건 통과 |
| 커밋 | `573fff4` (main) |
| MailClassifier 규칙 | 33개 |
| P0 버그 | ✅ 수정 완료 |

---

## 3개 방향 로드맵

```
Week 1-2: 실서비스 런칭
    ↓
Week 3-6: 고도화
    ↓
Week 7-9: 인프라
```

### 방향 1: 실서비스 런칭 (2주)

| Week | 작업 | 핵심 산출물 |
|------|------|------------|
| 1 | 메일 연동 + CEO 대시보드 | 실제 메일 → 분류 → 브리핑 E2E |
| 2 | Docker 통합 + E2E 테스트 + 런칭 | 프로덕션 배포 완료 |

**핵심 Deliverable**:
- Outlook/Gmail API 연동
- CEO 브리핑 대시보드 UI
- 승인/거부 인터페이스
- Docker Compose 통합

📄 상세: [plan-01-launch.md](./plan-01-launch.md)

---

### 방향 2: 고도화 (4주)

| Week | 작업 | 핵심 산출물 |
|------|------|------------|
| 3 | LLM 분류기 | 분류 정확도 95%+ |
| 4 | 모델 통합 | 70개 모델 활용 |
| 5 | 모니터링 | Grafana 대시보드 |
| 6 | 멀티테넌트 | Organization 격리 |

**핵심 Deliverable**:
- 하이브리드 분류기 (규칙 + LLM)
- 70개 모델 점진적 통합
- Prometheus + Grafana 모니터링
- Organization 기반 멀티테넌트

📄 상세: [plan-02-enhancement.md](./plan-02-enhancement.md)

---

### 방향 3: 인프라 (3주)

| Week | 작업 | 핵심 산출물 |
|------|------|------------|
| 7 | CI/CD | GitHub Actions 자동 배포 |
| 8 | Staging + Production | Docker Compose 프로덕션 |
| 9 | 보안 | Secret 관리, 알림 |

**핵심 Deliverable**:
- GitHub Actions CI/CD 파이프라인
- Staging 환경 구축
- 프로덕션 Docker Compose
- 보안 강화 (Rate Limiting, CORS, 감사 로그)

📄 상세: [plan-03-infrastructure.md](./plan-03-infrastructure.md)

---

## 전체 타임라인

```
Week 1-2:  실서비스 런칭
           └── Outlook/Gmail 연동, CEO 대시보드, Docker 통합

Week 3-6:  고도화
           └── LLM 분류기, 모델 통합, 모니터링, 멀티테넌트

Week 7-9:  인프라
           └── CI/CD, Staging, 프로덕션, 보안
```

**총 기간**: 9주

---

## 예상 비용

| 항목 | 월 비용 |
|------|--------|
| 서버 (Staging + Production) | ~$60 |
| DB 백업 (S3) | ~$1 |
| 도메인 | ~$1/월 |
| **합계** | **~$62/월** |

---

## 리스크

| 리스크 | 확률 | 영향 | 완화 |
|--------|------|------|------|
| Graph API 인증 복잡도 | 중간 | 중간 | Microsoft 문서 + 샘플 코드 |
| LLM 분류 비용 | 중간 | 낮음 | 규칙 기반 우선, LLM은 미분류만 |
| 멀티테넌트 데이터 격리 | 낮음 | 높음 | Organization 기반 격리 |
| 프로덕션 장애 | 낮음 | 높음 | 백업 + 모니터링 + 알림 |

---

## 의사 결정 완료

| 항목 | 결정 | 비고 |
|------|------|------|
| LLM 프로바이더 | **하이브리드**: Claude(SynteroLink) 핵심용, LM Studio 로컬용, FreeLLMAPI 무료 티어용 | 비용 최적화 + 유연성 |
| 호스팅 | **자체 서버(Mac Mini)** 우선, 추후 AWS 검토 | 비용 절감, 초기 구축 간편 |
| 알림 채널 | **Telegram** (이미 사용 중) | 기존 인프라 활용 |
| 백업 전략 | **매일 자동 백업** | DB 백업 + 로컬 보관 |