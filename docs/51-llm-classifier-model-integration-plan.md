# 개발 계획서: LLM 기반 분류기 업그레이드 + 70개 Prisma 모델 점진적 통합

## Metadata

- 작성일: 2026-06-23
- 대상 범위: `packages/persona/src/mail/classifier.ts`, Outlook/Gmail 메일 분류 파이프라인, `packages/db/prisma/schema.prisma`
- 현재 기준: 규칙 기반 메일 분류기 정확도 85%
- 목표 기준: 규칙+LLM 하이브리드 분류기 정확도 95% 이상
- 모델 기준: Prisma business model 92개 중 핵심 사용 22개, 점진 통합 대상 70개
- 재고 정합성: 현재 `schema.prisma`에는 총 95개 model 선언이 있으며, `Account`, `Session`, `VerificationToken` 3개 NextAuth/Auth 모델을 제외하면 business model 92개다.

---

## 1. 목표

현재 `MailClassifier`는 키워드/발신자 기반 규칙으로 `WORK_SUPPORT`, `SALES`, `PRESALES`, `ENGINEER`, `PM`, `FINANCE`, `MARKETING`, `CEO` 8개 페르소나를 분류한다. 규칙 기반은 빠르고 비용이 없지만, 표현 다양성·문맥·복합 의도를 충분히 반영하지 못한다.

이번 계획의 목표는 다음 두 가지다.

1. **분류기 업그레이드**
   - 현재 규칙 기반 정확도 85%를 유지 가능한 기준선으로 고정한다.
   - 규칙 confidence가 높은 메일은 즉시 처리하고, 낮거나 충돌하는 메일만 LLM으로 보강한다.
   - 목표 정확도 95% 이상, macro-F1 0.93 이상, p95 지연 2초 이하를 달성한다.

2. **70개 Prisma 모델 점진 통합**
   - 현재 핵심 업무에 쓰이는 22개 business model은 유지한다.
   - 미사용 또는 부분 사용 상태의 70개 business model을 기능 파도(wave) 단위로 통합한다.
   - 모델을 먼저 노출하지 않고, **유스케이스 → 서비스/API → UI/운영 → 검증** 순서로 연결한다.

---

## 2. 현재 상태 요약

### 2.1 분류기

`packages/persona/src/mail/classifier.ts` 기준 현재 구조:

- 동기 API: `classify(mail: MailItem): ClassificationResult`
- 출력: `category`, `confidence`, `matchedRules`, 선택적 `originalCategory`
- 규칙 방식: keyword/domain match 후 가장 높은 confidence 규칙 선택
- 기본 fallback: `work-support-default`, confidence 0.5
- 최고 confidence: CEO/계약/승인류 0.9
- 주요 한계:
  - LLM/문맥 판단 없음
  - `ClassificationResultSchema`가 정의되어 있으나 classify 반환 검증에 사용되지 않음
  - 일부 규칙은 제목만 검사하고 일부는 제목+본문 검사
  - `결제/payment`, `bug/버그`처럼 카테고리 간 충돌 키워드 존재
  - LLM 호출 제한기(`llm-limiter.ts`)는 존재하지만 실제 LLM client와 연결되지 않은 시뮬레이션 상태

### 2.2 LLM 인프라

기존 활용 가능 자산:

- `packages/infrastructure/llm/src/types.ts`
  - `LLMClient`, `LLMProvider`, `LLMMessage`, `LLMCompletionResult`
- `packages/infrastructure/llm/src/factory.ts`
  - LM Studio, OpenAI, Anthropic adapter factory
- `packages/infrastructure/llm/src/lm-studio.ts`
  - 로컬 OpenAI-compatible LM Studio client
- `packages/persona/src/mail/llm-limiter.ts`
  - FreeLLMAPI/Claude/LM Studio 예산·호출 제한 개념 존재

정합성 이슈:

- `LLMProvider` 타입은 `lm-studio | openai | anthropic`이다.
- `LLMLimiter`는 `freellmapi | claude | lmstudio` 문자열을 사용한다.
- 따라서 provider naming normalization이 선행되어야 한다.

### 2.3 Prisma 모델 재고

`schema.prisma` 현재 선언 수:

| 범주                          | 모델 수 | 설명                                         |
| ----------------------------- | ------: | -------------------------------------------- |
| 전체 `model` 선언             |      95 | 현재 파일 기준                               |
| Auth/NextAuth 보조 모델       |       3 | `Account`, `Session`, `VerificationToken`    |
| Business model                |      92 | 사용자 요청의 “기존 92개 Prisma 모델”과 일치 |
| 현재 핵심 사용 business model |      22 | Organization, Customer, Project, MailItem 등 |
| 점진 통합 대상 business model |      70 | 아래 Wave A~E 대상                           |

현재 핵심 22개 business model:

`User`, `Organization`, `OrganizationMember`, `Customer`, `Contact`, `Project`, `ProjectRequest`, `MailItem`, `IngestionSource`, `IngestionItem`, `IngestionJob`, `PresalesReview`, `Proposal`, `Task`, `Agent`, `Workflow`, `ExecutionRun`, `RunStep`, `ApprovalItem`, `ToolConnection`, `KnowledgeDocument`, `FinanceItem`

---

## 3. 핵심 설계 원칙

1. **규칙 기반 fast path 유지**
   - `confidence >= 0.90`이고 충돌 규칙이 없으면 기존 규칙 결과를 그대로 사용한다.
   - LLM은 모든 메일에 호출하지 않는다.

2. **LLM은 uncertainty resolver**
   - 규칙 confidence가 낮거나, 둘 이상의 카테고리가 근접하거나, 키워드 충돌이 있거나, 신규 패턴이면 LLM을 호출한다.

3. **비동기 신규 API를 추가하고 기존 API는 유지**
   - 기존 `MailClassifier.classify()`는 동기/규칙 기반으로 유지한다.
   - 신규 `HybridMailClassifier.classifyAsync()`를 추가해 Outlook/Gmail adapter에서 단계적으로 전환한다.

4. **출력 스키마 고정**
   - LLM 응답은 JSON schema/Zod로 검증한다.
   - invalid JSON, hallucinated category, confidence 범위 초과는 즉시 fallback한다.

5. **PII 최소화**
   - 외부 LLM에는 이메일 주소, 전화번호, 계좌, 주민/사업자번호, 토큰, URL query secret을 redaction한 payload만 전송한다.
   - 민감도 높음 또는 고객계약/재무 원문은 LM Studio 우선 또는 rule-only로 제한한다.

6. **70개 모델은 “테이블 노출”이 아니라 “운영 기능 통합”으로 처리**
   - 모델별 CRUD만 만들면 성공으로 보지 않는다.
   - 각 모델은 owner persona, source event, API contract, UI use case, verification gate가 있어야 통합 완료로 본다.

---

## 4. 하이브리드 분류기 아키텍처

```text
MailItem
  ↓
[Normalize + Redact]
  ↓
[RuleClassifier]
  ├─ confidence ≥ 0.90 and no conflict → ACCEPT_RULE
  ├─ confidence 0.70~0.89 → LLM_REVIEW
  ├─ confidence < 0.70 → LLM_REQUIRED
  └─ conflicting categories → LLM_TIE_BREAK
        ↓
[LLMClassifier]
        ↓
[Schema Validation + Safety Guard]
        ↓
[Decision Merger]
        ├─ LLM confident → ACCEPT_LLM
        ├─ LLM/rule disagree + high risk → NEEDS_REVIEW
        └─ LLM failed/timeout/budget → RULE_FALLBACK
        ↓
[Persist MailClassification + LlmCall + AuditLog]
        ↓
[PersonaRouter]
```

### 4.1 신규/변경 컴포넌트

| 컴포넌트                         | 위치                                             | 역할                                                                     |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| `RuleClassifier` adapter         | `packages/persona/src/mail/rule-classifier.ts`   | 기존 `MailClassifier`를 내부 dependency로 감싸고 점수/충돌 정보를 표준화 |
| `LLMClassifier`                  | `packages/persona/src/mail/llm-classifier.ts`    | provider client 호출, JSON schema 검증, retry/fallback                   |
| `HybridMailClassifier`           | `packages/persona/src/mail/hybrid-classifier.ts` | rule fast path + LLM fallback + decision merge                           |
| `MailRedactor`                   | `packages/persona/src/mail/redactor.ts`          | PII 제거/마스킹                                                          |
| `ClassificationBenchmarkRunner`  | `packages/persona/src/mail/benchmark.ts`         | golden dataset으로 정확도/macro-F1/latency 측정                          |
| `PromptVersion` config           | `RuntimePolicy` 또는 config file                 | prompt version, threshold, provider policy 관리                          |
| `ClassificationFeedback` service | `MailClassification`, `PolicyDecisionLog` 활용   | CEO/사용자 수정 사항 수집, rule promotion 후보 생성                      |

### 4.2 API 호환성

기존 코드:

```ts
const classification = this.classifier.classify(mailItem);
await this.router.route(mailItem, classification);
```

전환 후:

```ts
const classification = await this.hybridClassifier.classifyAsync(mailItem, {
  mode: process.env.HYBRID_CLASSIFIER_MODE ?? "shadow",
});
await this.router.route(mailItem, classification);
```

운영 모드:

| 모드          | 설명                                 | 라우팅 기준   |
| ------------- | ------------------------------------ | ------------- |
| `rules-only`  | 현재 방식                            | rule result   |
| `shadow`      | LLM 결과를 기록만 하고 라우팅은 rule | rule result   |
| `canary`      | 일부 트래픽만 hybrid 라우팅          | hybrid result |
| `hybrid`      | 전체 hybrid 사용                     | hybrid result |
| `kill-switch` | 즉시 rules-only로 복귀               | rule result   |

---

## 5. 분류 품질 측정 계획

### 5.1 Golden dataset

| 항목             | 기준                                       |
| ---------------- | ------------------------------------------ |
| 최소 크기        | 500건                                      |
| 권장 크기        | 1,000건 이상                               |
| 카테고리         | 8개 페르소나 균형 분포                     |
| 모호/복합 케이스 | 전체의 20% 이상                            |
| 언어             | 한국어/영어 혼합, 실제 운영 메일 표현 포함 |
| 라벨             | 2인 검수, 불일치 시 CEO/운영 owner 확정    |
| 금지             | prompt에 정답 라벨 누출, train/eval 중복   |

### 5.2 지표

| 지표                   |        현재 |         목표 | Gate      |
| ---------------------- | ----------: | -----------: | --------- |
| Accuracy               |         85% |        ≥ 95% | 필수      |
| Macro-F1               |      미측정 |       ≥ 0.93 | 필수      |
| High-risk false route  |      미측정 |         ≤ 1% | 필수      |
| p95 latency            | < 1ms(rule) | ≤ 2s(hybrid) | 필수      |
| LLM call ratio         |          0% |        ≤ 35% | 비용 gate |
| Rule fallback success  |   해당 없음 |        ≥ 99% | 장애 gate |
| JSON schema valid rate |   해당 없음 |      ≥ 99.5% | 품질 gate |

### 5.3 Confusion matrix 중점 영역

- `CEO` vs `FINANCE`: “결제/payment/승인” 충돌
- `PM` vs `ENGINEER`: “bug/issue/작업” 충돌
- `SALES` vs `PRESALES`: “견적 요청 + 기술 검토” 복합 의도
- `WORK_SUPPORT` vs 모든 카테고리: fallback 과다 여부
- `MARKETING` vs spam/newsletter성 외부 메일

---

## 6. 70개 Prisma 모델 통합 Wave

### Wave A — 분류·관측성·품질 기반 (12개)

목표: 하이브리드 분류기 출시 전후의 품질, 비용, 감사, 상태 전이를 저장한다.

모델:

`Persona`, `MailClassification`, `PersonaAction`, `LlmCall`, `CostEvent`, `ErrorEvent`, `AuditLog`, `StateTransitionLog`, `QualityGate`, `ValidationPlan`, `ValidationCheck`, `IntegrationHealth`

주요 산출물:

- `MailClassification` 저장 경로 연결
- `LlmCall` token/latency/provider 기록
- `CostEvent` 월 예산 추적
- `AuditLog`, `StateTransitionLog`로 분류 결정 변경 이력 저장
- `ValidationPlan/Check`, `QualityGate`로 benchmark gate 실행 기록
- `/api/integrations/health`와 `IntegrationHealth` persistence 연결

완료 기준:

- benchmark 실행 결과가 DB에 남는다.
- LLM 호출 1건당 provider/model/token/latency/cost가 추적된다.
- `HYBRID_CLASSIFIER_MODE=rules-only`로 즉시 rollback 가능하다.

### Wave B — 메일 인사이트·지식·정책 메모리 (10개)

목표: 메일 분류 결과를 지식/정책/후속 액션 후보로 확장한다.

모델:

`AutomationMailAccount`, `AutomationMailMessage`, `MailInsightThread`, `MailDerivedCandidate`, `AutomationKnowledgeDocument`, `KnowledgeChunk`, `PolicyMemory`, `PolicyDecisionLog`, `RuntimePolicy`, `NotificationEvent`

주요 산출물:

- Outlook/Gmail account와 thread persistence
- thread 단위 요약/다음 액션 생성
- 메일 기반 고객/프로젝트/지식 후보 생성
- 분류 정책과 prompt threshold를 `RuntimePolicy` 또는 `PolicyMemory`로 관리
- 분류 불확실/실패/비용 초과 event를 `NotificationEvent`에 기록

완료 기준:

- 동일 thread의 다중 메일이 하나의 `MailInsightThread`로 묶인다.
- 후보 생성은 자동 생성이 아니라 `proposed` 상태로만 시작한다.
- 정책 변경은 `PolicyDecisionLog`에 남는다.

### Wave C — 자동화 워크플로 런타임 (19개)

목표: 분류 결과가 command/run/workflow/agent assignment로 이어지는 운영 흐름을 만든다.

모델:

`AutomationProject`, `AutomationProjectMember`, `AutomationWorkspace`, `Command`, `CommandRun`, `IntentAnalysis`, `RiskAnalysis`, `AutomationWorkflow`, `AutomationWorkflowStep`, `AgentAssignment`, `ToolCall`, `AgentMessage`, `AgentDecisionLog`, `AutomationApprovalRequest`, `AutomationReport`, `ValidationResult`, `ImprovementCandidate`, `RunTimelineItem`, `OutboxEvent`

주요 산출물:

- 분류 결과 → command suggestion → approval request 흐름
- 위험 분석과 validation 결과 저장
- agent/tool call/result timeline 연결
- outbox 기반 비동기 이벤트 처리

완료 기준:

- CEO/운영자가 분류 결과에서 command run을 생성할 수 있다.
- high-risk action은 반드시 `AutomationApprovalRequest`를 거친다.
- 실패/재시도는 `OutboxEvent`와 timeline에 추적된다.

### Wave D — 코드·저장소·CI 협업 (17개)

목표: 메일/명령 기반 개발 협업과 코드 변경 검증 흐름을 연결한다.

모델:

`Repository`, `Branch`, `PullRequest`, `CodeChange`, `ChangedFile`, `BuildRun`, `TestRun`, `CodexTask`, `CodexTaskLog`, `CursorSession`, `GitHubIssue`, `ExecutionPolicy`, `WorkflowTemplate`, `SkillCatalogItem`, `SkillRun`, `WorkBreakdownItem`, `AgentAssignmentRule`

주요 산출물:

- 고객/내부 메일에서 GitHub issue/PR 후보 생성
- 코드 변경, 빌드, 테스트 실행 결과 추적
- agent assignment rule과 skill run 기록 연결

완료 기준:

- 메일 또는 command run에서 GitHub issue 후보가 생성된다.
- `BuildRun/TestRun`이 실제 CI 결과를 반영한다.
- 자동 PR/issue 생성은 approval gate 없이는 실행되지 않는다.

### Wave E — 포털·레지스트리·확장 UX (12개)

목표: 운영 포털에서 모듈/블록/커넥터/캔버스/설정과 장기 메모리를 관리한다.

모델:

`ModuleRegistry`, `BlockRegistry`, `LayoutSlot`, `NodeRegistry`, `QueryRegistry`, `ConnectorRegistry`, `Canvas`, `MemoryItem`, `ReviewThread`, `AutomationPortalTask`, `ConfigProfile`, `ConfigValue`

주요 산출물:

- 포털 레이아웃/블록 registry persistence
- connector registry와 health/status 연결
- review thread와 portal task 기반 운영 backlog
- config profile/value를 통한 환경별 설정 관리

완료 기준:

- registry 기반 포털 구성이 DB에서 로드된다.
- connector 상태와 health check가 운영 화면에 표시된다.
- configuration 변경은 프로필 단위로 rollback 가능하다.

---

## 7. 일정 계획

| 주차 | Phase             | 핵심 작업                                                              | 산출물                            | Gate                                |
| ---: | ----------------- | ---------------------------------------------------------------------- | --------------------------------- | ----------------------------------- |
|    1 | Baseline          | benchmark dataset 정의, schema inventory 고정, 현재 rule 정확도 재측정 | golden dataset v1, model registry | 85% 기준선 재현                     |
|    2 | Hybrid Foundation | rule adapter, async classifier interface, redactor, schema validation  | `HybridMailClassifier` skeleton   | 기존 tests pass + rules-only parity |
|    3 | LLM Gateway       | provider normalization, real LLM client 연결, timeout/retry/fallback   | `LLMClassifier`, provider policy  | invalid/timeout fallback 100%       |
|    4 | Shadow Mode       | shadow logging, `MailClassification/LlmCall` 저장, dashboard metric    | shadow rollout                    | rule 라우팅 무변경                  |
|    5 | Benchmark/Canary  | offline benchmark, confusion 개선, 10% canary                          | benchmark report                  | accuracy ≥95%, p95 ≤2s              |
|    6 | Wave A            | 분류·품질·감사 모델 통합                                               | DB persistence + quality gates    | rollback verified                   |
|    7 | Wave B            | 메일 인사이트/지식/정책 통합                                           | thread/candidate/policy           | no auto-create without approval     |
|    8 | Wave C            | 자동화 workflow runtime 통합                                           | command/workflow/agent logs       | approval enforced                   |
|    9 | Wave D            | 코드/CI 협업 모델 통합                                                 | issue/PR/CI evidence              | CI result reflected                 |
|   10 | Wave E            | 포털/레지스트리/설정 UX 통합                                           | registry/config portal            | config rollback verified            |

---

## 8. 구현 상세 작업 목록

### 8.1 분류기 업그레이드

| 우선순위 | 작업                                | 대상 파일/영역                              | 비고                                            |
| -------- | ----------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| P0       | benchmark dataset loader            | `packages/persona/src/mail/benchmark.ts`    | 구현 전 gate                                    |
| P0       | 기존 `MailClassifier` 반환 Zod 검증 | `classifier.ts`                             | schema drift 방지                               |
| P0       | null/empty-safe normalization       | `classifier.ts` 또는 wrapper                | Graph/API payload 안전성                        |
| P0       | async hybrid API 추가               | `hybrid-classifier.ts`                      | 기존 sync API 보존                              |
| P0       | PII redaction                       | `redactor.ts`                               | 외부 LLM 전 필수                                |
| P0       | provider naming normalization       | `llm-limiter.ts`, LLM factory               | `lm-studio/openai/anthropic/free-llm` 정책 통일 |
| P0       | real LLM call 연결                  | `llm-classifier.ts`                         | 현재 simulation 제거                            |
| P1       | prompt versioning                   | `RuntimePolicy`/config                      | rollback 가능해야 함                            |
| P1       | shadow mode logging                 | adapter/pipeline                            | 운영 무영향 관측                                |
| P1       | feedback loop                       | `PolicyDecisionLog`, `ImprovementCandidate` | rule promotion 후보                             |

### 8.2 모델 통합 공통 Definition of Done

각 모델 또는 모델 그룹은 아래 조건을 만족해야 완료다.

- [ ] owner persona 또는 owner service가 명시됨
- [ ] 생성/수정/조회/삭제 또는 read-only policy가 명시됨
- [ ] API contract 또는 service method가 존재함
- [ ] UI 노출 여부와 미노출 사유가 명시됨
- [ ] organization/project/customer scoping이 검증됨
- [ ] seed/migration/rollback 전략이 있음
- [ ] 단위 테스트와 최소 1개 통합 테스트가 있음
- [ ] audit/log/error/metric 경로가 있음
- [ ] rollout flag 또는 rollback path가 있음

---

## 9. 검증 계획

### 9.1 테스트 레벨

| 레벨        | 내용                                                                      |
| ----------- | ------------------------------------------------------------------------- |
| Unit        | rule match, LLM JSON parsing, fallback, redaction, limiter                |
| Contract    | `ClassificationResult` schema, provider result schema, Prisma select/omit |
| Integration | OutlookAdapter/Gmail pipeline → hybrid classifier → PersonaRouter         |
| Benchmark   | golden dataset offline run, confusion matrix                              |
| Shadow QA   | 운영 메일 mirror에서 rule vs LLM 비교                                     |
| Load        | 100/1,000건 batch 분류, p95 latency, memory/cost                          |
| Security    | PII redaction, prompt injection, provider egress policy                   |

### 9.2 Release gate

- [ ] rules-only 결과가 기존 `MailClassifier`와 100% 호환된다.
- [ ] shadow mode에서 라우팅 결과는 기존 rule 결과만 사용된다.
- [ ] benchmark accuracy ≥ 95%, macro-F1 ≥ 0.93이다.
- [ ] high-risk false route ≤ 1%이다.
- [ ] p95 hybrid latency ≤ 2초이다.
- [ ] LLM budget/call limit 초과 시 rule fallback이 동작한다.
- [ ] 외부 provider 전송 payload에서 PII redaction test가 통과한다.
- [ ] 모델 Wave별 rollback SQL 또는 feature flag가 존재한다.

---

## 10. 주요 리스크와 1차 대응

| 리스크                | 영향                   | 대응                                         |
| --------------------- | ---------------------- | -------------------------------------------- |
| benchmark 정의가 약함 | 95% 목표 무의미        | golden dataset 라벨 기준 선고정              |
| LLM 비용 폭증         | 예산 초과              | call ratio 제한, cache, local-first fallback |
| LLM 지연              | 메일 처리 지연         | rule fast path, timeout, async queue         |
| PII 유출              | 보안/법적 리스크       | redaction, local routing, egress audit       |
| prompt injection      | 오분류/악성 라우팅     | system prompt 고정, JSON schema, action 분리 |
| 모델 70개 일괄 통합   | migration blast radius | Wave별 feature flag/rollback                 |
| 기존 sync API 파손    | OutlookAdapter 등 장애 | 신규 async API 병행, canary 전환             |
| provider 이름 불일치  | fallback 실패          | provider enum/policy 통합                    |

---

## 11. 최종 산출물

1. 하이브리드 분류기 코드와 운영 모드 flag
2. benchmark dataset + 정확도 리포트
3. LLM provider policy + 비용/호출 제한
4. PII redaction + prompt injection guard
5. `MailClassification`, `LlmCall`, `CostEvent`, `AuditLog` 기반 관측성
6. 70개 모델 Wave A~E 통합
7. red-team 검증 반영 replan
8. rollback/kill-switch/runbook
