# Model Inventory Freeze — 95 Prisma Models

## Metadata

| Field              | Value                                  |
| ------------------ | -------------------------------------- |
| Date               | 2026-06-23                             |
| Source             | packages/db/prisma/schema.prisma       |
| Total Models       | 95                                     |
| Business Models    | 92                                     |
| Auth Models        | 3                                      |
| Core Models        | 22                                     |
| Target Models      | 70 (Wave A~E)                          |

---

## Summary

```
95 total = 22 core + 3 auth + 70 target
70 target = Wave A (12) + Wave B (10) + Wave C (19) + Wave D (17) + Wave E (12)
```

---

## Auth Models (3)

| Model              | Purpose                          |
| ------------------ | -------------------------------- |
| Account            | NextAuth OAuth 계정 관리         |
| Session            | NextAuth 사용자 세션 관리        |
| VerificationToken  | NextAuth 이메일 인증 토큰        |

---

## Core Business Models (22)

현재 핵심 업무에 사용 중인 모델. Phase 0에서 freeze.

| #  | Model               | Use Case                     | Owner            | Status |
| -- | ------------------- | ---------------------------- | ---------------- | ------ |
| 1  | User                | 사용자 계정 및 프로필        | auth-team        | active |
| 2  | Organization        | 조직/회사 단위 테넌트        | platform-team    | active |
| 3  | OrganizationMember  | 조직 멤버십 및 역할          | platform-team    | active |
| 4  | Customer            | 고객사 관리                  | sales-team       | active |
| 5  | Contact             | 고객 연락처                  | sales-team       | active |
| 6  | Project             | 프로젝트 관리                | pm-team          | active |
| 7  | ProjectRequest      | 프로젝트 요청/의뢰           | pm-team          | active |
| 8  | MailItem            | 수신 메일 원본 저장          | mail-team        | active |
| 9  | IngestionSource     | 데이터 수집 소스             | ingestion-team   | active |
| 10 | IngestionItem       | 수집된 개별 항목             | ingestion-team   | active |
| 11 | IngestionJob        | 수집 작업 실행 상태          | ingestion-team   | active |
| 12 | PresalesReview      | 프리세일즈 기술 검토         | presales-team    | active |
| 13 | Proposal            | 제안서 관리                  | sales-team       | active |
| 14 | Task                | 작업/할일 관리               | pm-team          | active |
| 15 | Agent               | AI 에이전트 정의             | agent-team       | active |
| 16 | Workflow            | 워크플로우 정의              | automation-team  | active |
| 17 | ExecutionRun        | 워크플로우 실행 기록         | automation-team  | active |
| 18 | RunStep             | 워크플로우 실행 단계         | automation-team  | active |
| 19 | ApprovalItem        | 승인 항목 관리               | automation-team  | active |
| 20 | ToolConnection      | 외부 도구 연동               | integration-team | active |
| 21 | KnowledgeDocument   | 지식 문서 관리               | knowledge-team   | active |
| 22 | FinanceItem         | 재무 항목                    | finance-team     | active |

---

## Wave A — 분류·관측성·품질 기반 (12 models)

하이브리드 분류기 출시 전후의 품질, 비용, 감사, 상태 전이를 저장.

| #  | Model              | Use Case                              | Owner           | API                                | Rollback                 |
| -- | ------------------ | ------------------------------------- | --------------- | ---------------------------------- | ------------------------ |
| 1  | Persona            | 페르소나 정의 및 설정                 | persona-team    | REST /api/personas                 | DROP TABLE; no FK        |
| 2  | MailClassification | 분류 결과 저장(rule/LLM/merged)       | classifier-team | REST /api/classifications          | DROP TABLE; shadow初期   |
| 3  | PersonaAction      | 페르소나별 액션 정의                  | persona-team    | REST /api/personas/:id/actions     | DROP TABLE               |
| 4  | LlmCall            | LLM 호출 기록                         | classifier-team | REST /api/llm/calls                | DROP TABLE; shadow only  |
| 5  | CostEvent          | 비용 이벤트                           | finance-team    | REST /api/costs                    | DROP TABLE               |
| 6  | ErrorEvent         | 에러 이벤트 기록                      | platform-team   | REST /api/errors                   | DROP TABLE               |
| 7  | AuditLog           | 감사 로그                             | compliance-team | REST /api/audit                    | DROP TABLE               |
| 8  | StateTransitionLog | 상태 전이 기록                        | automation-team | REST /api/transitions              | DROP TABLE               |
| 9  | QualityGate        | 벤치마크 pass/fail 기록               | qa-team         | REST /api/quality-gates            | DROP TABLE               |
| 10 | ValidationPlan     | 검증 계획 정의                        | qa-team         | REST /api/validation/plans         | DROP TABLE               |
| 11 | ValidationCheck    | 검증 항목 결과                        | qa-team         | REST /api/validation/checks        | DROP TABLE               |
| 12 | IntegrationHealth  | 통합 헬스 상태                        | platform-team   | REST /api/integrations/health      | DROP TABLE               |

**완료 기준**: benchmark 결과가 DB에 남고, LLM 호출 1건당 추적이 가능하며, `rules-only` rollback이 즉시 동작한다.

---

## Wave B — 메일 인사이트·지식·정책 메모리 (10 models)

메일 분류 결과를 지식/정책/후속 액션 후보로 확장.

| #  | Model                      | Use Case                            | Owner           | API                                 | Rollback               |
| -- | -------------------------- | ----------------------------------- | --------------- | ----------------------------------- | ---------------------- |
| 1  | AutomationMailAccount      | Outlook/Gmail 계정 연동             | mail-team       | REST /api/mail/accounts             | DELETE WHERE           |
| 2  | AutomationMailMessage      | 스레드 단위 메시지 관리             | mail-team       | REST /api/mail/messages             | DELETE WHERE           |
| 3  | MailInsightThread          | 메일 스레드 인사이트/요약           | classifier-team | REST /api/mail/insights             | DROP TABLE; proposed   |
| 4  | MailDerivedCandidate       | 메일 기반 후보 생성                 | classifier-team | REST /api/mail/candidates           | DROP TABLE; proposed   |
| 5  | AutomationKnowledgeDocument| 자동화 지식 문서                    | knowledge-team  | REST /api/knowledge/auto            | DROP TABLE             |
| 6  | KnowledgeChunk             | 지식 문서 청크(RAG용)               | knowledge-team  | REST /api/knowledge/chunks          | DROP TABLE             |
| 7  | PolicyMemory               | 분류 정책 메모리                    | classifier-team | REST /api/policies/memory           | DROP TABLE             |
| 8  | PolicyDecisionLog          | 정책 변경 이력                      | compliance-team | REST /api/policies/decisions        | DROP TABLE             |
| 9  | RuntimePolicy              | 런타임 정책/threshold config        | classifier-team | REST /api/policies/runtime          | DROP TABLE             |
| 10 | NotificationEvent          | 알림 이벤트                         | platform-team   | REST /api/notifications             | DROP TABLE             |

**완료 기준**: 스레드 단위 요약이 저장되고, 후보는 `proposed` 상태로만 생성되며, 정책 변경이 `PolicyDecisionLog`에 기록된다.

---

## Wave C — 자동화 워크플로 런타임 (19 models)

분류 결과 → command → approval → workflow 실행 흐름.

| #  | Model                        | Use Case                     | Owner           | API                                      | Rollback           |
| -- | ---------------------------- | ---------------------------- | --------------- | ---------------------------------------- | ------------------ |
| 1  | AutomationProject            | 자동화 프로젝트              | automation-team | REST /api/automation/projects            | DELETE WHERE       |
| 2  | AutomationProjectMember      | 자동화 프로젝트 멤버         | automation-team | REST /api/automation/projects/:id/members| DELETE WHERE       |
| 3  | AutomationWorkspace          | 자동화 워크스페이스          | automation-team | REST /api/automation/workspaces          | DELETE WHERE       |
| 4  | Command                      | 명령어 정의                  | automation-team | REST /api/commands                       | DELETE WHERE       |
| 5  | CommandRun                   | 명령어 실행 기록             | automation-team | REST /api/commands/:id/runs              | DELETE WHERE       |
| 6  | IntentAnalysis               | 의도 분석 결과               | classifier-team | REST /api/analysis/intent                | DROP TABLE         |
| 7  | RiskAnalysis                 | 위험 분석 결과               | classifier-team | REST /api/analysis/risk                  | DROP TABLE         |
| 8  | AutomationWorkflow           | 자동화 워크플로우            | automation-team | REST /api/automation/workflows           | DELETE WHERE       |
| 9  | AutomationWorkflowStep       | 자동화 워크플로우 단계       | automation-team | REST /api/automation/workflows/:id/steps | DELETE WHERE       |
| 10 | AgentAssignment              | 에이전트 할당                | agent-team      | REST /api/agents/:id/assignments         | DELETE WHERE       |
| 11 | ToolCall                     | 도구 호출 기록               | agent-team      | REST /api/agents/:id/tool-calls          | DELETE WHERE       |
| 12 | AgentMessage                 | 에이전트 메시지              | agent-team      | REST /api/agents/:id/messages            | DELETE WHERE       |
| 13 | AgentDecisionLog             | 에이전트 의사결정 로그       | agent-team      | REST /api/agents/:id/decisions           | DELETE WHERE       |
| 14 | AutomationApprovalRequest    | 자동화 승인 요청             | automation-team | REST /api/automation/approvals           | DELETE WHERE       |
| 15 | AutomationReport             | 자동화 리포트                | automation-team | REST /api/automation/reports             | DELETE WHERE       |
| 16 | ValidationResult             | 검증 결과                    | qa-team         | REST /api/validation/results             | DELETE WHERE       |
| 17 | ImprovementCandidate         | 개선 후보(proposed만)        | qa-team         | REST /api/improvements                   | DELETE WHERE       |
| 18 | RunTimelineItem              | 실행 타임라인 항목           | automation-team | REST /api/runs/:id/timeline              | DELETE WHERE       |
| 19 | OutboxEvent                  | 비동기 이벤트 아웃박스       | platform-team   | INTERNAL outbox pattern                  | DELETE WHERE       |

**완료 기준**: classification → command suggestion → approval 흐름이 검증되고, high-risk command는 approval 없이 실행 불가.

---

## Wave D — 코드·저장소·CI 협업 (17 models)

메일/명령 기반 개발 협업과 코드 변경 검증 흐름.

| #  | Model               | Use Case              | Owner           | API                                   | Rollback       |
| -- | ------------------- | --------------------- | --------------- | ------------------------------------- | -------------- |
| 1  | Repository          | 코드 저장소 정의      | devtools-team   | REST /api/repositories                | DELETE WHERE   |
| 2  | Branch              | 브랜치 관리           | devtools-team   | REST /api/repositories/:id/branches   | DELETE WHERE   |
| 3  | PullRequest         | PR 관리               | devtools-team   | REST /api/pull-requests               | DELETE WHERE   |
| 4  | CodeChange          | 코드 변경 기록        | devtools-team   | REST /api/code-changes                | DELETE WHERE   |
| 5  | ChangedFile         | 변경 파일 목록        | devtools-team   | REST /api/code-changes/:id/files      | DELETE WHERE   |
| 6  | BuildRun            | 빌드 실행 기록        | devtools-team   | REST /api/builds                      | DELETE WHERE   |
| 7  | TestRun             | 테스트 실행 기록      | devtools-team   | REST /api/tests                       | DELETE WHERE   |
| 8  | CodexTask           | Codex 작업 정의       | devtools-team   | REST /api/codex/tasks                 | DELETE WHERE   |
| 9  | CodexTaskLog        | Codex 작업 로그       | devtools-team   | REST /api/codex/tasks/:id/logs        | DELETE WHERE   |
| 10 | CursorSession       | Cursor 세션 관리      | devtools-team   | REST /api/cursor/sessions             | DELETE WHERE   |
| 11 | GitHubIssue         | GitHub 이슈 연동      | devtools-team   | REST /api/github/issues               | DELETE WHERE   |
| 12 | ExecutionPolicy     | 실행 정책             | automation-team | REST /api/policies/execution          | DELETE WHERE   |
| 13 | WorkflowTemplate    | 워크플로우 템플릿     | automation-team | REST /api/workflow-templates           | DELETE WHERE   |
| 14 | SkillCatalogItem    | 스킬 카탈로그 항목    | agent-team      | REST /api/skills                      | DELETE WHERE   |
| 15 | SkillRun            | 스킬 실행 기록        | agent-team      | REST /api/skills/:id/runs             | DELETE WHERE   |
| 16 | WorkBreakdownItem   | WBS 항목              | pm-team         | REST /api/wbs                         | DELETE WHERE   |
| 17 | AgentAssignmentRule | 에이전트 할당 규칙    | agent-team      | REST /api/agent-assignment-rules      | DELETE WHERE   |

**완료 기준**: 메일/command에서 GitHub issue 후보 생성 가능, PR/issue 생성은 approval gate 필요.

---

## Wave E — 포털·레지스트리·설정 UX (12 models)

포털 레지스트리 기반 구성과 설정 관리.

| #  | Model                | Use Case                | Owner           | API                                | Rollback       |
| -- | -------------------- | ----------------------- | --------------- | ---------------------------------- | -------------- |
| 1  | ModuleRegistry       | 모듈 레지스트리         | platform-team   | REST /api/registry/modules         | DELETE WHERE   |
| 2  | BlockRegistry        | 블록 레지스트리         | platform-team   | REST /api/registry/blocks          | DELETE WHERE   |
| 3  | LayoutSlot           | 레이아웃 슬롯           | platform-team   | REST /api/portal/layouts           | DELETE WHERE   |
| 4  | NodeRegistry         | 노드 레지스트리         | platform-team   | REST /api/registry/nodes           | DELETE WHERE   |
| 5  | QueryRegistry        | 쿼리 레지스트리         | platform-team   | REST /api/registry/queries         | DELETE WHERE   |
| 6  | ConnectorRegistry    | 커넥터 레지스트리       | integration-team| REST /api/registry/connectors      | DELETE WHERE   |
| 7  | Canvas               | 캔버스 UI 구성          | platform-team   | REST /api/portal/canvas            | DELETE WHERE   |
| 8  | MemoryItem           | 메모리 항목             | agent-team      | REST /api/memory                   | DELETE WHERE   |
| 9  | ReviewThread         | 리뷰 스레드             | qa-team         | REST /api/reviews                  | DELETE WHERE   |
| 10 | AutomationPortalTask | 포털 작업 항목          | platform-team   | REST /api/portal/tasks             | DELETE WHERE   |
| 11 | ConfigProfile        | 설정 프로필             | platform-team   | REST /api/config/profiles          | DELETE WHERE   |
| 12 | ConfigValue          | 설정 값(key-value)      | platform-team   | REST /api/config/values            | DELETE WHERE   |

**완료 기준**: registry 기반 포털 read path가 동작하고, config 변경은 snapshot rollback 가능.

---

## Validation

```
95 total
  = 22 core (active, freeze)
  + 3 auth (NextAuth)
  + 12 Wave A
  + 10 Wave B
  + 19 Wave C
  + 17 Wave D
  + 12 Wave E
  = 22 + 3 + 70 = 95 ✓
```
