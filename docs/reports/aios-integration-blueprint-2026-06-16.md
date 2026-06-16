# AIOS Integration Blueprint - 2026-06-16

## 1. 통합 기준

AIOS 통합의 기준은 “모든 앱을 하나로 합치는 것”이 아니라, 업무 lifecycle을 하나의 Portal과 하나의 운영 데이터 기준으로 연결하는 것이다.

```text
Mail
→ Customer / Partner
→ Opportunity / Proposal / Project
→ Estimate / Proposal Document / POC
→ Completion / CFO Handoff
→ Customer Product / Maintenance
→ Improvement / New Solution Development
```

기존 앱은 유지한다. AIOSv2는 proxy, adapter, use case, shared DB, evidence를 통해 운영 기준을 통합한다.

## 2. 시스템 역할 구조

```text
AIOSv2 Portal
├─ Mail Hub
│  ├─ Mail Intelligence
│  └─ learned mail knowledge
├─ CRM / Relationship
│  ├─ Customer
│  ├─ Partner
│  └─ Contact
├─ Revenue / Delivery Workflow
│  ├─ Opportunity
│  ├─ Proposal
│  ├─ Project
│  ├─ Estimate
│  └─ POC Plan
├─ Agent Orchestration
│  └─ F-aios-v3-core
├─ Product Maintenance
│  └─ MCP-workflow
├─ Development Automation
│  └─ Vibe-coding-os
└─ External Execution
   ├─ GitHub
   ├─ Slack
   └─ Sangfor / whelp99 MCP
```

## 3. 앱별 통합 방식

| 앱                | 기존 틀 유지 여부 | 통합 방식                              | AIOSv2 canonical 데이터                             |
| ----------------- | ----------------- | -------------------------------------- | --------------------------------------------------- |
| Mail Intelligence | 유지              | read-only proxy + 승인된 write         | MailThread, MailKnowledge, reply draft evidence     |
| AIOS v1           | 유지              | customer/task/knowledge proxy          | Customer, Partner, Contact, Task                    |
| F-aios-v3-core    | 유지              | workflow/RAG/orchestrator adapter      | WorkflowRun, AgentTask, Evidence                    |
| MCP-workflow      | 유지              | maintenance/learning/RAG adapter       | CustomerProduct, MaintenanceCase, KnowledgeDocument |
| Vibe-coding-os    | 유지              | project/RAG/agent/dev workflow adapter | ImprovementTask, DevProject, SolutionCandidate      |
| GitHub            | 외부 유지         | approval-gated connector               | PR/branch evidence                                  |
| Slack             | 외부 유지         | approval-gated send connector          | notification evidence                               |
| Sangfor/whelp99   | 외부 유지         | approval-gated device/tool connector   | maintenance/device evidence                         |

## 4. 데이터 저장 원칙

최종 목표는 AIOSv2 PostgreSQL을 운영 기준 DB로 사용하는 것이다. 다만 기존 앱의 원본/캐시/학습 데이터는 즉시 제거하지 않고 단계적으로 승격한다.

| 데이터 유형          | 최종 기준                                 | 초기 처리                               |
| -------------------- | ----------------------------------------- | --------------------------------------- |
| 고객/파트너/담당자   | AIOSv2 DB                                 | mail/AIOS v1에서 후보 생성 후 승인      |
| 기회/제안/프로젝트   | AIOSv2 DB                                 | Mail thread 또는 고객 컨텍스트에서 생성 |
| 견적/제안서/POC      | AIOSv2 DB + file/artifact ref             | draft artifact로 생성                   |
| 승인/실행/evidence   | AIOSv2 DB 또는 evidence docs              | 즉시 AIOSv2에서 관리                    |
| 메일 원본/캐시       | Mail Intelligence 유지 + AIOSv2 reference | 필요한 source metadata만 저장           |
| MCP 학습/RAG/벤더 DB | 장기적으로 AIOSv2 Knowledge/pgvector      | 초기에는 MCP 파일 기반 유지             |
| Vibe 개발/RAG 데이터 | 장기적으로 AIOSv2 reference + Vibe 원본   | 초기에는 Vibe 저장소 유지               |

## 5. 핵심 도메인 모델

### CRM

| 모델               | 주요 정보                                           |
| ------------------ | --------------------------------------------------- |
| `Customer`         | 회사명, 도메인, 산업, 관심 솔루션, 페인포인트, 상태 |
| `Partner`          | 회사명, 협업 타입, 담당 영역, 관련 프로젝트         |
| `Contact`          | 이름, 이메일, 전화, 직책, 담당 역할                 |
| `CustomerInterest` | 관심대상, 관심솔루션, 근거 메일, confidence         |
| `PainPoint`        | 고객 문제, 영향도, 발견 경로, 관련 프로젝트         |

### Workflow

| 모델          | 역할                                       |
| ------------- | ------------------------------------------ |
| `Opportunity` | 아직 프로젝트가 아닌 영업/기술 기회        |
| `Proposal`    | 제안 진행 건, 제안서/견적서 초안 연결      |
| `Project`     | 확정된 수행 프로젝트                       |
| `Task`        | 프로젝트/POC/유지보수 세부 작업            |
| `WorkflowRun` | F-aios-v3-core 또는 MCP-workflow 실행 단위 |

### Sales/Delivery

| 모델                | 역할                                        |
| ------------------- | ------------------------------------------- |
| `Estimate`          | 견적서 버전, 금액, 전달 상태, CFO 전달 여부 |
| `ProposalDocument`  | 제안서 draft/approved/sent 상태             |
| `POCPlan`           | POC 범위, 일정, 담당자, 결과                |
| `ProjectCompletion` | 완료 요약, 최종 견적, CFO 전달 패키지       |

### Post-project

| 모델                  | 역할                                     |
| --------------------- | ---------------------------------------- |
| `CustomerProduct`     | 고객 도입 제품, 버전, 계약/유지보수 정보 |
| `MaintenanceCase`     | 장애, 점검, 정책 변경, 장비 작업         |
| `MaintenanceEvidence` | MCP-workflow 실행 결과와 승인 이력       |

### Knowledge/Agent

| 모델                | 역할                                      |
| ------------------- | ----------------------------------------- |
| `MailKnowledge`     | 학습된 메일 패턴, 기본 회신, 분류 근거    |
| `KnowledgeDocument` | MCP/Vibe/Mail에서 승격한 지식 문서        |
| `AgentTask`         | opencode/Cursor/Codex/F-aios-v3 실행 작업 |
| `Evidence`          | 실행/승인/전달 결과                       |

## 6. Mail Intelligence 계약

Mail Intelligence는 업무 시작점이다.

| 기능                    | Standalone endpoint             | AIOSv2 proxy                           | 도메인 연결                     |
| ----------------------- | ------------------------------- | -------------------------------------- | ------------------------------- |
| accounts                | `/api/outlook/accounts`         | `/api/proxy/outlook/accounts`          | mailbox source                  |
| analyze/thread groups   | `/api/outlook/analyze`          | `/api/proxy/outlook/analyze`           | MailThread                      |
| thread insights         | `/api/portal/thread-insights`   | `/api/proxy/outlook/thread-insights`   | Opportunity/Project 후보        |
| task candidates         | `/api/portal/push-candidates`   | `/api/proxy/outlook/candidates`        | Task 후보                       |
| entity candidates       | `/api/portal/entity-candidates` | `/api/proxy/outlook/entity-candidates` | Customer/Partner 후보           |
| calendar hints          | `/api/portal/calendar-hints`    | `/api/proxy/outlook/calendar-hints`    | POC/Task 일정 후보              |
| attachments             | `/api/portal/attachments`       | `/api/proxy/outlook/attachments`       | Estimate/Proposal artifact 후보 |
| reply draft             | `/api/outlook/reply-draft`      | `/api/proxy/outlook/reply-draft`       | 회신 초안                       |
| send/read/config delete | `/api/outlook/*` write          | `/api/mail/*` gated                    | approval 필요                   |

## 7. Workflow 승격 규칙

| 현재 단계         | 다음 단계                  | 승격 조건                                 |
| ----------------- | -------------------------- | ----------------------------------------- |
| MailThread        | Customer/Partner candidate | 발신 도메인/담당자/요청사항 확인          |
| MailThread        | Opportunity                | 관심 솔루션, 페인포인트, 요청사항 존재    |
| Opportunity       | Proposal                   | 제안/견적/솔루션 설명 요청 존재           |
| Proposal          | Project                    | 세부협의, 견적 전달, POC 또는 수행 확정   |
| Project           | POCPlan                    | 검증 일정/범위/담당자 필요                |
| Project           | ProjectCompletion          | 견적/제안/POC 결과 완료                   |
| ProjectCompletion | CustomerProduct            | 고객 도입/운영 제품 확정                  |
| CustomerProduct   | MaintenanceCase            | 장애/점검/변경/유지보수 요청 발생         |
| ImprovementTask   | Vibe DevProject            | 운영 중 부족한 기능 또는 신규 솔루션 필요 |

## 8. Agent Orchestration 기준

프로세스가 진행될수록 다양한 agent가 필요해졌기 때문에 F-aios-v3-core를 agent/workflow orchestration 계층으로 둔다.

| 단계             | 필요한 agent                                        |
| ---------------- | --------------------------------------------------- |
| 메일 분석/회신   | mail classifier, reply drafter                      |
| 고객/파트너 후보 | entity resolver, duplicate checker                  |
| 기회/제안 판단   | opportunity scorer, proposal planner                |
| 프로젝트 승격    | project planner, task generator                     |
| 견적/제안서      | estimate assistant, proposal writer                 |
| POC              | poc planner, schedule assistant, evidence collector |
| 유지보수         | maintenance triage, device workflow agent           |
| 개발 개선        | opencode, Cursor Agent, Codex, Vibe agents          |

## 9. Approval Contract

| Action type      | 대상                                          |
| ---------------- | --------------------------------------------- |
| `send`           | 메일 발송, Slack 발송, CFO 전달 메일          |
| `external-share` | 제안서/견적서 외부 공유, GitHub PR/branch     |
| `deploy`         | agent run, sandbox run, Sangfor workflow 실행 |
| `delete`         | 설정/데이터 삭제                              |
| `device-control` | 장비 제어성 MCP/whelp99/Sangfor tool call     |

승인 전 금지:

- upstream write 호출
- 외부 발송
- 운영 장비 변경
- GitHub push/merge/tag/release
- 운영 DB migration/push

## 10. Public Interfaces 우선순위

### Mail → CRM/Opportunity

```ts
createCustomerOrPartnerCandidateFromMail(input: {
  entityRole: "customer" | "partner"
  domain?: string
  candidateName?: string
  contacts?: Array<{ name?: string; email?: string; phone?: string }>
  interests?: string[]
  solutions?: string[]
  painPoints?: string[]
  sourceThreadKey: string
  requestedBy: string
})
```

```ts
createOpportunityFromMailThread(input: {
  customerId?: string
  partnerId?: string
  threadKey: string
  title: string
  summary?: string
  interestedSolutions?: string[]
  painPoints?: string[]
  messageIds: string[]
  requestedBy: string
})
```

### Opportunity → Project

```ts
promoteOpportunityToProject(input: {
  opportunityId: string
  proposalId?: string
  estimateRequired?: boolean
  pocRequired?: boolean
  requestedBy: string
})
```

### Project Delivery

```ts
createProjectDeliveryPackage(input: {
  projectId: string
  includeEstimate: boolean
  includeProposal: boolean
  includePocPlan: boolean
  requestedBy: string
})
```

### Completion / Maintenance

```ts
completeProjectForCfoHandoff(input: {
  projectId: string
  estimateId: string
  completionSummary: string
  requestedBy: string
})
```

```ts
createMaintenanceCaseFromCompletedProject(input: {
  projectId: string
  customerProductId: string
  maintenanceType: "support" | "inspection" | "incident" | "change"
  requestedBy: string
})
```

## 11. 검증 기준

- Mail Intelligence read-only endpoints smoke.
- Customer/Partner candidate duplicate test.
- Opportunity → Proposal → Project 승격 test.
- Estimate/Proposal/POC artifact 생성 test.
- Project completion → CFO handoff package test.
- CustomerProduct → MaintenanceCase test.
- 모든 위험 write route approval gate test.
- Browser smoke: `/mail`, `/customers`, `/projects`, `/ops`, `/sangfor`, `/vibe-coding`.
