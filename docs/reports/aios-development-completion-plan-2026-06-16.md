# AIOS Development Completion Plan - 2026-06-16

## 1. 수정된 개발 기준

이번 완료 계획은 단순 Mail → Project intake가 아니라 전체 업무 lifecycle을 기준으로 한다.

```text
메일 분석/회신/관리
→ 고객/파트너 생성 및 관리
→ 기회/제안/프로젝트 workflow
→ 견적서/제안서/POC 계획
→ 프로젝트 완료/CFO 전달
→ 고객 제품 관리/유지보수
→ 부족 기능 개선/신규 솔루션 개발
```

기존 앱들의 틀은 깨지 않는다.

- Mail Intelligence는 메일 분석/회신/학습 메일 정보 엔진으로 유지.
- F-aios-v3-core는 다양한 agent와 workflow orchestration을 위해 유지.
- MCP-workflow는 POC/프로젝트 종료 후 고객 제품 관리와 유지보수를 위해 유지.
- Vibe-coding-os는 부족한 부분 개선, 신규 기능 추가, 신규 솔루션 개발을 위해 유지.
- AIOSv2 DB는 운영 기준 DB로 단계적으로 확장.

## 2. 현재 진척도 재해석

| 영역                 | 현재 상태                                                                     | 완료까지 필요한 핵심                              |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| Mail Intelligence    | accounts/analyze/insights/candidates/entities/calendar/attachments proxy 존재 | 회신/후보/고객/기회 생성 workflow                 |
| Customer/Partner     | 기본 모델과 일부 proxy 존재                                                   | 담당자/관심솔루션/페인포인트/프로젝트 이력        |
| Opportunity/Proposal | 명시 모델 없음                                                                | 기회/제안/프로젝트 구분 모델과 승격 규칙          |
| Project              | 기본 Project/Task 존재                                                        | 견적/제안/POC/완료/CFO 전달 연결                  |
| Approval             | 주요 위험 route gate 존재                                                     | 모든 send/share/deploy/device-control에 일관 적용 |
| F-aios-v3-core       | proxy 일부 존재                                                               | agent orchestration 실제 workflow 연결            |
| MCP-workflow         | Sangfor/maintenance 기능 일부 proxy                                           | 고객 제품/유지보수 데이터 통합                    |
| Vibe-coding-os       | projects/RAG/agents proxy와 UI 존재                                           | 개선/신규개발 backlog와 연결                      |
| Evidence             | phase evidence 존재                                                           | 업무 lifecycle별 evidence 연결                    |

## 3. Phase C0 - 기준선 정리

목표:

- 새 lifecycle 기준으로 기존 문서와 dirty worktree를 재정렬한다.

작업:

- PRD/Blueprint/Completion Plan 3문서를 최신 canonical package로 지정.
- 기존 `product-integration-blueprint-status.md`의 진행률 표를 새 lifecycle 기준으로 후속 갱신.
- 미추적 `.aios/* 2.json`, `.hermes/*`, invoice/tax 문서 분류.
- 현재 Mail Portal registry/test 변경의 의도 확인.

완료 기준:

- 문서 포맷/whitespace 통과.
- 삭제 없이 분류만 완료.

담당:

- Codex: 조사/검증/evidence
- Cursor Agent: 문서/테스트 정리 필요 시 수정

## 4. Phase C1 - Mail 분석/회신/관리 고도화

목표:

- 메일을 빠르게 관리하고, 학습된 메일정보와 기본메일내용 기반 회신 초안을 만든다.

작업:

- Mail Hub에 thread, entity, task, calendar, attachment, reply draft를 하나의 업무 패널로 정리.
- 메일 상태를 urgent/active/waiting/done으로 관리.
- reply draft를 고객/관심 솔루션/기존 대화 기반으로 생성.
- 실제 메일 발송은 `send` approval gate 후 실행.

완료 기준:

- `/mail`에서 분석, 상태 변경, 회신 초안, 후보 생성이 가능.
- 발송은 승인 전 upstream 미호출.

담당:

- opencode: route/use case 초안
- Cursor Agent: UI/테스트 보강
- Codex: approval/evidence 검증

## 5. Phase C2 - 고객/파트너 360도 프로필

목표:

- 메일에서 고객/파트너, 담당자, 연락처, 이메일, 관심대상, 관심솔루션, 페인포인트를 생성/관리한다.

필요 모델:

- `Customer`
- `Partner`
- `Contact`
- `CustomerInterest`
- `PainPoint`
- 관련 metadata/evidence

작업:

- entity candidate에서 고객/파트너 후보 생성.
- 담당자, 이메일, 전화, 역할을 Contact로 연결.
- 관심 솔루션과 페인포인트를 누적.
- 진행한 프로젝트/완료된 프로젝트 이력을 고객 프로필에 표시.

완료 기준:

- 고객 상세 화면에서 담당자/관심솔루션/페인포인트/프로젝트 이력이 보인다.
- 후보 생성과 active 전환이 분리된다.

## 6. Phase C3 - Opportunity / Proposal / Project Workflow

목표:

- 메일 또는 고객 컨텍스트를 기회, 제안, 프로젝트로 구분하여 workflow를 진행한다.

필요 모델:

- `Opportunity`
- `Proposal`
- `Project`
- `WorkflowRun`

작업:

- MailThread → Opportunity 생성.
- Opportunity → Proposal 승격.
- Proposal → Project 승격.
- 승격 조건과 상태 전이를 domain 계층에 정의.
- F-aios-v3-core workflow orchestration과 연결.

완료 기준:

- 사용자가 기회/제안/프로젝트를 혼동하지 않는다.
- 각 단계가 UI와 API에서 분리된다.
- 승격 이력이 evidence에 남는다.

## 7. Phase C4 - 프로젝트별 견적서/제안서/POC 관리

목표:

- 프로젝트로 승격된 뒤 견적서 전달, 세부협의, 제안서 자동생성, POC 계획/일정을 관리한다.

필요 모델:

- `Estimate`
- `ProposalDocument`
- `POCPlan`
- `Artifact` 또는 `Result` 확장

작업:

- 프로젝트별 견적서 버전 관리.
- 고객 관심 솔루션/페인포인트 기반 제안서 자동 생성.
- POC 범위, 일정, 담당자, 성공 기준 관리.
- 산출물 상태: draft → readyForApproval → approved → sent/completed.
- 외부 전달은 `send` 또는 `external-share` approval 필요.

완료 기준:

- 프로젝트 화면에서 견적서/제안서/POC가 한 번에 보인다.
- 승인 전 외부 전달 없음.
- 산출물별 evidence가 남는다.

## 8. Phase C5 - 프로젝트 완료 및 CFO 전달

목표:

- 프로젝트 완료 시 견적서 기반 CFO 전달 패키지를 생성한다.

필요 모델:

- `ProjectCompletion`
- `CfoHandoff`
- `Estimate` final version

작업:

- 최종 견적서, 제안서, POC 결과, 승인 이력 묶기.
- CFO 전달용 요약 생성.
- 전달 전 승인 큐 생성.
- 전달 완료 evidence 기록.

완료 기준:

- 프로젝트 완료 버튼이 CFO 전달 패키지 생성을 트리거한다.
- CFO 전달 전 승인 필요.
- 전달 패키지는 재검토 가능해야 한다.

## 9. Phase C6 - 고객 제품 관리 및 유지보수

목표:

- POC/프로젝트 종료 후 고객 제품 관리와 유지보수를 MCP-workflow와 연결한다.

필요 모델:

- `CustomerProduct`
- `MaintenanceCase`
- `MaintenanceSchedule`
- `MaintenanceEvidence`

작업:

- 완료 프로젝트에서 CustomerProduct 생성.
- 유지보수/점검/장애/정책 변경 요청을 MaintenanceCase로 생성.
- MCP-workflow의 학습/RAG/벤더/시나리오 데이터를 AIOSv2 Knowledge로 점진 승격.
- 장비 제어성 작업은 `device-control` approval 필요.

완료 기준:

- 고객 상세에서 도입 제품과 유지보수 이력이 보인다.
- MCP-workflow 실행 결과가 고객/제품/evidence에 연결된다.

## 10. Phase C7 - Agent Orchestration with F-aios-v3-core

목표:

- 업무 단계별 다양한 agent를 F-aios-v3-core로 조율한다.

작업:

- 메일 회신 agent, entity resolver, opportunity scorer, proposal writer, POC planner, maintenance triage agent 정의.
- 각 agent 실행을 WorkflowRun/AgentTask로 기록.
- 실패/재시도/evidence를 Portal에서 확인.

완료 기준:

- agent 실행이 단발 API 호출이 아니라 workflow 단계와 연결된다.
- 승인 필요한 agent action은 approval gate를 통과한다.

## 11. Phase C8 - Vibe-coding-os 기반 개선/신규 솔루션 개발

목표:

- 진행 중 부족한 부분 개선, 신규 기능 추가, 신규 솔루션 개발을 Vibe-coding-os와 연결한다.

필요 모델:

- `ImprovementTask`
- `DevProject`
- `SolutionCandidate`

작업:

- 운영 중 발견된 개선점을 ImprovementTask로 생성.
- Vibe-coding-os project/RAG/agent run과 연결.
- opencode/Cursor Agent/Codex 협업 결과를 evidence로 저장.
- 안정화된 기능만 AIOSv2 backlog 또는 implementation phase로 승격.

완료 기준:

- 운영 이슈에서 개발 개선 작업으로 연결된다.
- 신규 솔루션 후보가 추적된다.

## 12. Phase C9 - 단일 운영 DB와 Knowledge 통합

목표:

- 운영 데이터는 AIOSv2 PostgreSQL을 기준으로 하고, 학습/RAG 데이터는 공통 Knowledge/pgvector/LightRAG 계층으로 점진 통합한다.

작업:

- Mail knowledge를 `MailKnowledge` 또는 `KnowledgeDocument`로 승격.
- MCP `data/rag/index.json`, `data/vendors/vendor-database.json`, scenario 데이터를 Knowledge로 ingest.
- Vibe RAG/개발 산출물도 Knowledge reference로 연결.
- 원본 파일은 즉시 삭제하지 않고 source reference로 유지.

완료 기준:

- 운영 엔티티는 AIOSv2 DB 기준.
- knowledge 검색은 메일/MCP/Vibe 출처를 구분한다.
- 기존 앱의 원본 데이터 구조를 깨지 않는다.

## 13. Phase C10 - Full Live E2E

목표:

- 전체 lifecycle을 live stack과 Browser에서 검증한다.

검증 흐름:

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

완료 기준:

- 핵심 read flow PASS.
- 위험 write flow approval gate PASS.
- evidence가 각 단계에 남음.
- Docker 포함 upstream degraded 없음 또는 원인 문서화.

## 14. 도구 역할

| 도구           | 역할                                        |
| -------------- | ------------------------------------------- |
| opencode       | 신규 코드 생성, service/API/schema 초안     |
| Cursor Agent   | 코드 수정, 테스트 보강, UI 안정화           |
| Codex          | 검증, evidence, 승인 정책 확인, 방향성 유지 |
| F-aios-v3-core | 운영 agent/workflow orchestration           |
| MCP-workflow   | 고객 제품 유지보수/운영 workflow            |
| Vibe-coding-os | 신규 기능/솔루션 개발과 개선 자동화         |

## 15. 승인 필요 작업

최종 승인 전 실행 금지:

- 실제 메일 발송
- Slack webhook 발송
- GitHub push/merge/tag/release
- Sangfor device-control/deploy
- 운영 DB migration/push
- 기존 파일 삭제
- 외부 고객/파트너 시스템 반영

## 16. 다음 즉시 작업

1. 세 문서 기준으로 `product-integration-blueprint-status.md` 후속 갱신.
2. Phase C1 Mail Hub reply/candidate UX 지시서 작성.
3. Phase C2 고객/파트너 360도 프로필 schema 초안 작성.
4. Phase C3 Opportunity/Proposal/Project workflow 모델 초안 작성.
5. MCP-workflow knowledge/data consolidation 지시서 작성.
