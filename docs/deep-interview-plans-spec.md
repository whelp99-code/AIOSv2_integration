# Deep Interview Spec: 계획서 3건 검증

## Metadata
- Interview ID: deep-int-plans-20260623
- Rounds: 10
- Final Ambiguity Score: 17.25%
- Type: brownfield
- Generated: 2026-06-23
- Threshold: 0.05
- Threshold Source: default
- Initial Context Summarized: no
- Status: BELOW_THRESHOLD_EARLY_EXIT
- Restated Goal: 에이전틱 OS를 Mac Mini M1/M2 Pro(32GB RAM)에서 실행하여, Outlook/Gmail 연동으로 메일을 자동 분류하고, CEO에게 브리핑 요약을 제공하며, LLM 하이브리드(FreeLLMAPI 기본, Claude 미분류, LM Studio 캐시)로 분류 정확도 95%+를 달성하고, Telegram 알림으로 모니터링하는 시스템을 점진적으로 구축한다.

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.80 | 0.35 | 0.28 |
| Constraint Clarity | 0.80 | 0.25 | 0.20 |
| Success Criteria | 0.85 | 0.25 | 0.2125 |
| Context Clarity | 0.90 | 0.15 | 0.135 |
| **Total Clarity** | | | **0.8275** |
| **Ambiguity** | | | **17.25%** |

## Topology
| Component | Status | Description | Coverage Note |
|-----------|--------|-------------|---------------|
| Outlook/Gmail 연동 | active | Graph API OAuth, 웹훅, 메일 어댑터 | 요청 제한, 웹훅 갱신, 보안 인증 고려 |
| CEO 대시보드 | active | 브리핑 API, 승인/거부 UI | 브리핑 요약이 핵심 기능 |
| Docker Compose 통합 | active | PostgreSQL + Redis + API + Web | 헬스체크 통과가 성공 기준 |
| LLM 분류기 | active | 하이브리드(규칙+LLM), 피드백 루프 | 벤치마크 데이터셋으로 정확도 측정 |
| 모니터링/관측성 | active | Prometheus, Grafana, Telegram 알림 | 에러율 1% 이상 시 알림 |
| CI/CD + 인프라 | active | GitHub Actions, Staging, 보안 | CI/CD 처음부터 구축 |

## Established Facts
| Fact | Source | Evidence |
|------|--------|----------|
| Mac Mini M1/M2 Pro, 32GB RAM | Round 1 | 사용자 확인 |
| 월 예산 20만원 이하 | Round 1 | 사용자 확인 |
| 벤치마크 데이터셋으로 정확도 측정 | Round 2 | 사용자 확인 |
| LLM 하이브리드: FreeLLMAPI 기본, Claude 미분류, LM Studio 캐시 | Round 3 | 사용자 확인 |
| CEO 대시보드는 브리핑 요약이 핵심 | Round 4 | 사용자 확인 |
| Docker Compose 성공 기준은 헬스체크 통과 | Round 5 | 사용자 확인 |
| CI/CD는 처음부터 구축 | Round 6 | 사용자 확인 |
| Graph API 제약: 요청 제한, 웹훅 갱신, 보안 인증 | Round 7 | 사용자 확인 |
| 멀티테넌트는 아키텍처만 준비 | Round 8 | 사용자 확인 |
| 모니터링은 Telegram + 에러율 1% | Round 9 | 사용자 확인 |
| 기존 코드와 점진적 통합 | Round 10 | 사용자 확인 |

## Goal
에이전틱 OS를 Mac Mini M1/M2 Pro(32GB RAM)에서 실행하여, Outlook/Gmail 연동으로 메일을 자동 분류하고, CEO에게 브리핑 요약을 제공하며, LLM 하이브리드(FreeLLMAPI 기본, Claude 미분류, LM Studio 캐시)로 분류 정확도 95%+를 달성하고, Telegram 알림으로 모니터링하는 시스템을 점진적으로 구축한다.

## Constraints
- Mac Mini M1/M2 Pro, 32GB RAM
- 월 예산 20만원 이하
- Graph API 요청 제한, 웹훅 갱신(3일), 보안 인증 고려
- LLM 하이브리드: FreeLLMAPI 기본, Claude 미분류, LM Studio 캐시
- 멀티테넌트는 아키텍처만 준비 (코드는 단일 Organization)
- 기존 코드와 점진적 통합

## Non-Goals
- 멀티테넌트 즉시 구현 (아키텍처만 준비)
- 전체 재구현 (점진적 통합)
- 예산 초과 솔루션

## Acceptance Criteria
- [ ] Outlook/Gmail 메일 수신 시 자동 분류 (정확도 95%+)
- [ ] CEO 대시보드에서 브리핑 요약 확인 가능
- [ ] Docker Compose로 전체 시스템 헬스체크 통과
- [ ] Telegram 알림으로 에러율 1% 이상 시 알림 수신
- [ ] GitHub Actions CI/CD 파이프라인 동작
- [ ] 기존 코드(8개 페르소나, ActionRouter 등)와 호환

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| Mac Mini로 충분한 성능 | 서버 사양 확인 | M1/M2 Pro, 32GB RAM 확인 |
| LLM 비용 관리 가능 | 비용 한계 질문 | FreeLLMAPI 기본, Claude 미분류만 |
| 멀티테넌트가 필요 | 시점 질문 | 아키텍처만 준비, 코드는 단일 Organization |
| CI/CD가 이미 있음 | 기존 도구 질문 | CI/CD 처음부터 구축 |

## Interview Transcript
<details>
<summary>Full Q&A (10 rounds)</summary>

### Round 1 (제약사항)
**Q:** Mac Mini 사양과 월 예산 한계는?
**A:** Mac Mini M1/M2 Pro, 32GB RAM, 월 예산 20만원 이하

### Round 2 (성공 기준)
**Q:** 분류 정확도 95%를 어떻게 측정?
**A:** 벤치마크 데이터셋

### Round 3 (제약사항)
**Q:** LLM 프로바이더 선택 기준은?
**A:** 혼합 기준 (FreeLLMAPI 기본, Claude 미분류, LM Studio 캐시)

### Round 4 (목표 명확성)
**Q:** CEO 대시보드에서 가장 중요한 기능은?
**A:** 브리핑 요약

### Round 5 (성공 기준)
**Q:** Docker Compose 통합 성공 기준은?
**A:** 헬스체크 통과

### Round 6 (컨텍스트)
**Q:** 기존 GitHub 저장소에서 사용 중인 CI/CD가 있나요?
**A:** 없음

### Round 7 (제약사항)
**Q:** Graph API 웹훅 시 주요 제약사항은?
**A:** 모두 해당 (요청 제한, 웹훅 갱신, 보안 인증)

### Round 8 (목표 명확성)
**Q:** 멀티테넌트가 필요한 시점은?
**A:** 아키텍처만 준비

### Round 9 (성공 기준)
**Q:** 모니터링 알림 채널과 기준은?
**A:** Telegram + 에러율 1%

### Round 10 (컨텍스트)
**Q:** 기존 코드와 새 컴포넌트의 통합 방식은?
**A:** 점진적 통합

</details>
