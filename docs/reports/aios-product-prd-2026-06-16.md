# AIOS Product PRD - 2026-06-16

## 1. 제품 정의

AIOS는 메일 기반 고객/파트너 관리, 기회/프로젝트/제안 workflow, 견적/제안서/POC 자동화, 프로젝트 종료 후 제품 운영/유지보수까지 이어지는 운영형 AI 자동화 플랫폼이다.

제품의 본체는 `AIOSv2 Portal`이다. 기존 앱들은 대체하지 않고 역할별 subsystem으로 연결한다.

핵심 흐름:

```text
메일 분석/관리
→ 학습된 메일 정보와 기본 메일 내용 기반 회신/분류
→ 고객/파트너 생성 및 관리
→ 기회/프로젝트/제안 workflow
→ 프로젝트 승격
→ 견적서/제안서/POC 계획/일정 관리
→ 프로젝트 완료
→ 견적서 기반 CFO 전달
→ 고객 제품 관리/유지보수
```

## 2. 제품이 해결하는 문제

현재 업무는 메일, 고객 관리, 견적, 제안, POC, 프로젝트 종료 보고, 유지보수, 신규 솔루션 개발이 서로 분리되어 있다. AIOS는 이 흐름을 하나의 운영 lifecycle로 연결한다.

| 문제                 | 현재 영향                                  | AIOS 목표                               |
| -------------------- | ------------------------------------------ | --------------------------------------- |
| 메일 관리 지연       | 회신 누락, 요청사항 누락, 긴급도 판단 지연 | 빠른 분류, 회신 초안, 후속 업무 생성    |
| 고객 정보 분산       | 담당자/관심사/페인포인트 추적 어려움       | 고객/파트너 360도 프로필                |
| 기회와 프로젝트 혼선 | 영업 기회, 제안, 실제 프로젝트 구분 불명확 | Opportunity/Proposal/Project 단계화     |
| 견적/제안 반복 작업  | 템플릿 복사, 수동 수정, 전달 누락          | 프로젝트별 견적/제안서 자동 생성        |
| POC 관리 누락        | 일정/결과/담당자/evidence 분산             | POC 계획, 일정, 결과, 승인 흐름         |
| 종료 후 관리 단절    | 납품/유지보수/고객 제품 이력 단절          | MCP-workflow 기반 제품 운영/유지보수    |
| 신규 기능 개발 병목  | 부족한 기능을 즉시 실험/개선하기 어려움    | Vibe-coding-os 기반 개선/신규 개발      |
| agent 역할 증가      | 업무 단계별 자동화 로직이 커짐             | F-aios-v3-core 기반 agent orchestration |

## 3. Subsystem 존재 이유

| Subsystem         | 존재 이유                                          | 제품상 역할                          |
| ----------------- | -------------------------------------------------- | ------------------------------------ |
| AIOSv2 Portal     | 모든 업무를 운영자가 보는 단일 화면                | 운영 본체                            |
| Mail Intelligence | 메일 분석, 빠른 메일 관리, 회신 초안, 후보 추출    | 업무 유입/분류 엔진                  |
| AIOS v1           | 기존 고객/업무/지식 자산                           | legacy CRM/task/knowledge source     |
| F-aios-v3-core    | 프로세스가 커지며 다양한 에이전트가 필요해짐       | agent/workflow/RAG orchestration     |
| MCP-workflow      | POC/프로젝트 종료 후 제품 관리와 유지보수 필요     | 고객 제품 운영/유지보수 workflow     |
| Vibe-coding-os    | 부족한 부분 개선, 신규 기능 추가, 신규 솔루션 개발 | 개발 자동화/실험/RAG/agent workspace |
| GitHub/Slack      | 승인 후 외부 협업/알림/개발 실행                   | 외부 실행 connector                  |

## 4. 목표 사용자

| 사용자         | 목적                                             | 핵심 화면                       |
| -------------- | ------------------------------------------------ | ------------------------------- |
| 영업/운영 담당 | 메일을 빠르게 처리하고 고객/기회를 만든다        | Mail Hub, Customer, Opportunity |
| 프로젝트 담당  | 기회/제안/프로젝트/POC를 workflow로 진행한다     | Project, Workflow, Kanban       |
| 기술 담당      | 제안/POC/유지보수/장비 workflow를 수행한다       | MCP Workflow, Sangfor, Ops      |
| 관리자/CFO     | 견적서, 프로젝트 완료, 매출/비용 전달을 확인한다 | Estimate, Project Completion    |
| 개발 담당      | 부족한 기능을 개선하고 신규 솔루션을 개발한다    | Vibe-coding, Collaboration      |

## 5. 핵심 도메인

| 도메인           | 설명                                                            |
| ---------------- | --------------------------------------------------------------- |
| Mail Thread      | 고객 요청과 업무 유입의 원본                                    |
| Mail Knowledge   | 학습된 메일 패턴, 기본 회신 내용, 분류/우선순위 근거            |
| Customer         | 회사, 담당자, 연락처, 이메일, 관심대상, 관심 솔루션, 페인포인트 |
| Partner          | 파트너 회사, 담당자, 협업 영역, 관련 프로젝트                   |
| Opportunity      | 아직 프로젝트로 확정되지 않은 영업/기술 기회                    |
| Proposal         | 제안/견적 전 단계 또는 제안 진행 건                             |
| Project          | 실제 수행 확정된 업무 단위                                      |
| Estimate         | 프로젝트별 견적서, 버전, 전달 상태                              |
| POC Plan         | POC 계획, 일정, 담당자, 결과, 산출물                            |
| Customer Product | 고객이 도입/운영 중인 제품과 유지보수 이력                      |
| Workflow         | 단계별 업무 진행과 agent 실행                                   |
| Approval         | 위험 작업 승인/반려/재시도                                      |
| Evidence         | 실행 결과, 승인 근거, 산출물 링크                               |

## 6. End-to-End 사용자 흐름

### Flow A - 메일 분석과 빠른 메일 관리

1. Outlook/Mail Intelligence가 메일을 수집한다.
2. 학습된 메일 정보와 기본 메일 내용을 기준으로 분류한다.
3. urgent/active/waiting/done 상태를 제안한다.
4. 회신 초안과 다음 액션을 만든다.
5. 사용자는 회신, 보류, 후보 생성, 무시 중 하나를 선택한다.
6. 실제 발송은 `send` approval gate를 통과해야 한다.

### Flow B - 고객/파트너 생성 및 관리

1. 메일에서 회사, 도메인, 담당자, 연락처, 이메일을 추출한다.
2. 관심대상, 관심 솔루션, 페인포인트, 요청사항을 누적한다.
3. 기존 고객/파트너와 중복 여부를 확인한다.
4. 신규 후보는 `candidate`로 저장한다.
5. 승인 후 active 고객/파트너로 전환한다.

### Flow C - 기회/제안/프로젝트 workflow

1. 메일 또는 고객 컨텍스트에서 Opportunity를 생성한다.
2. 제안 필요성이 있으면 Proposal workflow로 진행한다.
3. 견적/세부협의/POC 필요성이 확인되면 Project로 승격한다.
4. Project는 task, estimate, proposal, POC plan을 가진다.
5. workflow 단계별로 필요한 agent가 배정된다.

### Flow D - 프로젝트 수행과 산출물 관리

1. 프로젝트별 견적서 버전을 관리한다.
2. 고객/관심 솔루션/페인포인트 기반 제안서를 자동 생성한다.
3. POC 계획과 일정을 관리한다.
4. 산출물은 draft → readyForApproval → approved → sent/completed 상태로 이동한다.
5. 외부 전달은 approval gate를 통과한다.

### Flow E - 프로젝트 완료와 CFO 전달

1. 프로젝트 완료 시 최종 견적서, 제안서, POC 결과, 승인 이력을 묶는다.
2. CFO 전달용 요약을 생성한다.
3. 전달 전 승인 큐에서 최종 확인한다.
4. 완료 evidence와 전달 결과를 기록한다.

### Flow F - 고객 제품 관리와 유지보수

1. 프로젝트 종료 후 고객이 도입한 제품을 Customer Product로 등록한다.
2. 유지보수, 점검, 장애, 정책 변경, 장비 작업은 MCP-workflow로 관리한다.
3. 장비 제어성 작업은 `device-control` 또는 `deploy` approval gate를 통과한다.
4. 유지보수 이력은 고객/제품/프로젝트에 연결된다.

### Flow G - 부족한 기능 개선과 신규 솔루션 개발

1. 운영 중 부족한 기능이나 신규 솔루션 아이디어를 수집한다.
2. Vibe-coding-os에서 실험/개발/RAG/agent 작업을 진행한다.
3. opencode는 코드 생성, Cursor Agent는 수정/테스트, Codex는 검증/evidence를 담당한다.
4. 안정화된 기능만 AIOSv2에 통합한다.

## 7. 성공 기준

| 기준                         | 완료 조건                                                            |
| ---------------------------- | -------------------------------------------------------------------- |
| Mail                         | 메일 분석, 분류, 회신 초안, 후보 생성이 Portal에서 가능              |
| Customer/Partner             | 담당자, 연락처, 관심 솔루션, 페인포인트, 프로젝트 이력 관리          |
| Opportunity/Proposal/Project | 단계 구분과 승격 workflow가 명확함                                   |
| Estimate/Proposal            | 프로젝트별 견적서와 제안서 draft/approval/send 관리                  |
| POC                          | 계획, 일정, 결과, 산출물, evidence 관리                              |
| Completion                   | 프로젝트 완료 후 CFO 전달 패키지 생성                                |
| Maintenance                  | 고객 제품/유지보수 workflow가 MCP-workflow와 연결                    |
| Agent                        | 업무 단계별 agent 실행이 F-aios-v3-core orchestration과 연결         |
| Development                  | Vibe-coding-os를 통한 기능 개선/신규 솔루션 개발 흐름 확보           |
| Safety                       | send/delete/deploy/external-share/device-control은 승인 전 실행 불가 |

## 8. 비범위

- 기존 앱을 AIOSv2 내부로 강제 이식하지 않는다.
- 모든 legacy 저장소를 즉시 제거하지 않는다.
- 승인 없는 메일 발송, Slack 전송, GitHub push/merge/tag, Sangfor 장비 제어는 하지 않는다.
- CFO 전달은 초기에 문서/요약/evidence 패키지 생성까지로 제한한다.
- 완전한 ERP/회계 시스템 대체는 목표가 아니다.

## 9. 제품 완료 정의

AIOS가 제품으로 완료되었다고 판단하려면 다음이 가능해야 한다.

1. 메일에서 고객/파트너/기회/프로젝트 후보를 만들 수 있다.
2. 고객 프로필에 담당자, 연락처, 관심 솔루션, 페인포인트, 프로젝트 이력이 누적된다.
3. Opportunity, Proposal, Project가 구분되고 승격된다.
4. 프로젝트별 견적서, 제안서, POC 계획/일정이 관리된다.
5. 프로젝트 완료 후 CFO 전달 패키지가 생성된다.
6. 프로젝트 종료 후 고객 제품/유지보수가 MCP-workflow와 연결된다.
7. 필요한 agent/workflow는 F-aios-v3-core에서 조율된다.
8. 부족한 기능과 신규 솔루션 개발은 Vibe-coding-os를 통해 진행된다.
9. 모든 위험 작업은 approval gate와 evidence를 가진다.
