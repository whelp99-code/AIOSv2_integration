# 개발 현황 분석 및 상세 실행 계획서

## 문서 정보

| Field | Value |
|---|---|
| 문서 번호 | 55 |
| 제목 | 개발 현황 분석 및 상세 실행 계획서 |
| 작성일 | 2026-06-23 |
| 기반 문서 | docs/54-llm-classifier-model-integration-replan.md |
| 프리셋 | gjc-auto-dev-claude-cursor-mimo |

---

## 1. 프로젝트 현황 종합

### 1.1 프로젝트 개요

AIOSv2_integration는 5개 프로젝트(AIOS v1, F-aios-v3-core, sangfor-mcp-workflow, vibe-coding-os, AIOS-JARVIS)를 통합한 모놀리식 모노레포 플랫폼. Turborepo + pnpm 기반.

| 항목 | 값 |
|---|---|
| 기술 스택 | Next.js 16 + Express + tRPC + Prisma 6 |
| 데이터베이스 | PostgreSQL + Redis |
| LLM | OpenAI + Anthropic + LM Studio |
| 패키지 수 | 앱 2개 + 패키지 ~20개 + 플러그인 2개 |
| 현재 상태 | 전체 서비스 중지 |

### 1.2 기존 개발 진행 이력

| Phase | 제목 | 상태 |
|---|---|---|
| Phase 1 | Repo Baseline & Workspace 설정 | ✅ 완료 |
| Phase 2 | Core Workflow Domain & Application | ✅ 완료 |
| Phase 3 | Agent Runtime (Hermes/OpenCode) | ✅ 완료 |
| Phase 4 | GitHub PR Automation | ✅ 완료 |
| Phase 5 | Kanban Integration | ✅ 완료 |
| Phase 6 | Final Integration & Gap Analysis | ✅ 완료 |

### 1.3 현재 활성 작업: LLM 분류기 업그레이드

Replan 문서(docs/54) 기반으로 Phase 0 — Baseline Freeze & Safety Contract 진행 중.

- Ultragoal: `.gjc/_session-019ef42a-1944-7000-968d-6157da4a6c65/ultragoal/goals.json`
- Active Goal: G001 (Golden dataset 정의)

---

## 2. Phase 0 Goal 상세 분석

### 2.1 G001 — Golden Dataset 정의 🟡 진행 중

**목표**: classification-golden-v1 manifest 생성. 최소 500건, 8개 페르소나 균형 분포.

**산출물 현황**:

| 파일 | 상태 | 내용 |
|---|---|---|
| `golden-data/manifest.json` | ✅ 존재 | 500건, 8 카테고리 균형 분포 |
| `golden-data/generator.ts` | ✅ 존재 | Golden dataset 생성 스크립트 |
| `golden-data/label-guide.md` | ✅ 존재 | 라벨 가이드 문서 |
| `golden-data/classification-golden-v1.json` | ✅ 존재 | 실제 dataset |

**Dataset 통계**:

| 항목 | 값 |
|---|---|
| 총 건수 | 500건 |
| 모호/복합 케이스 | 113건 (22.6%) |
| 한국어 | 367건 (73.4%) |
| 영어 | 98건 (19.6%) |
| 혼합 | 35건 (7.0%) |
| Easy / Medium / Hard | 177 / 243 / 80 |
| Eval split | 400건 |
| Train split | 100건 |

**카테고리 분포**:

| Category | Count |
|---|---|
| WORK_SUPPORT | 70 |
| SALES | 70 |
| ENGINEER | 70 |
| PRESALES | 60 |
| PM | 60 |
| FINANCE | 60 |
| CEO | 60 |
| MARKETING | 50 |

**미완료 사항**:
- [ ] train/eval split 격리 검증 (prompt에 정답 라벨 누출 여부)
- [ ] 2인 검수 규칙 적용 확인
- [ ] Goal 완료 마킹

**완료 조치**:
1. `classification-golden-v1.json`에서 eval split 데이터에 label이 포함되어 있는지 검증
2. generator 스크립트의 label 생성 로직이 분류기 호출 시 누출되지 않는지 확인
3. G001 status를 `completed`로 변경

---

### 2.2 G002 — Rule Baseline 측정 🔴 Gate 미달 (핵심 블로커)

**목표**: `MailClassifier`로 golden dataset 벤치마크 실행, accuracy 85% 재현.

**산출물**:

| 파일 | 상태 | 내용 |
|---|---|---|
| `benchmark.ts` | ✅ 존재 | 벤치마크 실행기 |
| `baseline-report.json` | ✅ 존재 | 측정 결과 |

**측정 결과 (심각)**:

| Metric | 측정값 | 목표 | Delta |
|---|---|---|---|
| **Accuracy** | **61.6%** | **85%** | **-23.4%p** |
| Macro Precision | 65.93% | — | — |
| Macro Recall | 61.04% | — | — |
| **Macro F1** | **61.86%** | — | — |
| Weighted F1 | 61.80% | — | — |

**Per-Category F1 Score (내림차순)**:

| Category | F1 | Precision | Recall | Support | 상태 |
|---|---|---|---|---|---|
| FINANCE | 0.674 | 0.703 | 0.647 | 60 | 🟡 |
| CEO | 0.642 | 0.652 | 0.633 | 60 | 🟡 |
| SALES | 0.618 | 0.636 | 0.600 | 70 | 🟡 |
| MARKETING | 0.608 | 0.639 | 0.580 | 50 | 🟡 |
| PRESALES | 0.566 | 0.595 | 0.540 | 60 | 🔴 |
| ENGINEER | 0.570 | 0.584 | 0.557 | 70 | 🔴 |
| PM | 0.517 | 0.541 | 0.495 | 60 | 🔴 |
| WORK_SUPPORT | 0.516 | 0.461 | 0.586 | 70 | 🔴 |

**Confusion Matrix 분석 (주요 충돌)**:

| 충돌 쌍 | 원인 |
|---|---|
| WORK_SUPPORT ↔ PM | 업무 요청과 PM 지시의 키워드 겹침 |
| WORK_SUPPORT ↔ ENGINEER | 기술 지원 문의와 엔지니어링 작업 혼동 |
| ENGINEER ↔ PM | 기술 작업과 프로젝트 관리 경계 모호 |
| PRESALES ↔ SALES | 프리세일즈 제안과 영업 문의 유사 |
| CEO ↔ FINANCE | 경영진 지시와 재무 관련 표현 중복 |
| MARKETING ↔ SALES | 마케팅 캠페인과 영업 프로모션 혼동 |

**근본 원인**:
1. 규칙 기반 분류기의 키워드 매칭이 한국어 변형/조합 표현에 취약
2. 카테고리 간 경계 사례(ambiguous case)가 22.6%로 고포
3. 한국어 비율 73.4% — 영어 중심 키워드 규칙의 한계
4. 난이도 hard 케이스 16% — 암묵적 맥락/뉘앙스 의존

---

### 2.3 G003 — Model Inventory Freeze ⏳ 대기

**목표**: schema.prisma에서 95개 model 추출, 22 core + 70 target 분류.

**산출물**:

| 파일 | 상태 | 내용 |
|---|---|---|
| `model-inventory.json` | ✅ 존재 | 95개 model 메타데이터 |
| `model-inventory.md` | ✅ 존재 | 문서 버전 |

**미완료 사항**:
- [ ] status 필드 보완 (current vs target 상태 명시)
- [ ] owner/use case/API 필드 검증
- [ ] Wave A~E 분류 검증
- [ ] Goal 완료 마킹

---

### 2.4 G004 — Security Policy 작성 ⏳ 대기

**목표**: 외부 LLM 전송 가능/불가 데이터 등급 정의, PII redaction 규칙.

**산출물**:

| 파일 | 상태 | 내용 |
|---|---|---|
| `security-policy.md` | ✅ 존재 | 3-tier 데이터 분류, PII redaction 규칙, provider 등급 |

**정책 요약**:

| Tier | Name | 외부 LLM 전송 |
|---|---|---|
| T1 | Safe for External | ✅ 허용 |
| T2 | Local-Only / Redacted | ⚠️ 조건부 |
| T3 | Never Leave Boundary | ❌ 차단 |

**Release Gate 상태 (모두 🔴 미구현)**:
- [ ] PII redaction unit test 100% 통과
- [ ] Prompt injection test suite 100% 통과
- [ ] Egress audit log 기능
- [ ] Provider tier enforcement
- [ ] Budget enforcement
- [ ] Circuit breaker 동작
- [ ] Response schema validation

**완료 조치**: 문서 승인 처리. 구현은 Phase 1에서 진행.

---

### 2.5 G005 — Rollout Mode 정의 ⏳ 대기

**목표**: 5개 rollout mode 정의, config 기반 전환 가능.

**산출물**:

| 파일 | 상태 | 내용 |
|---|---|---|
| `rollout-modes.md` | ✅ 존재 | 5개 mode 상세 문서 |
| `rollout-config.ts` | ✅ 존재 | Zod schema + decision helpers 구현 완료 |
| `rollout-modes.md` | ✅ 존재 | 전환 다이어그램, rollback procedures |

**구현된 Config Schema**:
- `ClassifierModeSchema` — 5 mode enum
- `RolloutConfigSchema` — mode + canaryPercentage + transitionTriggers
- `loadRolloutConfig()` — 환경변수 기반 로더
- `shouldUseHybrid()` — 하이브리드 사용 여부 결정
- `shouldLogShadow()` — shadow 로그 여부
- `shouldCallLLM()` — LLM 호출 허용 여부
- `getEffectiveMode()` — kill-switch 반영 effective mode
- `checkRollbackTriggers()` — 자동 rollback 판단

**완료 조치**: config schema unit test 통과 확인 후 Goal 완료 마킹.

---

## 3. 블로커 분석 및 해결 전략

### 3.1 핵심 블로커: G002 Baseline 61.6%

Phase 0의 Gate 조건 중 "accuracy 85% 재현"을 현재 규칙 분류기로 달성 불가.

### 3.2 전략 A — 규칙 강화로 85% 도전

**방법**:
1. Confusion matrix 기반 충돌 쌍 분석
2. WORK_SUPPORT/PM/ENGINEER 키워드 겹침 해소 — 고유 키워드 추출
3. 한국어 조사/어미 변형 패턴 추가
4. 카테고리별 confidence 임계값 조정
5. 하드 케이스 수동 패턴 추가

**예상 효과**: 61.6% → 70~75% (85% 달성은 불확실)

**장점**:
- Phase 0 gate를 충족하고 정상 진행
- rule-only mode의 baseline 품질 향상

**단점**:
- 85% 달성 보장 없음
- 하드 케이스(16%)에 대한 구조적 한계
- 한국어 변형 패턴 추가 시 유지보수 복잡도 증가

### 3.3 전략 B — Baseline 인정, LLM 보완 전략으로 전환

**방법**:
1. 61.6%를 현재 rule baseline으로 고정 기록
2. Gate 조건 수정: rule baseline 목표를 60%로 하향, hybrid 목표는 95% 유지
3. Phase 1에서 LLM Gateway가 부족한 23~34%p를 보완하도록 설계
4. Hybrid classifier에서 rule confidence < 0.70일 때 LLM 필수 호출

**예상 효과**: Phase 0 즉시 완료, Phase 1 빠른 착수

**장점**:
- Phase 0 블로커 즉시 해소
- LLM 도입의 명확한 정당성 확보 (61.6% → 95%)
- 하드 케이스를 LLM이 처리하도록 구조화

**단점**:
- Phase 0의 "85% 재현" 목표 미달성
- LLM에 대한 의존도 증가
- Phase 1 완료 전까지 운영 품질 제한

### 3.4 전략 C — 하이브리드 접근 (권장)

**방법**:
1. 규칙을 부분 강화하여 70%까지 향상 (WORK_SUPPORT, PM, ENGINEER 집중)
2. Baseline을 70%로 고정 기록
3. Gate 조건을 "rule baseline 70% + hybrid 목표 95%"로 수정
4. Phase 1에서 나머지 25%p를 LLM이 보완

**예상 효과**: 61.6% → ~70%, Phase 0 합리적 완료

**장점**:
- 규칙의 실질적 개선 + LLM 보완의 이중 안전망
- Phase 0 gate 합리적 조정
- Phase 1 설계의 명확한 기준점

**단점**:
- 규칙 강화에 1~2일 추가 소요
- Gate 조건 변경에 대한 문서 업데이트 필요

---

## 4. 상세 실행 계획

### 4.1 Phase 0 잔여 작업 완료 (2~3일)

#### Day 1: G002 해결

| 작업 | 담당 | 산출물 |
|---|---|---|
| Confusion matrix 상세 분석 | architect | 충돌 쌍별 원인 분석표 |
| WORK_SUPPORT 고유 키워드 추출 | executor | classifier.ts 패치 |
| PM 고유 키워드 추출 | executor | classifier.ts 패치 |
| ENGINEER 고유 키워드 추출 | executor | classifier.ts 패치 |
| 한국어 조사 변형 패턴 추가 | executor | classifier.ts 패치 |
| 벤치마크 재실행 | executor | baseline-report.json 업데이트 |
| 결과 검증 | critic | 목표 달성 여부 확인 |

**목표**: Accuracy 70% 이상 달성

#### Day 2: G001, G003, G004, G005 완료

| 작업 | 담당 | 산출물 |
|---|---|---|
| G001 golden dataset 검증 | critic | train/eval 격리 확인 |
| G003 model inventory 보완 | executor | status 필드 추가 |
| G004 security policy 승인 | architect | 승인 처리 |
| G005 rollout config test | executor | unit test 통과 |
| Phase 0 Goal 전체 완료 마킹 | planner | goals.json 업데이트 |

#### Day 3: Phase 0 Gate 검증

| Gate 조건 | 기준 | 검증 방법 |
|---|---|---|
| Rule baseline | ≥ 70% (수정된 목표) | benchmark.ts 실행 |
| Golden dataset 분리 | train/eval label 누출 없음 | 코드 리뷰 |
| Model inventory | 95 total = 92 business + 3 auth | JSON 검증 |
| Security policy | 문서 승인 | 승인 확인 |
| Rollout config | schema test 통과 | vitest 실행 |

---

### 4.2 Phase 1 — LLM Gateway Hardening (1주)

**목표**: LLM 호출을 실제 client, limiter, fallback, redaction, observability와 연결.

#### 작업 목록

| # | 작업 | 대상 파일 | 산출물 |
|---|---|---|---|
| 1.1 | Provider normalization | `llm-limiter.ts`, `infrastructure/llm/` | 통일된 provider 인터페이스 |
| 1.2 | Real client adapter 연결 | `llm-classifier.ts` | simulation 제거, 실제 API 호출 |
| 1.3 | Timeout/retry/circuit breaker | LLM gateway | provider별 정책 |
| 1.4 | Token/cost cap | limiter/policy | request/daily/monthly cap |
| 1.5 | PII redaction | `redactor.ts` | email/phone/account/token/url masking |
| 1.6 | Prompt injection guard | prompt/test | "본문은 데이터" 정책, 악성 지시문 무시 |
| 1.7 | LLM response schema | Zod schema | category whitelist, confidence 0~1 |

#### 완료 기준

- [ ] provider down 시 rule fallback 100% 동작
- [ ] invalid JSON 응답이 schema guard에 걸림
- [ ] PII redaction unit test 통과
- [ ] LLM call이 provider/model/token/latency를 기록

#### 의존성

- Phase 0 G002 완료 (baseline 고정)
- Phase 0 G004 완료 (security policy 승인)

---

### 4.3 Phase 2 — Compatibility Layer & Hybrid Classifier (1주)

**목표**: 기존 sync rule classifier를 보존하면서 async hybrid classifier 추가.

#### 작업 목록

| # | 작업 | 대상 파일 | 산출물 |
|---|---|---|---|
| 2.1 | ClassificationResultSchema.parse() | `classifier.ts` | 기존 결과 검증 |
| 2.2 | null/empty-safe normalization | `classifier.ts` | subject/body/from 방어 |
| 2.3 | RuleClassifier wrapper | `rule-classifier.ts` | rule result + conflict metadata |
| 2.4 | HybridMailClassifier.classifyAsync() | `hybrid-classifier.ts` | 신규 async API |
| 2.5 | Decision merger | hybrid classifier | rule/LLM disagreement policy |
| 2.6 | Feature flag | adapter/pipeline | mode별 behavior |
| 2.7 | Rules-only parity test | tests | 기존 MailClassifier 결과와 100% 동일 |

#### 분류 정책

| 조건 | 처리 |
|---|---|
| rule confidence ≥0.90 and no conflict | rule accept |
| rule confidence 0.70~0.89 | LLM review |
| rule confidence <0.70 | LLM required |
| category conflict | LLM tie-break |
| high-risk disagreement | manual review |
| LLM timeout/invalid/budget | rule fallback |

#### 완료 기준

- [ ] 기존 MailClassifier.classify() 호출부 깨지지 않음
- [ ] HybridMailClassifier.classifyAsync()가 rules-only mode에서 기존 결과와 동일
- [ ] high-risk disagreement가 자동 라우팅하지 않고 review 상태

---

### 4.4 Phase 3 — Shadow Mode & Offline Benchmark (1주)

**목표**: 운영 라우팅을 바꾸지 않고 LLM 품질 측정.

#### 작업 목록

| # | 작업 | 산출물 |
|---|---|---|
| 3.1 | Offline benchmark runner | confusion matrix, per-category metrics |
| 3.2 | Shadow logging | rule result vs LLM result 비교 |
| 3.3 | Prompt/version tracking | prompt version별 성능 비교 |
| 3.4 | Cost/latency dashboard | p50/p95, call ratio, provider failure |
| 3.5 | Manual review queue | high-risk disagreement 수집 |

#### Gate (모두 충족해야 Phase 4 진입)

| Metric | 기준 |
|---|---|
| Accuracy | ≥ 95% |
| Macro-F1 | ≥ 0.93 |
| High-risk false route | ≤ 1% |
| P95 latency | ≤ 2초 |
| LLM call ratio | ≤ 35% |
| Schema valid rate | ≥ 99.5% |

#### 실패 시 조치

| 실패 항목 | 조치 |
|---|---|
| Accuracy 미달 | prompt/rule conflict 개선 후 재측정 |
| Latency 초과 | call ratio 감소, local/cache 우선 |
| Cost 초과 | threshold 상향, provider policy 조정 |
| Security 실패 | 외부 provider 차단, local-only 전환 |

---

### 4.5 Phase 4 — Canary Rollout & Wave A 모델 통합 (1주)

**목표**: hybrid를 제한 트래픽에 적용하고, 관측성/분류 모델 12개 먼저 통합.

#### Wave A 모델 (12개)

`Persona`, `MailClassification`, `PersonaAction`, `LlmCall`, `CostEvent`, `ErrorEvent`, `AuditLog`, `StateTransitionLog`, `QualityGate`, `ValidationPlan`, `ValidationCheck`, `IntegrationHealth`

#### Rollout 단계

| 단계 | 작업 | Gate |
|---|---|---|
| Read path | 기존/신규 기록 조회 API | no mutation risk |
| Shadow write | classification/llm/cost/audit 기록 | 라우팅 무변경 |
| Canary enable | 10% 트래픽 hybrid 라우팅 | error budget 충족 |
| Full enable | 전체 hybrid 전환 | rollback rehearsal 완료 |

#### 완료 기준

- [ ] MailClassification에 rule/LLM/merged result 기록
- [ ] LlmCall, CostEvent가 budget dashboard에 반영
- [ ] AuditLog/StateTransitionLog가 분류 변경 이력 기록
- [ ] QualityGate로 benchmark pass/fail 기록
- [ ] `HYBRID_CLASSIFIER_MODE=rules-only`로 즉시 rollback 가능

---

### 4.6 Phase 5~8 — Wave B~E 모델 통합 (4~6주)

| Phase | Wave | 모델 수 | 핵심 내용 | 기간 |
|---|---|---|---|---|
| Phase 5 | Wave B | 10개 | 메일 인사이트, 지식, 정책 | 1주 |
| Phase 6 | Wave C | 19개 | 자동화 워크플로 runtime | 1~2주 |
| Phase 7 | Wave D | 17개 | 코드/CI 협업 모델 | 1주 |
| Phase 8 | Wave E | 12개 | 포털, 레지스트리, 설정 UX | 1주 |

---

## 5. 전체 타임라인

| Phase | 기간 | 핵심 Gate | 상태 |
|---|---|---|---|
| Phase 0 | 2~3일 (잔여) | rule baseline 70%, security policy 승인 | 🟡 진행 중 |
| Phase 1 | 1주 | real client, fallback, redaction 통과 | ⏳ 대기 |
| Phase 2 | 1주 | rules-only parity 100% | ⏳ 대기 |
| Phase 3 | 1주 | accuracy ≥95%, macro-F1 ≥0.93 | ⏳ 대기 |
| Phase 4 | 1주 | hybrid canary + 관측성 모델 통합 | ⏳ 대기 |
| Phase 5 | 1주 | mail insight/policy candidate 안전 통합 | ⏳ 대기 |
| Phase 6 | 1~2주 | approval-gated automation runtime | ⏳ 대기 |
| Phase 7 | 1주 | code/CI collaboration records | ⏳ 대기 |
| Phase 8 | 1주 | portal registry/config rollback | ⏳ 대기 |

**총 예상 기간**: 8~10주 (Phase 0 잔여 포함)

---

## 6. 중단 조건 (Stop Conditions)

아래 조건 중 하나라도 발생하면 즉시 `rules-only` 또는 이전 Wave로 rollback한다.

| Trigger | 조치 |
|---|---|
| benchmark accuracy < 목표치 | hybrid rollout 중단, shadow 유지 |
| high-risk false route > 1% | canary 중단, manual review 확대 |
| p95 latency > 2초 지속 | LLM threshold 상향, circuit breaker |
| LLM 월 예산 80% 도달 | 외부 provider 축소, local-only 전환 |
| PII redaction 실패 | 외부 provider 차단 |
| schema migration error | 해당 Wave rollback |
| approval bypass 발견 | automation wave 즉시 중단 |

---

## 7. 위험 분석

| 위험 | 영향 | 확률 | 대응 |
|---|---|---|---|
| Rule baseline 85% 달성 불가 | Phase 0 gate 미달 | 높음 | 전략 C (하이브리드) 채택, gate 조건 조정 |
| LLM provider 비용 초과 | 운영 비용 증가 | 중간 | local LLM 우선, budget enforcement |
| PII 유출 | 보안 사고 | 낮음 | redactor + provider tier enforcement |
| 한국어 분류 정확도 부족 | 사용자 불만 | 중간 | LLM 보강, 한국어 특화 prompt |
| 70개 모델 blast radius | 시스템 불안정 | 중간 | Wave 분리, read path → shadow → canary |
| LLM latency 목표 미달 | 사용자 경험 저하 | 중간 | circuit breaker, local fallback |

---

## 8. 성공 지표

### Phase 0 완료 시

| Metric | Target |
|---|---|
| Rule baseline | ≥ 70% |
| Golden dataset | 500건, train/eval 분리 |
| Model inventory | 95 model 정의 완료 |
| Security policy | 승인 완료 |
| Rollout config | schema test 통과 |

### 최종 목표 (Phase 3 완료 시)

| Metric | Target |
|---|---|
| Hybrid Accuracy | ≥ 95% |
| Macro-F1 | ≥ 0.93 |
| High-risk false route | ≤ 1% |
| P95 latency | ≤ 2초 |
| LLM call ratio | ≤ 35% |
| Schema valid rate | ≥ 99.5% |

### 전체 완료 시 (Phase 8)

| Metric | Target |
|---|---|
| Model 통합 | 95개 (22 core + 70 target + 3 auth) |
| Hybrid classifier | full production |
| Rollback capability | 즉시 rules-only 전환 가능 |
| Monitoring | dashboard + alerting 완비 |
