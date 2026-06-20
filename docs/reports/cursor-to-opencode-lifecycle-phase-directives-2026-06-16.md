# Cursor → opencode Lifecycle Phase Directives - 2026-06-16

## 0. 공통 운영 원칙

이 문서는 Cursor Agent가 상위 조율자로 읽고, 각 Phase의 구현 작업을 opencode에 요청하기 위한 상세 지시서다.

기준 문서:

- `docs/reports/aios-product-prd-2026-06-16.md`
- `docs/reports/aios-integration-blueprint-2026-06-16.md`
- `docs/reports/aios-development-completion-plan-2026-06-16.md`
- `docs/reports/product-integration-blueprint-status.md`
- `docs/reports/mail-intelligence-domain-integration-plan-2026-06-16.md`

역할:

| 도구         | 책임                                                                  |
| ------------ | --------------------------------------------------------------------- |
| Cursor Agent | Phase 조율, opencode 요청 작성/실행, 수정/테스트 보강, UI/타입 안정화 |
| opencode     | Cursor가 지정한 범위의 코드 생성/초안 구현                            |
| Codex        | 최종 검증, 승인 정책 확인, evidence 정리                              |

절대 제약:

- 기존 앱의 틀을 깨지 않는다.
- Mail Intelligence, F-aios-v3-core, MCP-workflow, Vibe-coding-os를 AIOSv2 내부로 강제 이식하지 않는다.
- 우선 proxy/adapter/use case 방식으로 통합한다.
- 삭제, 실제 메일 발송, Slack 발송, GitHub push/merge/tag/release, Sangfor device-control/deploy, 운영 DB migration/push는 최종 승인 없이 실행하지 않는다.
- `* 2.*`, `.aios/runtime`, `.hermes/*`, invoice/tax 문서 등 기존 미추적 파일은 임의 삭제하지 않는다.
- 테스트를 skip하거나 약화하지 않는다.
- secret, token, raw env 값을 UI/API/evidence에 노출하지 않는다.

공통 검증:

```bash
pnpm --filter @aios/web typecheck
pnpm exec prettier --check <changed-files>
git diff --check
```

필요 시 추가 검증:

```bash
pnpm exec vitest run <target-test-file>
cd /Users/jmpark/Documents/Playground/apps/mail-intelligence && npm run check && npm run verify:entities && npm run verify:health
```

## Phase C0 - 기준선 정리

### Cursor 목표

새 lifecycle 기준 문서와 현재 dirty worktree를 정리하되 삭제하지 않는다.

### Cursor 작업

- `git status --short`로 현재 변경 파일을 기록한다.
- 새 canonical 문서 3개가 존재하고 Prettier check를 통과하는지 확인한다.
- `product-integration-blueprint-status.md`가 아직 이전 진행률 기준이면 후속 갱신 필요 항목을 보고한다.
- 미추적 파일을 `보존`, `검토`, `삭제 후보`로만 분류한다. 삭제는 하지 않는다.

### opencode 요청 여부

이 Phase는 원칙적으로 opencode 요청 없음. 문서 inventory 자동화가 필요할 때만 요청한다.

### opencode 프롬프트

```text
You are implementing a non-destructive baseline inventory for AIOSv2.

Do not delete, move, or rewrite any files. Create or update only a report under docs/reports if needed.

Goal:
- Inventory current dirty worktree files.
- Classify untracked artifacts into preserve/review/delete-candidate without deleting anything.
- Identify which docs are canonical for the new lifecycle plan.

Constraints:
- No code changes.
- No deletion.
- No formatting of unrelated files.
- Do not touch .aios runtime files except reading them.

Output:
- A concise markdown report with file groups, risk notes, and next actions.
```

### 완료 기준

- 삭제 없이 기준선 문서가 정리된다.
- Prettier check와 `git diff --check` 통과.

## Phase C1 - Mail 분석/회신/관리 고도화

### Cursor 목표

Mail Hub를 메일 분석, 빠른 메일 관리, 회신 초안, 후보 생성의 중심 화면으로 만든다.

### 구현 범위

- `/mail` UI에서 다음 탭/패널을 유지 또는 정리:
  - Inbox/thread groups
  - Thread insights
  - Entity candidates
  - Task candidates
  - Calendar hints
  - Attachments
  - Reply draft
- Mail Intelligence read-only endpoint를 그대로 사용:
  - `/api/proxy/outlook/accounts`
  - `/api/proxy/outlook/analyze`
  - `/api/proxy/outlook/thread-insights`
  - `/api/proxy/outlook/entity-candidates`
  - `/api/proxy/outlook/candidates`
  - `/api/proxy/outlook/calendar-hints`
  - `/api/proxy/outlook/attachments`
  - `/api/proxy/outlook/reply-draft`
- 실제 발송은 `/api/mail/send`와 `send` approval gate만 사용한다.

### Cursor 작업

- 기존 route와 UI를 먼저 읽고 중복 구현을 막는다.
- opencode 구현 후 UI 상태, loading/error, 409 approval pending 표시를 보강한다.
- Mail Intelligence unavailable 상태에서도 빈 배열 fallback과 명확한 에러를 표시한다.

### opencode 프롬프트

```text
Implement Phase C1 for AIOSv2 Mail Hub.

Read first:
- docs/reports/aios-product-prd-2026-06-16.md
- docs/reports/aios-integration-blueprint-2026-06-16.md
- apps/web/src/app/mail/page.tsx
- apps/web/src/app/api/proxy/outlook/*
- apps/web/src/lib/portal/mail-blocks.ts
- tests/integration/outlook-proxy.test.ts

Goal:
- Improve /mail as the central workflow for mail analysis, reply draft, and candidate preview.
- Preserve existing Mail Intelligence proxy routes.
- Add or fix reply draft usage through /api/proxy/outlook/reply-draft.
- Ensure send uses existing /api/mail/send approval gate and never calls upstream send directly from UI.

Required behavior:
- Show thread insight, entity candidate, task candidate, calendar hint, attachment, and reply draft context for a selected thread/message.
- Show clear loading/error states.
- Show approval pending state when send returns 409.
- Do not auto-send mail.

Tests:
- Extend tests/integration/outlook-proxy.test.ts for reply-draft contract if missing.
- Add focused component or route tests only if existing patterns exist.

Constraints:
- Do not change Mail Intelligence standalone app.
- Do not introduce real external sends.
- Do not delete files.
- No any unless unavoidable and justified.
```

### 완료 기준

- `/mail`에서 분석, 회신 초안, 후보 preview가 가능하다.
- send는 approval pending 전에는 upstream 미호출.
- targeted tests와 web typecheck 통과.

## Phase C2 - 고객/파트너 360도 프로필

### Cursor 목표

메일에서 추출한 고객/파트너/담당자/관심솔루션/페인포인트를 AIOSv2 운영 데이터로 승격한다.

### 구현 범위

신규 또는 보강 대상:

- `Customer`
- `Partner`
- `Contact`
- `CustomerInterest`
- `PainPoint`

권장 DB 보강:

- `Customer.metadata Json?`
- `Partner.metadata Json?`
- 필요 시 별도 `CustomerInterest`, `PainPoint` 모델

### Cursor 작업

- Prisma schema 변경이 필요하면 migration 실행은 하지 말고 schema diff와 generate 필요 여부만 확인한다.
- opencode 구현 후 타입/테스트를 보강한다.
- 고객 active 전환과 후보 생성이 섞이지 않도록 확인한다.

### opencode 프롬프트

```text
Implement Phase C2 customer/partner 360 profile foundation.

Read first:
- packages/db/prisma/schema.prisma
- packages/domain/src/models/*
- packages/domain/mail/src/*
- packages/application/mail/src/mail.service.ts
- apps/web/src/app/api/customers/*
- apps/web/src/app/api/partners/*
- docs/reports/aios-integration-blueprint-2026-06-16.md

Goal:
- Add the minimum domain/application support to convert mail entity candidates into customer/partner candidates.
- Track contacts, interests, interested solutions, pain points, and source mail thread metadata.

Required behavior:
- Entity candidate with entityRole=customer creates or updates Customer candidate by domain.
- Entity candidate with entityRole=partner creates or updates Partner candidate by domain.
- Contact records are linked to the customer/partner where existing schema allows.
- Candidate creation does not activate the customer/partner automatically.
- Source thread key, sample subjects, confidence, and requestedBy are preserved in metadata or notes.

Public use case:
createCustomerOrPartnerCandidateFromMail(input)

Tests:
- Add unit tests for duplicate domain upsert.
- Add tests that candidate status remains candidate.
- Add tests that source metadata is preserved.

Constraints:
- Do not run db:migrate or db:push.
- Schema edits are allowed only if necessary, but no migration execution.
- Do not break existing customers/partners routes.
```

### 완료 기준

- 고객/파트너 후보 생성 use case와 테스트 존재.
- 중복 domain 처리.
- active 전환은 별도 승인 Phase로 남음.

## Phase C3 - Opportunity / Proposal / Project Workflow

### Cursor 목표

메일과 고객 컨텍스트를 Opportunity, Proposal, Project로 구분하고 승격 workflow를 만든다.

### 구현 범위

신규 모델 또는 domain 타입:

- `Opportunity`
- `Proposal`
- `WorkflowRun`
- 기존 `Project`

상태 전이:

```text
MailThread → Opportunity → Proposal → Project
```

### Cursor 작업

- 기존 `Project.status = INTAKE` 계획과 새 Opportunity/Proposal 모델의 관계를 충돌 없이 정리한다.
- MVP에서는 schema가 부담되면 domain/application 타입과 route contract부터 만든다.
- opencode 구현 후 승격 규칙 테스트를 보강한다.

### opencode 프롬프트

```text
Implement Phase C3 Opportunity / Proposal / Project workflow foundation.

Read first:
- docs/reports/aios-product-prd-2026-06-16.md
- docs/reports/aios-integration-blueprint-2026-06-16.md
- packages/db/prisma/schema.prisma
- packages/domain/src/models/project.ts
- packages/application/src/use-cases/*
- apps/web/src/app/api/workflows/*

Goal:
- Introduce explicit workflow concepts for Opportunity, Proposal, and Project.
- Support MailThread → Opportunity creation and Opportunity → Proposal → Project promotion.

Required behavior:
- Opportunity stores customer/partner reference, source thread key, interested solutions, pain points, and status.
- Proposal stores opportunity reference, proposal status, estimateRequired, pocRequired.
- Project promotion creates or updates Project with source opportunity/proposal metadata.
- Promotion writes evidence or returns data needed for evidence writer.

Tests:
- MailThread creates Opportunity.
- Opportunity promotes to Proposal.
- Proposal promotes to Project.
- Invalid state transition is rejected.

Constraints:
- Do not migrate/push DB.
- Do not remove existing Project/Task behavior.
- Keep v1 workflows proxy separate from this lifecycle workflow.
```

### 완료 기준

- 기회/제안/프로젝트 구분이 domain/API에서 명확하다.
- 승격 테스트 존재.

## Phase C4 - 프로젝트별 견적서/제안서/POC 관리

### Cursor 목표

프로젝트 승격 후 견적서, 제안서, POC 계획/일정을 프로젝트에 연결한다.

### 구현 범위

신규 모델 또는 타입:

- `Estimate`
- `ProposalDocument`
- `POCPlan`
- `Artifact` 또는 기존 `Result` 확장

상태:

```text
draft → readyForApproval → approved → sent/completed
```

### opencode 프롬프트

```text
Implement Phase C4 project delivery artifacts foundation.

Read first:
- docs/reports/aios-development-completion-plan-2026-06-16.md
- packages/db/prisma/schema.prisma
- packages/domain/src/models/result.ts
- packages/application/src/use-cases/result-recording.ts
- apps/web/src/app/api/mail/*

Goal:
- Add project-level estimate, proposal document, and POC plan concepts.
- Use existing Result/Artifact patterns where possible instead of overbuilding.

Required behavior:
- Project can have estimate drafts with version and status.
- Project can have proposal document drafts generated from customer interests and pain points.
- Project can have POC plan with scope, schedule, owner, success criteria.
- External delivery uses send or external-share approval gate.

Tests:
- Create estimate draft for project.
- Create proposal draft for project.
- Create POC plan for project.
- Sending/sharing requires approval.

Constraints:
- Do not actually send email or share externally.
- Do not add heavy document generation engine yet; create structured draft data first.
```

### 완료 기준

- 프로젝트 화면/API가 견적/제안/POC draft를 다룰 준비가 된다.
- 외부 전달은 approval gate와 분리된다.

## Phase C5 - 프로젝트 완료 및 CFO 전달

### Cursor 목표

프로젝트 완료 시 최종 견적서 기반 CFO 전달 패키지를 만든다.

### 구현 범위

- `ProjectCompletion`
- `CfoHandoff`
- final estimate link
- approval/evidence link

### opencode 프롬프트

```text
Implement Phase C5 project completion and CFO handoff package.

Read first:
- docs/reports/aios-product-prd-2026-06-16.md
- apps/web/src/lib/integrations/approval-gate.ts
- apps/web/src/app/api/approvals/route.ts
- packages/application/src/use-cases/result-recording.ts

Goal:
- Create a structured completion package for a project.
- Include final estimate, proposal/POC result summaries, approval history references, and CFO handoff summary.

Required behavior:
- Completion package can be drafted without external send.
- CFO handoff send/share requires approval.
- Completion package records evidence references.

Tests:
- Create completion package.
- CFO handoff without approval returns pending/blocked route behavior.
- Approved handoff records artifact/evidence without leaking secrets.

Constraints:
- Do not send real email.
- Do not integrate real accounting/CFO system yet.
```

### 완료 기준

- 프로젝트 완료 패키지 draft 생성 가능.
- CFO 전달은 승인 전 실행되지 않음.

## Phase C6 - 고객 제품 관리 및 유지보수

### Cursor 목표

POC/프로젝트 종료 후 고객 제품과 유지보수 lifecycle을 MCP-workflow와 연결한다.

### 구현 범위

- `CustomerProduct`
- `MaintenanceCase`
- `MaintenanceSchedule`
- MCP-workflow proxy/adapter
- Knowledge ingest 계획

### opencode 프롬프트

```text
Implement Phase C6 customer product and maintenance foundation.

Read first:
- docs/reports/aios-integration-blueprint-2026-06-16.md
- apps/web/src/app/api/sangfor/*
- packages/domain/sangfor/src/*
- packages/application/sangfor/src/sangfor.service.ts
- /Users/jmpark/Documents/Playground/sangfor-mcp-workflow/packages/workflow-engine/src/rag-indexer.ts
- /Users/jmpark/Documents/Playground/sangfor-mcp-workflow/data/vendors/vendor-database.json

Goal:
- Connect completed projects to customer products and maintenance cases.
- Keep MCP-workflow as the maintenance/operations engine.

Required behavior:
- Completed project can create CustomerProduct.
- CustomerProduct can create MaintenanceCase for support/inspection/incident/change.
- MaintenanceCase can reference MCP-workflow evidence and Sangfor routes.
- Device-control/deploy actions require approval.

Tests:
- Project completion creates customer product draft.
- Maintenance case links to customer product.
- Device-control style action requires approval.

Constraints:
- Do not move or delete MCP-workflow data files.
- Do not run real device control.
- Do not migrate MCP data yet; only create adapters/references.
```

### 완료 기준

- 고객 상세에서 제품/유지보수 이력을 연결할 수 있는 기반이 생긴다.
- MCP 데이터는 원본 보존, AIOSv2는 reference/evidence 관리.

## Phase C7 - F-aios-v3-core Agent Orchestration

### Cursor 목표

업무 단계별 agent 실행을 F-aios-v3-core orchestration과 연결한다.

### 구현 범위

- `AgentTask`
- `WorkflowRun`
- F-aios-v3 proxy route 활용
- 실행 상태/evidence

### opencode 프롬프트

```text
Implement Phase C7 F-aios-v3 agent orchestration integration.

Read first:
- apps/web/src/app/api/aios-v3/*
- tests/integration/faios-v3-proxy.test.ts
- docs/reports/aios-integration-blueprint-2026-06-16.md

Goal:
- Represent lifecycle agent work as AgentTask/WorkflowRun and route execution through F-aios-v3 where available.

Required behavior:
- Define agent task types for mail reply, entity resolution, opportunity scoring, proposal writing, POC planning, maintenance triage.
- Add or reuse route contracts to start workflow runs.
- Track status: pending/running/succeeded/failed.
- Approval required for actions that deploy, send, share externally, or touch devices.

Tests:
- Create agent task.
- Start workflow run with mocked upstream.
- Upstream unavailable returns degraded/fallback without data loss.
- Risky action requires approval.

Constraints:
- Do not replace existing F-aios-v3 service.
- Do not assume all upstream package endpoints exist.
- Keep v1 workflows source separate.
```

### 완료 기준

- agent 실행이 lifecycle workflow와 연결된다.
- 실패/재시도/evidence 정책이 명확하다.

## Phase C8 - Vibe-coding-os 기반 개선/신규 솔루션 개발

### Cursor 목표

운영 중 발견된 부족한 기능과 신규 솔루션 아이디어를 Vibe-coding-os 개발 흐름으로 연결한다.

### 구현 범위

- `ImprovementTask`
- `DevProject`
- `SolutionCandidate`
- Vibe projects/RAG/agents routes
- Collaboration handoff

### opencode 프롬프트

```text
Implement Phase C8 Vibe-coding improvement and new solution workflow.

Read first:
- apps/web/src/app/vibe-coding/page.tsx
- apps/web/src/app/api/vibe-coding/*
- tests/integration/vibe-coding-phase5-proxy.test.ts
- apps/web/src/app/api/collaboration/*

Goal:
- Link operational gaps to Vibe-coding-os projects and agent work.

Required behavior:
- Create ImprovementTask from lifecycle issue or maintenance gap.
- Link ImprovementTask to Vibe project/RAG/agent run.
- Keep opencode/Cursor/Codex collaboration evidence connected.
- External-share/deploy actions remain approval gated.

Tests:
- Create improvement task.
- Link to Vibe project.
- RAG ingest and agent run approval behavior remains intact.

Constraints:
- Do not run unapproved deploy/sandbox operations.
- Do not rewrite Vibe-coding-os internals.
```

### 완료 기준

- 운영 이슈가 개발 개선 backlog로 연결된다.
- 신규 솔루션 후보가 추적 가능하다.

## Phase C9 - 단일 운영 DB와 Knowledge 통합

### Cursor 목표

운영 데이터는 AIOSv2 DB를 기준으로 하고, Mail/MCP/Vibe 학습 데이터는 공통 Knowledge 계층으로 점진 통합한다.

### 구현 범위

- `KnowledgeDocument` 활용 또는 확장
- MCP RAG/vendor/scenario ingest adapter
- MailKnowledge ingest adapter
- Vibe output reference

### opencode 프롬프트

```text
Implement Phase C9 knowledge/data consolidation plan and initial adapters.

Read first:
- packages/db/prisma/schema.prisma
- packages/db/scripts/migrate-v1.ts
- apps/web/src/app/api/knowledge/*
- /Users/jmpark/Documents/Playground/sangfor-mcp-workflow/data/rag/index.json
- /Users/jmpark/Documents/Playground/sangfor-mcp-workflow/data/vendors/vendor-database.json
- /Users/jmpark/Documents/Playground/sangfor-mcp-workflow/hci_knowledge_base_structure.md

Goal:
- Add a safe ingest path that references Mail/MCP/Vibe knowledge into AIOSv2 KnowledgeDocument or an equivalent knowledge schema.

Required behavior:
- Preserve source path, source system, source id, title, content/chunk summary, tags.
- Do not delete or move source files.
- Support dry-run mode that reports candidate documents without writing.
- Write mode must be explicit and safe; if DB mutation is required, stop and report unless approved.

Tests:
- Dry-run parses MCP RAG index sample.
- Dry-run parses vendor DB sample.
- Source metadata is preserved.

Constraints:
- Do not run db:migrate/db:push.
- Do not import huge files blindly in tests; use small fixtures.
- Do not introduce vector DB dependency in this Phase unless already configured.
```

### 완료 기준

- Knowledge 통합은 dry-run부터 가능하다.
- 원본 파일 구조는 보존된다.

## Phase C10 - Full Live E2E

### Cursor 목표

전체 lifecycle을 live stack과 Browser smoke로 검증한다.

### 검증 흐름

```text
메일 분석
→ 회신 초안
→ 고객/파트너 후보
→ Opportunity
→ Proposal
→ Project
→ Estimate/Proposal/POC
→ ProjectCompletion
→ CFO Handoff
→ CustomerProduct
→ MaintenanceCase
→ ImprovementTask
```

### opencode 요청 여부

원칙적으로 opencode 구현 요청 없음. 실패한 smoke의 원인 수정이 필요할 때만 Phase별로 되돌려 요청한다.

### Cursor 검증 명령

```bash
pnpm integration:stack
pnpm integration:stack:wait
pnpm --filter @aios/web typecheck
pnpm exec vitest run tests/integration.test.ts
pnpm exec vitest run tests/integration/outlook-proxy.test.ts
pnpm exec vitest run tests/integration/faios-v3-proxy.test.ts
pnpm exec vitest run tests/integration/sangfor-phase4-proxy.test.ts
pnpm exec vitest run tests/integration/vibe-coding-phase5-proxy.test.ts
git diff --check
```

Mail Intelligence:

```bash
cd /Users/jmpark/Documents/Playground/apps/mail-intelligence
npm run check
npm run verify:entities
npm run verify:health
```

### 완료 기준

- read flow PASS.
- approval-gated write flow PASS.
- Docker 미실행 등 infra 의존성은 명확히 문서화.
- 실제 외부 발송/장비제어/배포는 별도 승인 없이는 실행하지 않음.

## Cursor 최종 보고 형식

각 Phase 완료 후 Cursor는 다음을 남긴다.

```text
완료한 작업:
변경/생성 파일:
opencode에 요청한 작업:
Cursor가 수정/보강한 작업:
실행한 명령:
검증 결과:
남은 작업:
승인 필요 여부:
```
