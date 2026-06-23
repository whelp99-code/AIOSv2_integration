# 재계획서: LLM 분류기 업그레이드 + 70개 모델 통합

## 변경 이력

- 원본 계획: `docs/51-llm-classifier-model-integration-plan.md`
- 딥인터뷰: `docs/52-llm-classifier-model-integration-deep-interview.md`
- 레드팀 검증: `docs/53-llm-classifier-model-integration-red-team.md`
- 변경 사유: P0 리스크 4건 반영
  1. benchmark 미고정 상태에서 95% 정확도 검증 불가
  2. LLM provider/limiter/fallback 실운영 연결 부족
  3. PII/보안 경계 부족
  4. 70개 모델 일괄 통합 blast radius 과대
- 변경 일시: 2026-06-23

---

## 1. Replan 핵심 변경

| 변경 전                                             | 변경 후                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Week 1부터 hybrid 구현                              | Phase 0에서 benchmark/model inventory/security baseline 먼저 고정                           |
| LLM classifier 구현과 limiter 연결을 같은 단계 처리 | provider normalization + real client gateway + circuit breaker를 별도 P0로 분리             |
| 70개 모델 통합을 큰 phase로 처리                    | Wave A~E로 분리하고 각 wave마다 read path → shadow write → canary enable → full enable 적용 |
| Accuracy 95% 단일 지표                              | accuracy ≥95%, macro-F1 ≥0.93, high-risk false route ≤1%, p95 latency ≤2s 병행              |
| feedback loop에서 rule 승격 가능                    | 1차 범위에서는 `ImprovementCandidate` proposed만 생성, 자동 승격 금지                       |
| LLM payload 보안은 일반 원칙                        | redaction/prompt injection/egress policy를 release gate로 승격                              |

---

## 2. 수정된 실행 순서

### Phase 0 — Baseline Freeze & Safety Contract (3~5일)

**목표**  
구현 전에 측정 기준, 모델 재고, 보안 정책, rollout 계약을 고정한다.

**작업**

| 작업                    | 산출물                                                    | Gate                                   |
| ----------------------- | --------------------------------------------------------- | -------------------------------------- |
| Golden dataset 정의     | `classification-golden-v1` manifest                       | 최소 500건, 권장 1,000건               |
| 라벨 기준 문서화        | persona별 positive/negative examples                      | 2인 검수 규칙                          |
| 현재 rule baseline 측정 | baseline report                                           | accuracy 85% 재현                      |
| Model inventory freeze  | 22 core + 70 target 목록                                  | `95 total = 92 business + 3 auth` 명시 |
| Security policy 작성    | redaction/egress/provider 등급                            | 외부 LLM payload 정책 승인             |
| Rollout mode 정의       | `rules-only`, `shadow`, `canary`, `hybrid`, `kill-switch` | config 기반 전환 가능                  |

**완료 기준**

- [ ] 현재 rule classifier의 85% baseline을 재현한다.
- [ ] benchmark dataset과 holdout이 prompt 개발과 분리된다.
- [ ] 70개 target 모델 목록이 appendix로 고정된다.
- [ ] 외부 LLM 전송 가능/불가 데이터 등급이 정의된다.

---

### Phase 1 — LLM Gateway Hardening (1주)

**목표**  
LLM 호출을 실제 client, limiter, fallback, redaction, observability와 연결한다.

**작업**

| 작업                          | 대상                                         | 변경 내용                                                               |
| ----------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| Provider normalization        | `llm-limiter.ts`, `@aios/infrastructure/llm` | `lm-studio`, `openai`, `anthropic`, optional `free-llm` alias 정책 통일 |
| Real client adapter 연결      | `llm-classifier.ts`                          | `LLMClientFactory` 사용, simulation 제거                                |
| Timeout/retry/circuit breaker | LLM gateway                                  | provider별 timeout, retry budget, failure threshold                     |
| Token/cost cap                | limiter/policy                               | request cap, daily cap, monthly cap                                     |
| PII redaction                 | `redactor.ts`                                | email/phone/account/token/url secret masking                            |
| Prompt injection guard        | prompt/test                                  | “본문은 데이터” 정책, 악성 지시문 무시                                  |
| LLM response schema           | Zod schema                                   | category whitelist, confidence 0~1, reasoning length 제한               |

**완료 기준**

- [ ] provider down 시 rule fallback이 100% 동작한다.
- [ ] invalid JSON 응답이 schema guard에 걸린다.
- [ ] PII redaction unit test가 통과한다.
- [ ] LLM call은 `LlmCall` 또는 임시 event logger에 provider/model/token/latency를 남긴다.

---

### Phase 2 — Compatibility Layer & Hybrid Classifier (1주)

**목표**  
기존 sync rule classifier를 보존하면서 async hybrid classifier를 추가한다.

**작업**

| 작업                                      | 대상                         | 비고                                   |
| ----------------------------------------- | ---------------------------- | -------------------------------------- |
| `ClassificationResultSchema.parse()` 적용 | `classifier.ts`              | 기존 결과 검증                         |
| null/empty-safe normalization             | `classifier.ts` 또는 wrapper | `subject/body/from` 방어               |
| `RuleClassifier` wrapper                  | `rule-classifier.ts`         | rule result + conflict metadata        |
| `HybridMailClassifier.classifyAsync()`    | `hybrid-classifier.ts`       | 신규 async API                         |
| Decision merger                           | hybrid classifier            | rule/LLM disagreement policy           |
| Feature flag                              | adapter/pipeline             | mode별 behavior                        |
| Rules-only parity test                    | tests                        | 기존 `MailClassifier` 결과와 100% 동일 |

**분류 정책**

| 조건                                  | 처리          |
| ------------------------------------- | ------------- |
| rule confidence ≥0.90 and no conflict | rule accept   |
| rule confidence 0.70~0.89             | LLM review    |
| rule confidence <0.70                 | LLM required  |
| category conflict                     | LLM tie-break |
| high-risk disagreement                | manual review |
| LLM timeout/invalid/budget            | rule fallback |

**완료 기준**

- [ ] 기존 `MailClassifier.classify()` 호출부를 깨지 않는다.
- [ ] `HybridMailClassifier.classifyAsync()`가 rules-only mode에서 기존 결과와 동일하다.
- [ ] high-risk disagreement는 자동 라우팅하지 않고 review 상태가 된다.

---

### Phase 3 — Shadow Mode & Offline Benchmark (1주)

**목표**  
운영 라우팅을 바꾸지 않고 LLM 품질을 측정한다.

**작업**

| 작업                     | 산출물                                 |
| ------------------------ | -------------------------------------- |
| Offline benchmark runner | confusion matrix, per-category metrics |
| Shadow logging           | rule result vs LLM result 비교         |
| Prompt/version tracking  | prompt version별 성능 비교             |
| Cost/latency dashboard   | p50/p95, call ratio, provider failure  |
| Manual review queue      | high-risk disagreement 수집            |

**Gate**

- [ ] Accuracy ≥ 95%
- [ ] Macro-F1 ≥ 0.93
- [ ] High-risk false route ≤ 1%
- [ ] p95 latency ≤ 2초
- [ ] LLM call ratio ≤ 35%
- [ ] schema valid rate ≥ 99.5%

**실패 시 조치**

- Accuracy 미달: prompt/rule conflict 개선 후 재측정
- Latency 초과: call ratio 감소, local/cache 우선, timeout 축소
- Cost 초과: threshold 상향, provider policy 조정
- Security 실패: 외부 provider 차단, local-only 전환

---

### Phase 4 — Canary Rollout & Wave A 모델 통합 (1주)

**목표**  
hybrid를 제한 트래픽에 적용하고 분류·품질·관측성 모델을 먼저 통합한다.

**Wave A 모델 12개**

`Persona`, `MailClassification`, `PersonaAction`, `LlmCall`, `CostEvent`, `ErrorEvent`, `AuditLog`, `StateTransitionLog`, `QualityGate`, `ValidationPlan`, `ValidationCheck`, `IntegrationHealth`

**작업**

| 단계          | 작업                               | Gate                    |
| ------------- | ---------------------------------- | ----------------------- |
| Read path     | 기존/신규 기록 조회 API            | no mutation risk        |
| Shadow write  | classification/llm/cost/audit 기록 | 라우팅 무변경           |
| Canary enable | 10% 트래픽 hybrid 라우팅           | error budget 충족       |
| Full enable   | 전체 hybrid 전환                   | rollback rehearsal 완료 |

**완료 기준**

- [ ] `MailClassification`에 rule/LLM/merged result가 남는다.
- [ ] `LlmCall`과 `CostEvent`가 budget dashboard에 반영된다.
- [ ] `AuditLog/StateTransitionLog`가 분류 변경 이력을 기록한다.
- [ ] `QualityGate`로 benchmark pass/fail을 기록한다.
- [ ] `HYBRID_CLASSIFIER_MODE=rules-only`로 즉시 rollback된다.

---

### Phase 5 — Wave B: 메일 인사이트·지식·정책 (1주)

**모델 10개**

`AutomationMailAccount`, `AutomationMailMessage`, `MailInsightThread`, `MailDerivedCandidate`, `AutomationKnowledgeDocument`, `KnowledgeChunk`, `PolicyMemory`, `PolicyDecisionLog`, `RuntimePolicy`, `NotificationEvent`

**변경된 범위 제한**

- 자동 entity 생성 금지
- 후보는 `MailDerivedCandidate.status = proposed`로만 생성
- policy 변경은 approval 후 적용
- prompt/threshold config는 versioned read path부터 시작

**완료 기준**

- [ ] thread 단위 메일 요약이 저장된다.
- [ ] 후보 생성은 proposed 상태로만 남는다.
- [ ] 정책 변경은 `PolicyDecisionLog`에 기록된다.
- [ ] notification은 즉시 알림과 daily digest를 구분한다.

---

### Phase 6 — Wave C: 자동화 워크플로 Runtime (1~2주)

**모델 19개**

`AutomationProject`, `AutomationProjectMember`, `AutomationWorkspace`, `Command`, `CommandRun`, `IntentAnalysis`, `RiskAnalysis`, `AutomationWorkflow`, `AutomationWorkflowStep`, `AgentAssignment`, `ToolCall`, `AgentMessage`, `AgentDecisionLog`, `AutomationApprovalRequest`, `AutomationReport`, `ValidationResult`, `ImprovementCandidate`, `RunTimelineItem`, `OutboxEvent`

**레드팀 반영 제한**

- 분류 결과가 자동 side effect를 만들 수 없음
- command suggestion까지만 자동 생성
- `AutomationApprovalRequest` 승인 후 workflow 실행
- `OutboxEvent`로 retry/idempotency 보장

**완료 기준**

- [ ] classification → command suggestion → approval 흐름이 검증된다.
- [ ] high-risk command는 approval 없이는 실행되지 않는다.
- [ ] timeline/report/validation result가 command run에 연결된다.

---

### Phase 7 — Wave D: 코드·CI 협업 모델 (1주)

**모델 17개**

`Repository`, `Branch`, `PullRequest`, `CodeChange`, `ChangedFile`, `BuildRun`, `TestRun`, `CodexTask`, `CodexTaskLog`, `CursorSession`, `GitHubIssue`, `ExecutionPolicy`, `WorkflowTemplate`, `SkillCatalogItem`, `SkillRun`, `WorkBreakdownItem`, `AgentAssignmentRule`

**완료 기준**

- [ ] 메일/command에서 GitHub issue 후보 생성 가능
- [ ] PR/issue 생성은 approval gate 필요
- [ ] CI 결과가 `BuildRun/TestRun`에 반영됨
- [ ] agent assignment rule은 read-only preview 후 enable

---

### Phase 8 — Wave E: 포털·레지스트리·설정 UX (1주)

**모델 12개**

`ModuleRegistry`, `BlockRegistry`, `LayoutSlot`, `NodeRegistry`, `QueryRegistry`, `ConnectorRegistry`, `Canvas`, `MemoryItem`, `ReviewThread`, `AutomationPortalTask`, `ConfigProfile`, `ConfigValue`

**완료 기준**

- [ ] registry 기반 포털 구성 read path가 동작한다.
- [ ] config profile/value 변경은 snapshot rollback 가능하다.
- [ ] connector registry와 health status가 연결된다.
- [ ] portal task/review thread가 운영 backlog로 표시된다.

---

## 3. 수정된 Timeline

| Phase                                |  기간 | 핵심 Gate                               |
| ------------------------------------ | ----: | --------------------------------------- |
| 0. Baseline Freeze & Safety Contract | 3~5일 | benchmark/model/security baseline 고정  |
| 1. LLM Gateway Hardening             |   1주 | real client, fallback, redaction 통과   |
| 2. Compatibility & Hybrid Classifier |   1주 | rules-only parity 100%                  |
| 3. Shadow & Benchmark                |   1주 | accuracy ≥95%, macro-F1 ≥0.93           |
| 4. Canary + Wave A                   |   1주 | hybrid canary + 관측성 모델 통합        |
| 5. Wave B                            |   1주 | mail insight/policy candidate 안전 통합 |
| 6. Wave C                            | 1~2주 | approval-gated automation runtime       |
| 7. Wave D                            |   1주 | code/CI collaboration records           |
| 8. Wave E                            |   1주 | portal registry/config rollback         |

총 기간: **8~10주**

---

## 4. 실행 중단 조건

아래 조건 중 하나라도 발생하면 즉시 `rules-only` 또는 이전 Wave로 rollback한다.

| Trigger                    | 조치                                         |
| -------------------------- | -------------------------------------------- |
| benchmark accuracy < 95%   | hybrid rollout 중단, shadow 유지             |
| high-risk false route > 1% | canary 중단, manual review 확대              |
| p95 latency > 2초 지속     | LLM threshold 상향, provider circuit breaker |
| LLM 월 예산 80% 도달       | 외부 provider 축소, local-only 전환          |
| PII redaction 실패         | 외부 provider 차단                           |
| schema migration error     | 해당 Wave rollback                           |
| approval bypass 발견       | automation wave 즉시 중단                    |

---

## 5. 최종 Verification Checklist

### Classifier

- [ ] 현재 rule baseline 85% 재현
- [ ] rules-only parity 100%
- [ ] hybrid accuracy ≥95%
- [ ] macro-F1 ≥0.93
- [ ] high-risk false route ≤1%
- [ ] p95 latency ≤2초
- [ ] LLM call ratio ≤35%
- [ ] invalid JSON/timeout/provider down/budget exceeded fallback 통과
- [ ] PII redaction/prompt injection test 통과

### Models

- [ ] 22 core / 70 target model inventory 고정
- [ ] Wave A~E별 owner/use case/API/test/rollback 명시
- [ ] Wave별 migration 또는 schema usage가 독립 rollback 가능
- [ ] organization/project/customer scoping 검증
- [ ] audit/log/error/metric 연결
- [ ] approval gate 필요한 side effect가 차단됨

### Operations

- [ ] shadow/canary/hybrid/kill-switch 동작
- [ ] dashboard가 accuracy/cost/latency/failure를 표시
- [ ] daily digest와 critical alert 분리
- [ ] rollback runbook 검증

---

## 6. 최종 평가

레드팀 반영 후 계획은 실행 가능하다. 단, 구현 우선순위는 “LLM을 붙이는 것”이 아니라 **측정 가능성, 보안 경계, 실제 provider gateway, 호환성, rollback**을 먼저 완성하는 것이다. 70개 모델 통합은 Wave A부터 제한적으로 시작하고, 각 Wave의 gate를 통과할 때만 다음 Wave로 진행한다.
