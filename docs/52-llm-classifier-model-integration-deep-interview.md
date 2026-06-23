# Deep Interview Spec: LLM 분류기 업그레이드 + 70개 모델 점진 통합

## Metadata

- Interview ID: deep-int-llm-classifier-models-20260623
- 작성일: 2026-06-23
- 유형: brownfield planning
- 입력: 사용자 요청, 기존 계획 문서, `packages/persona/src/mail/classifier.ts`, `packages/db/prisma/schema.prisma`, LLM infrastructure files
- 방식: 추가 사용자 질의 없이 저장소 근거와 기존 계획 문서를 기반으로 한 **가정 검증형 딥인터뷰 합성**
- Status: SPEC_READY_WITH_EXPLICIT_ASSUMPTIONS
- Restated Goal: 규칙 기반 MailClassifier(현재 정확도 85%)를 규칙+LLM 하이브리드 구조로 업그레이드해 95% 이상 정확도를 달성하고, Prisma business model 92개 중 현재 핵심 22개 외 미사용 70개를 운영 기능 단위로 점진 통합한다.

---

## 1. Clarity Breakdown

| Dimension              | Score | Weight |  Weighted | 근거                                                      |
| ---------------------- | ----: | -----: | --------: | --------------------------------------------------------- |
| Goal Clarity           |  0.88 |   0.30 |     0.264 | 85%→95%, 70개 모델 통합이라는 목표가 명확함               |
| Constraint Clarity     |  0.72 |   0.25 |     0.180 | 비용/지연/보안/운영 모드는 기존 문서 기반이나 일부 미확정 |
| Success Criteria       |  0.76 |   0.30 |     0.228 | 정확도 목표는 명확하지만 benchmark 구성은 추가 고정 필요  |
| Context Clarity        |  0.84 |   0.15 |     0.126 | 현재 classifier, schema, LLM adapter 상태 확인됨          |
| **Total Clarity**      |       |        | **0.798** |                                                           |
| **Residual Ambiguity** |       |        | **20.2%** | 실행 가능하나 benchmark/운영 정책 선고정 필요             |

### 해석

계획 수립은 가능하다. 다만 구현 착수 전에 아래 4개를 반드시 선고정해야 한다.

1. 95% 정확도를 측정할 golden dataset의 라벨 기준
2. 외부 LLM provider에 보낼 수 있는 메일 범위와 PII redaction 기준
3. LLM 호출 비율/월 예산/timeout 기준
4. “70개 모델 통합 완료”의 정의: CRUD 노출인지, 실제 운영 유스케이스 연결인지

---

## 2. Topology

| Component                  | Status         | Description                                                                   | Coverage Note                                    |
| -------------------------- | -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| Rule MailClassifier        | active         | `classifier.ts`의 키워드/발신자 기반 8개 페르소나 분류                        | 빠르고 안정적이나 문맥/복합 의도 한계            |
| Persona Router             | active         | classification 결과를 persona 처리로 라우팅                                   | 기존 `ClassificationResult` 호환성 유지 필수     |
| Outlook Adapter            | active         | Graph mail → MailItem → classifier → router                                   | sync classifier 호출부를 async 전환해야 함       |
| Data-plane PersonaPipeline | active         | Bronze/Silver/Gold pipeline에서 classification metadata 처리                  | async classifier signature 확장 필요             |
| LLM Infrastructure         | partial        | `@aios/infrastructure/llm`에 LM Studio/OpenAI/Anthropic adapter 존재          | persona classifier와 미연결                      |
| LLM Limiter                | partial        | `llm-limiter.ts`에 비용/호출 제한 개념 존재                                   | provider 이름 불일치 및 simulation 응답 문제     |
| Prisma Schema              | active         | business model 92개 + auth model 3개                                          | 22 core + 70 integration target로 재고 정리 가능 |
| Quality/Validation Models  | unused/partial | `QualityGate`, `ValidationPlan`, `ValidationCheck`, `LlmCall`, `CostEvent` 등 | hybrid rollout gate에 우선 통합해야 함           |
| Automation Models          | unused/partial | Command/Workflow/Agent/Tool/Report 계열                                       | 분류 결과를 운영 action으로 연결하는 2차 wave    |
| Portal Registry Models     | unused/partial | Module/Block/Layout/Connector/Canvas/Config 계열                              | 후반부 UI/확장성 wave                            |

---

## 3. Established Facts

| Fact                                                   | Source                                     | Evidence                                                                             |
| ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| 현재 분류기는 규칙 기반이다                            | `classifier.ts`                            | 키워드 match rule 목록과 `classify()` sync API                                       |
| 분류 대상 카테고리는 8개 persona다                     | `classifier.ts`, schema `PersonaType`      | `WORK_SUPPORT`, `SALES`, `PRESALES`, `ENGINEER`, `PM`, `FINANCE`, `MARKETING`, `CEO` |
| 기존 요청 기준 현재 정확도는 85%다                     | 사용자 요청                                | “현재 규칙 기반 분류기(85% 정확도)”                                                  |
| 목표 정확도는 95%다                                    | 사용자 요청                                | “하이브리드 분류기(규칙+LLM, 목표 95%)”                                              |
| 기존 문서도 LLM classifier phase를 다룸                | `docs/plan-02-enhancement.md`              | confidence ≥0.9 rule fast path, confidence <0.9 LLM 흐름                             |
| LLM client abstraction이 이미 존재한다                 | `packages/infrastructure/llm/src/types.ts` | `LLMClient`, `LLMProvider`, completion result types                                  |
| LM Studio adapter가 존재한다                           | `lm-studio.ts`                             | OpenAI-compatible local endpoint 사용                                                |
| LLM limiter는 simulation 상태다                        | `llm-limiter.ts`                           | `callLLMWithFallback()`가 실제 client 호출 없이 문자열 응답 생성                     |
| provider 이름 체계가 불일치한다                        | `types.ts`, `llm-limiter.ts`               | `lm-studio/openai/anthropic` vs `freellmapi/claude/lmstudio`                         |
| business model 92개 기준은 현재 schema와 정합 가능하다 | `schema.prisma`                            | 총 95 model 중 Auth 보조 3개 제외 시 92개                                            |
| 점진 통합 대상 70개를 식별할 수 있다                   | `schema.prisma`                            | core 22개 제외 business model 70개                                                   |

---

## 4. Assumption Ledger

| Assumption                                                       | Confidence | Challenge                                         | Resolution for Plan                               |
| ---------------------------------------------------------------- | ---------: | ------------------------------------------------- | ------------------------------------------------- |
| 95% 정확도는 전체 accuracy만이 아니라 macro-F1도 필요하다        |       0.85 | class imbalance가 있으면 accuracy가 왜곡됨        | accuracy ≥95%, macro-F1 ≥0.93를 gate로 병행       |
| 외부 LLM 호출은 전체 메일이 아니라 불확실 케이스만 대상으로 한다 |       0.90 | 비용/지연/보안 부담                               | confidence ≥0.90 rule fast path 유지              |
| 기존 `classify()` API는 깨지면 안 된다                           |       0.95 | OutlookAdapter/Router가 동기 결과에 의존          | async hybrid API를 신규 추가하고 기존 API 유지    |
| benchmark dataset은 최소 500건이 필요하다                        |       0.80 | 작은 dataset은 95% 목표를 과대평가                | 최소 500건, 권장 1,000건으로 계획                 |
| 70개 모델은 CRUD 생성만으로 통합 완료가 아니다                   |       0.90 | 빈 API/화면만 늘어나는 위험                       | owner/use case/test/rollback 포함한 DoD 적용      |
| Auth 3개 모델은 “92개 business model”에서 제외한다               |       0.95 | 현재 schema는 95개 model 선언                     | 문서에서 reconciliation 명시                      |
| LLM fallback은 rule fallback보다 우선될 수 없다                  |       0.85 | LLM 장애가 메일 라우팅을 막으면 안 됨             | timeout/budget/invalid response 시 rule 결과 사용 |
| high-risk action은 분류 결과만으로 자동 실행하면 안 된다         |       0.95 | 잘못된 분류가 외부 발송/삭제/비용 액션으로 이어짐 | approval gate 필수                                |

---

## 5. Interview Rounds

<details>
<summary>가정 검증형 Q&A</summary>

### Round 1 — 목표 재진술

**Q:** 이번 작업의 핵심 목표는 무엇인가?  
**A:** 규칙 기반 메일 분류 정확도 85%를 하이브리드 규칙+LLM 분류기로 95% 이상까지 올리고, 미사용 Prisma business model 70개를 점진 통합한다.

### Round 2 — 정확도 정의

**Q:** 95%는 무엇을 기준으로 측정해야 하는가?  
**A:** 운영 golden dataset 기준 top-1 accuracy 95% 이상으로 본다. 단, 카테고리 불균형을 방지하기 위해 macro-F1 0.93 이상도 같이 gate로 둔다.

### Round 3 — dataset 구성

**Q:** benchmark dataset은 어떻게 구성해야 하는가?  
**A:** 최소 500건, 권장 1,000건 이상. 8개 페르소나가 균형 있게 포함되어야 하며, 복합/모호 케이스 20% 이상을 포함한다. 라벨은 2인 검수 후 불일치 시 owner가 확정한다.

### Round 4 — LLM 호출 범위

**Q:** 모든 메일을 LLM으로 보내는가?  
**A:** 아니다. 규칙 confidence ≥0.90이고 충돌이 없으면 rule fast path로 처리한다. 낮은 confidence, 규칙 충돌, 신규 패턴, high-impact mail만 LLM review로 보낸다.

### Round 5 — provider 정책

**Q:** 어떤 LLM provider를 기본으로 쓰는가?  
**A:** 로컬 LM Studio를 privacy-safe fallback으로 유지하고, 기존 계획의 FreeLLMAPI/Claude 개념은 provider policy에 흡수한다. 코드상 provider enum과 limiter name을 먼저 통일한다.

### Round 6 — 개인정보/보안

**Q:** 외부 LLM에 원문 메일을 전송할 수 있는가?  
**A:** 기본값은 redaction 후 전송이다. 민감한 재무/계약/개인정보 포함 메일은 local-only 또는 rule-only로 제한한다.

### Round 7 — API 호환성

**Q:** 기존 `MailClassifier.classify()`를 async로 바꿔도 되는가?  
**A:** 즉시 변경하지 않는다. 기존 sync API는 보존하고 신규 `HybridMailClassifier.classifyAsync()`를 추가한다. adapter/pipeline은 feature flag로 전환한다.

### Round 8 — 모델 수 정합성

**Q:** 현재 schema에는 95개 model인데 왜 92개라고 하는가?  
**A:** `Account`, `Session`, `VerificationToken`은 Auth 보조 모델로 business model에서 제외한다. 따라서 business model 92개 중 core 22개와 integration target 70개로 정리한다.

### Round 9 — 통합 우선순위

**Q:** 70개 모델은 어떤 순서로 통합해야 하는가?  
**A:** 분류·품질·관측성(Wave A) → 메일 인사이트·지식(Wave B) → 자동화 runtime(Wave C) → 코드/CI 협업(Wave D) → 포털/레지스트리 UX(Wave E) 순서다.

### Round 10 — 자동화 안전성

**Q:** 분류 결과가 자동 실행으로 이어져도 되는가?  
**A:** 읽기/추천은 가능하지만 외부 발송, 삭제, 비용, PR/issue 생성 같은 side effect는 approval gate를 거쳐야 한다.

### Round 11 — rollout 전략

**Q:** 하이브리드 분류기를 한 번에 전환하는가?  
**A:** 아니다. `rules-only` → `shadow` → `canary` → `hybrid`로 전환하고 kill-switch를 둔다.

### Round 12 — 성공 판정

**Q:** 최종 성공은 무엇인가?  
**A:** benchmark gate 통과, shadow/canary에서 regression 없음, latency/cost/security gate 통과, Wave별 모델 통합 DoD 충족, rollback 검증 완료다.

</details>

---

## 6. Requirements

### Functional Requirements

- FR1. 기존 `MailClassifier.classify()`와 결과 타입 호환성을 유지한다.
- FR2. 신규 하이브리드 classifier는 async API를 제공한다.
- FR3. 규칙 confidence ≥0.90이고 충돌이 없으면 LLM 호출 없이 rule result를 반환한다.
- FR4. LLM 응답은 허용된 8개 persona category 중 하나여야 한다.
- FR5. LLM 응답은 JSON schema/Zod 검증을 통과해야 한다.
- FR6. invalid/timeout/budget-exceeded/provider-down 상황에서는 rule fallback을 사용한다.
- FR7. 모든 LLM 호출은 provider/model/tokens/latency/cost를 기록한다.
- FR8. 분류 결정과 수정 이력은 감사 가능해야 한다.
- FR9. 70개 모델은 Wave별 owner/use case/API/test/rollback을 충족할 때만 통합 완료로 본다.
- FR10. high-risk action은 approval gate 없이 외부 side effect를 발생시키지 않는다.

### Non-Functional Requirements

- NFR1. hybrid p95 latency ≤ 2초
- NFR2. LLM call ratio ≤ 35%
- NFR3. monthly LLM budget 초과 시 자동 fallback
- NFR4. redaction test coverage 필수
- NFR5. rules-only kill-switch 1 config로 즉시 복귀
- NFR6. model wave별 migration blast radius 제한
- NFR7. benchmark 재현 가능성 보장

---

## 7. Non-Goals

- 모든 메일을 LLM으로 강제 분류하지 않는다.
- fine-tuning을 1차 목표로 하지 않는다.
- 70개 모델 전체 CRUD를 한 번에 생성하지 않는다.
- approval 없는 자동 외부 발송/삭제/PR 생성은 하지 않는다.
- 기존 sync classifier API를 즉시 제거하지 않는다.
- Auth 보조 모델 3개를 “미사용 70개” 범위에 포함하지 않는다.

---

## 8. Acceptance Criteria

- [ ] Golden dataset v1이 존재하고 라벨 기준이 문서화되어 있다.
- [ ] 현재 rule classifier 기준 정확도 85%가 재현된다.
- [ ] `HybridMailClassifier`의 rules-only mode가 기존 결과와 100% parity를 가진다.
- [ ] shadow mode에서 LLM 결과가 기록되지만 라우팅은 변경되지 않는다.
- [ ] benchmark accuracy ≥95%, macro-F1 ≥0.93이다.
- [ ] p95 latency ≤2초, LLM call ratio ≤35%다.
- [ ] PII redaction test가 외부 provider payload를 검증한다.
- [ ] provider timeout/budget exceeded/invalid JSON fallback 테스트가 통과한다.
- [ ] `MailClassification`, `LlmCall`, `CostEvent`, `AuditLog`가 실제 경로에 연결된다.
- [ ] 70개 모델 Wave A~E 각각 Definition of Done을 충족한다.

---

## 9. Remaining Ambiguities to Track

| Ambiguity                                  | Impact             | Decision Needed Before |
| ------------------------------------------ | ------------------ | ---------------------- |
| Golden dataset 실제 메일 확보 방식         | 정확도 목표 신뢰성 | 구현 Phase 1           |
| 외부 LLM 사용 가능한 데이터 등급           | 보안/법무 리스크   | LLM Gateway 구현       |
| FreeLLMAPI provider adapter 실제 존재 여부 | provider policy    | LLM Gateway 구현       |
| 사용자 피드백 UI 위치                      | feedback loop      | Shadow rollout         |
| Wave별 UI 노출 범위                        | 일정/범위          | 모델 Wave B 이후       |
| 자동화 command 생성 권한                   | side effect 안전성 | Wave C                 |

---

## 10. Interview Verdict

실행 계획 수립 가능. 단, 첫 구현 phase는 기능 구현보다 **측정·안전·호환성 기반선**을 먼저 고정해야 한다. 특히 benchmark dataset, provider naming, redaction, rules-only parity, shadow mode가 없으면 95% 목표와 70개 모델 통합 모두 운영 리스크가 크다.
