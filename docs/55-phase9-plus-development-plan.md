# Phase 9+: 개발·개선·고도화 상세 계획서

> **작성일:** 2026-06-24
> **기반:** Phase 0~8 완료 (726개 테스트 통과, Wave A~E 모델 통합)
> **목적:** 실서비스 운영을 위한 추가 개발, 개선, 고도화 포인트 정의

---

## 1. 현재 상태 요약

### ✅ 완료된 Phase (0~8)

| Phase | 내용 | 산출물 | 테스트 |
|-------|------|--------|--------|
| 0 | Baseline Freeze & Safety Contract | golden dataset, model inventory, security policy | ✅ |
| 1 | LLM Gateway Hardening | provider normalization, PII redaction, circuit breaker | ✅ |
| 2 | Compatibility Layer & Hybrid Classifier | rule classifier + hybrid async API | ✅ |
| 3 | Shadow Mode & Offline Benchmark | confusion matrix, cost/latency dashboard | ✅ |
| 4 | Canary Rollout & Wave A | 12개 모델 통합 (Persona, LlmCall, CostEvent 등) | ✅ |
| 5 | Wave B: Mail Insight & Policy | 10개 모델 통합 (MailInsightThread, PolicyMemory 등) | ✅ |
| 6 | Wave C: Automation Workflow | 19개 모델 통합 (Command, Workflow, Approval 등) | ✅ |
| 7 | Wave D: Code & CI Collaboration | 17개 모델 통합 (Repository, PR, BuildRun 등) | ✅ |
| 8 | Wave E: Portal Registry & Config | 12개 모델 통합 (ModuleRegistry, ConfigProfile 등) | ✅ |

### 현재 코드 구조

```
packages/persona/src/mail/
├── classifier.ts              # 기존 규칙 기반 분류기
├── rule-classifier.ts         # Rule Classifier wrapper
├── hybrid-classifier.ts       # Hybrid async classifier
├── llm-gateway.ts             # LLM Gateway (provider, redaction, circuit breaker)
├── llm-limiter.ts             # Token/cost cap
├── redactor.ts                # PII redaction
├── canary-router.ts           # Canary rollout router
├── shadow-logger.ts           # Shadow mode logging
├── offline-benchmark.ts       # Offline benchmark runner
├── benchmark.ts               # Benchmark script
├── prompt-tracker.ts          # Prompt version tracking
├── review-queue.ts            # Manual review queue
├── mail-insight-engine.ts     # Mail insight & thread summary
├── automation-engine.ts       # Automation workflow runtime
├── code-collaboration-engine.ts # Code & CI collaboration
├── portal-engine.ts           # Portal registry & config
├── rollout-config.ts          # Rollout mode config
├── golden-data/               # Golden dataset
├── wave-a-store.ts            # Wave A in-memory store
├── wave-b-store.ts            # Wave B in-memory store
├── wave-c-store.ts            # Wave C in-memory store
├── wave-d-store.ts            # Wave D in-memory store
├── wave-e-store.ts            # Wave E in-memory store
└── __tests__/                 # 9개 테스트 파일
```

---

## 2. Phase 9: 실서비스 연동 (2주)

### 2.1 Outlook Graph API 연동

**목적:** 실제 Outlook 메일을 수신하여 하이브리드 분류기로 처리

| 작업 | 상세 | 산출물 |
|------|------|--------|
| Graph API OAuth 토큰 관리 | Azure AD 앱 등록 완료, 토큰 갱신 로직 | `packages/auth/src/graph-oauth.ts` |
| 메일 수신 웹훅 | Graph API subscription → webhook endpoint | `apps/api/src/webhooks/outlook.ts` |
| 메일 → Bronze 적재 | 수신 메일 → BronzeRecord 저장 | `packages/data-plane/src/bronze/ingestor.ts` |
| Bronze → Silver 변환 | 하이브리드 분류기 연동 | `packages/data-plane/src/silver/pipeline.ts` |
| Silver → Gold Candidate | 분류 결과 → Gold Candidate Event | `packages/data-plane/src/gold/candidate-emitter.ts` |
| 웹훅 갱신 스케줄러 | 3일마다 자동 갱신 | `packages/api/src/webhooks/graph-renewal.ts` |

**검증 기준:**
- [ ] Outlook에서 메일 수신 시 5초 이내 Bronze 적재
- [ ] 하이브리드 분류기 accuracy ≥95% (실제 메일)
- [ ] 웹훅 갱신 스케줄러 3일마다 실행 확인
- [ ] 토큰 만료 시 자동 갱신 확인

### 2.2 CEO 대시보드 연동

**목적:** 분류 결과를 CEO 대시보드에 실시간 표시

| 작업 | 상세 | 산출물 |
|------|------|--------|
| SSE 이벤트 스트림 | Gold Candidate Event → SSE | `apps/api/src/routes/events.ts` |
| 대시보드 컴포넌트 | 메일 분류 현황, 긴급 건, 워크플로우 상태 | `apps/web/src/components/dashboard/` |
| 브리핑 엔진 | 일일/주간 브리핑 자동 생성 | `packages/persona/src/briefing/engine.ts` |
| Telegram 알림 | 긴급 건 즉시 알림 | `packages/api/src/notifications/telegram.ts` |

**검증 기준:**
- [ ] SSE 스트림 실시간 업데이트 확인
- [ ] CEO 대시보드에서 메일 분류 현황 표시
- [ ] 긴급 건 Telegram 알림 수신 확인
- [ ] 일일 브리핑 자동 생성 확인

### 2.3 CFO 시스템 연동

**목적:** 재무 관련 메일 → CFO 시스템 자동 입력

| 작업 | 상세 | 산출물 |
|------|------|--------|
| CFO API 프록시 | `localhost:4100` 프록시 연결 | `packages/cfo/proxy.ts` |
| 세금계산서 자동 등록 | 메일에서 추출한 재무 데이터 → CFO API | `packages/cfo/adapters/invoice.ts` |
| 현금흐름 자동 기록 | 송금/결제 메일 → Cashflow 레코드 | `packages/cfo/adapters/cashflow.ts` |
| 데이터 무결성 검증 | CFO DB ↔ 통합 DB 동기화 확인 | `scripts/verify-cfo-integrity.ts` |

**검증 기준:**
- [ ] 세금계산서 메일 → CFO Invoice 자동 등록 확인
- [ ] 송금 메일 → Cashflow 자동 기록 확인
- [ ] CFO API health check 통과
- [ ] 데이터 무결성 검증 통과

---

## 3. Phase 10: 성능 최적화 (1주)

### 3.1 분류기 성능 최적화

| 작업 | 현재 | 목표 | 방법 |
|------|------|------|------|
| 분류 응답 시간 | ~2초 | <500ms | 규칙 기반 fast path 강화, LLM call 최소화 |
| LLM call 비율 | ~35% | <20% | confidence threshold 조정, 캐싱 |
| 메모리 사용량 | ~512MB | <256MB | in-memory store 최적화, 가비지 컬렉션 |
| 동시 처리 | 10건/초 | 50건/초 | 비동기 파이프라인, 워커 풀 |

### 3.2 DB 성능 최적화

| 작업 | 상세 | 산출물 |
|------|------|--------|
| 인덱스 최적화 | 자주 조회하는 필드 인덱스 추가 | `prisma/migrations/` |
| 쿼리 최적화 | N+1 쿼리 제거, 배치 처리 | `packages/db/src/optimized-queries.ts` |
| 연결 풀 최적화 | PostgreSQL 연결 풀 크기 조정 | `.env` 설정 |
| 캐싱 전략 | Redis 캐싱 레이어 추가 | `packages/cache/src/redis-cache.ts` |

### 3.3 빌드 최적화

| 작업 | 상세 | 산출물 |
|------|------|--------|
| Turborepo 캐시 | 빌드 캐시 히트率 90%+ | `turbo.json` 최적화 |
| Docker 이미지 최적화 | 멀티스테이지 빌드 | `Dockerfile` |
| 트리 셰이킹 | 미사용 코드 제거 | `tsconfig.json` 설정 |

**검증 기준:**
- [ ] 분류 응답 시간 <500ms (p95)
- [ ] LLM call 비율 <20%
- [ ] 동시 처리 50건/초
- [ ] 빌드 시간 <30초

---

## 4. Phase 11: 보안 강화 (1주)

### 4.1 인증/인가

| 작업 | 상세 | 산출물 |
|------|------|--------|
| JWT 인증 | NextAuth.js 기반 JWT 토큰 | `packages/auth/src/jwt.ts` |
| RBAC 권한 관리 | 역할 기반 접근 제어 | `packages/auth/src/rbac.ts` |
| API Key 관리 | 서비스 간 API Key 발급/갱신 | `packages/auth/src/api-keys.ts` |
| 세션 관리 | Redis 기반 세션 스토어 | `packages/auth/src/session-store.ts` |

### 4.2 데이터 보안

| 작업 | 상세 | 산출물 |
|------|------|--------|
| 데이터 암호화 | 민감 데이터 AES-256 암호화 | `packages/security/src/encryption.ts` |
| 감사 로그 | 모든 민감 작업 감사 로그 기록 | `packages/security/src/audit-logger.ts` |
| 접근 제어 | IP 기반 접근 제어 | `packages/security/src/ip-whitelist.ts` |
| 비밀번호 정책 | 강력한 비밀번호 정책 적용 | `packages/auth/src/password-policy.ts` |

### 4.3 네트워크 보안

| 작업 | 상세 | 산출물 |
|------|------|--------|
| HTTPS 강제 | 모든 통신 HTTPS 적용 | `nginx.conf` |
| CORS 정책 | 엄격한 CORS 정책 적용 | `apps/api/src/middleware/cors.ts` |
| Rate Limiting | API Rate Limiting 적용 | `apps/api/src/middleware/rate-limit.ts` |
| CSP 헤더 | Content Security Policy 적용 | `apps/web/next.config.js` |

**검증 기준:**
- [ ] JWT 토큰 발급/검증 동작 확인
- [ ] RBAC 권한별 접근 제어 확인
- [ ] PII redaction 100% 동작 확인
- [ ] 감사 로그 기록 확인
- [ ] HTTPS 강제 적용 확인

---

## 5. Phase 12: 모니터링 & 관측성 (1주)

### 5.1 메트릭 수집

| 작업 | 상세 | 산출물 |
|------|------|--------|
| Prometheus 메트릭 | 커스텀 메트릭 수집 | `packages/monitoring/src/metrics.ts` |
| Grafana 대시보드 | 시각화 대시보드 구축 | `docker/grafana/dashboards/` |
| 알림 규칙 | 임계값 기반 알림 | `docker/grafana/alerts/` |
| 헬스체크 | 서비스별 헬스체크 엔드포인트 | `apps/api/src/routes/health.ts` |

### 5.2 로그 관리

| 작업 | 상세 | 산출물 |
|------|------|--------|
| 구조화 로그 | JSON 형식 구조화 로그 | `packages/monitoring/src/logger.ts` |
| 로그 레벨 관리 | 환경별 로그 레벨 설정 | `.env` 설정 |
| 로그 수집 | 중앙 로그 수집 시스템 | `docker/loki/` |
| 로그 분석 | 에러 패턴 자동 감지 | `packages/monitoring/src/log-analyzer.ts` |

### 5.3 분산 추적

| 작업 | 상세 | 산출물 |
|------|------|--------|
| OpenTelemetry | 분산 추적 설정 | `packages/monitoring/src/tracing.ts` |
| Span 관리 | 요청 추적을 위한 Span 생성 | `packages/monitoring/src/span-manager.ts` |
| 트레이스 시각화 | Jaeger UI 연동 | `docker/jaeger/` |

**검증 기준:**
- [ ] Grafana 대시보드에서 메트릭 확인
- [ ] 알림 규칙 동작 확인
- [ ] 구조화 로그 기록 확인
- [ ] 분산 추적 Span 연결 확인

---

## 6. Phase 13: UI/UX 고도화 (2주)

### 6.1 CEO 대시보드 고도화

| 작업 | 상세 | 산출물 |
|------|------|--------|
| 실시간 메일 분류 현황 | 차트 + 통계 | `apps/web/src/components/dashboard/mail-stats.tsx` |
| 긴급 건 알림 패널 | 즉시 처리 필요 건 표시 | `apps/web/src/components/dashboard/urgent-panel.tsx` |
| 워크플로우 상태 | 실행 중/완료/대기 건 표시 | `apps/web/src/components/dashboard/workflow-status.tsx` |
| 재무 요약 | CFO 데이터 요약 표시 | `apps/web/src/components/dashboard/finance-summary.tsx` |

### 6.2 메일 관리 UI

| 작업 | 상세 | 산출물 |
|------|------|--------|
| 메일 목록 | 분류별 필터링, 정렬 | `apps/web/src/components/mail/mail-list.tsx` |
| 메일 상세 | 분류 결과, 신뢰도, reasoning 표시 | `apps/web/src/components/mail/mail-detail.tsx` |
| 수동 분류 | 분류 결과 수동 수정 | `apps/web/src/components/mail/manual-classify.tsx` |
| 검색 | 메일 검색 (발신자, 제목, 내용) | `apps/web/src/components/mail/mail-search.tsx` |

### 6.3 설정 관리 UI

| 작업 | 상세 | 산출물 |
|------|------|--------|
| 분류기 설정 | confidence threshold, LLM call 비율 등 | `apps/web/src/components/settings/classifier-settings.tsx` |
| rollout 설정 | rules-only/shadow/canary/hybrid 모드 전환 | `apps/web/src/components/settings/rollout-settings.tsx` |
| 보안 설정 | PII redaction, provider 등급 설정 | `apps/web/src/components/settings/security-settings.tsx` |
| 알림 설정 | Telegram 알림 규칙 설정 | `apps/web/src/components/settings/notification-settings.tsx` |

**검증 기준:**
- [ ] CEO 대시보드에서 실시간 메일 분류 현황 확인
- [ ] 메일 목록에서 분류별 필터링 동작 확인
- [ ] 설정 변경 시 즉시 적용 확인
- [ ] 모바일 반응형 UI 확인

---

## 7. Phase 14: 테스트 고도화 (1주)

### 7.1 E2E 테스트

| 작업 | 상세 | 산출물 |
|------|------|--------|
| Playwright E2E | 전체 사용자 시나리오 테스트 | `tests/e2e/` |
| API 통합 테스트 | 모든 API 엔드포인트 테스트 | `tests/integration/` |
| 성능 테스트 | 부하 테스트, 스트레스 테스트 | `tests/performance/` |
| 보안 테스트 | 침투 테스트, 취약점 스캔 | `tests/security/` |

### 7.2 품질 게이트

| 작업 | 상세 | 산출물 |
|------|------|--------|
| 코드 커버리지 | 80% 이상 커버리지 달성 | `vitest.config.ts` |
| 린트 규칙 | ESLint 규칙 강화 | `.eslintrc.js` |
| 포맷팅 | Prettier 자동 포맷팅 | `.prettierrc` |
| 타입 검사 | TypeScript strict mode | `tsconfig.json` |

### 7.3 CI/CD 파이프라인

| 작업 | 상세 | 산출물 |
|------|------|--------|
| GitHub Actions CI | 빌드 + 테스트 + 린트 자동화 | `.github/workflows/ci.yml` |
| CD 파이프라인 | 자동 배포 파이프라인 | `.github/workflows/deploy.yml` |
| 환경 분리 | dev/staging/prod 환경 분리 | `docker-compose.*.yml` |

**검증 기준:**
- [ ] E2E 테스트 전체 통과
- [ ] 코드 커버리지 80% 이상
- [ ] CI/CD 파이프라인 자동 실행 확인
- [ ] 환경별 배포 동작 확인

---

## 8. Phase 15: 문서화 & 교육 (1주)

### 8.1 기술 문서

| 작업 | 상세 | 산출물 |
|------|------|--------|
| API 문서 | OpenAPI 스펙 기반 자동 생성 | `docs/api/` |
| 아키텍처 문서 | 시스템 아키텍처 문서 | `docs/architecture/` |
| 배포 가이드 | 배포 절차 문서 | `docs/deployment/` |
| 운영 매뉴얼 | 운영 절차 문서 | `docs/operations/` |

### 8.2 사용자 문서

| 작업 | 상세 | 산출물 |
|------|------|--------|
| 사용자 가이드 | CEO 대시보드 사용법 | `docs/user-guide/` |
| 관리자 가이드 | 시스템 관리 가이드 | `docs/admin-guide/` |
| FAQ | 자주 묻는 질문 | `docs/faq/` |
| 문제 해결 가이드 | 일반적인 문제 해결 방법 | `docs/troubleshooting/` |

### 8.3 교육 자료

| 작업 | 상세 | 산출물 |
|------|------|--------|
| 온보딩 가이드 | 신규 개발자 온보딩 | `docs/onboarding/` |
| 교육 비디오 | 시스템 사용법 교육 비디오 | `docs/videos/` |
| 워크숍 자료 | 교육 워크숍 자료 | `docs/workshops/` |

**검증 기준:**
- [ ] API 문서 자동 생성 확인
- [ ] 아키텍처 문서 최신 상태 확인
- [ ] 사용자 가이드 초안 완성
- [ ] 온보딩 가이드 완성

---

## 9. Phase 16: 확장 & 통합 (2주)

### 9.1 외부 서비스 연동

| 작업 | 상세 | 산출물 |
|------|------|--------|
| Slack 연동 | Slack 알림 + 명령어 | `packages/integrations/src/slack.ts` |
| 카카오워크 연동 | 카카오워크 알림 | `packages/integrations/src/kakaowork.ts` |
| Notion 연동 | Notion 동기화 | `packages/integrations/src/notion.ts` |
| GitHub 연동 | GitHub Issue/PR 자동 생성 | `packages/integrations/src/github.ts` |

### 9.2 AI 에이전트 연동

| 작업 | 상세 | 산출물 |
|------|------|--------|
| k-skill 연동 | 한국형 비즈니스 스킬 연동 | `packages/skills/src/registry.ts` |
| Agent-Reach 연동 | 웹/소셜 미디어 접근 | `packages/web-reach/src/adapter.ts` |
| Voicebox 연동 | 음성 인터페이스 | `packages/voice/src/interface.ts` |
| understand-anything 연동 | 지식 그래프 | `packages/knowledge/src/graph.ts` |

### 9.3 멀티테넌트

| 작업 | 상세 | 산출물 |
|------|------|--------|
| Organization 격리 | 조직별 데이터 격리 | `packages/db/src/tenant-isolation.ts` |
| 사용자 관리 | 조직별 사용자 관리 | `packages/auth/src/user-management.ts` |
| 결제 시스템 | 사용량 기반 결제 | `packages/billing/src/usage-meter.ts` |

**검증 기준:**
- [ ] Slack 알림 수신 확인
- [ ] k-skill 스킬 실행 확인
- [ ] Organization 격리 확인
- [ ] 사용량 기반 결제 동작 확인

---

## 10. 우선순위 & 타임라인

### 우선순위 매트릭스

| Phase | 우선순위 | 기간 | 의존성 |
|-------|----------|------|--------|
| 9: 실서비스 연동 | 🔴 최고 | 2주 | Azure AD 앱 등록 완료 |
| 10: 성능 최적화 | 🔴 높음 | 1주 | Phase 9 완료 |
| 11: 보안 강화 | 🔴 높음 | 1주 | Phase 9 완료 |
| 12: 모니터링 | 🟡 중간 | 1주 | Phase 10 완료 |
| 13: UI/UX 고도화 | 🟡 중간 | 2주 | Phase 9 완료 |
| 14: 테스트 고도화 | 🟡 중간 | 1주 | Phase 10 완료 |
| 15: 문서화 | 🟢 낮음 | 1주 | Phase 13 완료 |
| 16: 확장 & 통합 | 🟢 낮음 | 2주 | Phase 13 완료 |

### 전체 타임라인

```
Week 1~2:  Phase 9  — 실서비스 연동 (Outlook, CEO 대시보드, CFO)
Week 3:    Phase 10 — 성능 최적화
Week 4:    Phase 11 — 보안 강화
Week 5:    Phase 12 — 모니터링 & 관측성
Week 6~7:  Phase 13 — UI/UX 고도화
Week 8:    Phase 14 — 테스트 고도화
Week 9:    Phase 15 — 문서화 & 교육
Week 10~11: Phase 16 — 확장 & 통합
```

**총 기간: 11주**

---

## 11. 성공 지표 (KPI)

### 기술 KPI

| KPI | 현재 | 목표 | 측정 방법 |
|-----|------|------|-----------|
| 분류 정확도 | 85% (규칙) | 95%+ (하이브리드) | Golden dataset 벤치마크 |
| 분류 응답 시간 | ~2초 | <500ms | p95 latency |
| LLM call 비율 | ~35% | <20% | 메트릭 대시보드 |
| 테스트 커버리지 | ~70% | 80%+ | vitest coverage |
| 빌드 시간 | ~45초 | <30초 | Turborepo 캐시 |
| 서비스 가동률 | 99% | 99.9% | 헬스체크 |

### 비즈니스 KPI

| KPI | 현재 | 목표 | 측정 방법 |
|-----|------|------|-----------|
| 메일 처리 시간 | 수동 30분/건 | 자동 5초/건 | 타이머 |
| 긴급 건 알림 | 없음 | 5분 이내 | Telegram 알림 |
| CEO 브리핑 | 수동 | 자동 일일 생성 | 브리핑 엔진 |
| CFO 데이터 입력 | 수동 | 자동 80%+ | CFO API 연동 |

---

## 12. 리스크 & 완화

| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|-----------|
| Graph API 변경 | 중간 | 높음 | 어댑터 패턴, 버전 관리 |
| LLM 비용 초과 | 중간 | 중간 | 비용 캡, 로컬 모델 폴백 |
| 데이터 유실 | 낮음 | 매우 높음 | 백업 + 롤백 스크립트 |
| 보안 취약점 | 낮음 | 매우 높음 | 정기 감사, 시크릿 로테이션 |
| 성능 저하 | 중간 | 중간 | 모니터링 + 자동 스케일링 |

---

## 13. 롤백 계획

```
Phase 9 롤백:
  → Outlook 웹훅 비활성화
  → 기존 규칙 기반 분류기로 복귀
  → CEO 대시보드 이전 버전으로 복귀

Phase 10 롤백:
  → 성능 최적화 코드 제거
  → 기존 코드로 복귀

Phase 11 롤백:
  → 보안 설정 이전 버전으로 복귀
  → 인증 우회 모드 활성화 (개발 환경)

Phase 12 롤백:
  → 모니터링 비활성화
  → 기존 로그 시스템으로 복귀
```

---

> 📌 **이 문서는 Phase 0~8 완료 후 추가 개발·개선·고도화 포인트를 정의합니다.**
> **Phase를 순차적으로 실행하고, 완료 기준을 충족한 후 다음 Phase로 진행하세요.**
