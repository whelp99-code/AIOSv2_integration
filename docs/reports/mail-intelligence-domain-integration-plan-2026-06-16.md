# Mail Intelligence Domain Integration Plan - 2026-06-16

## 기준

- 기준일: 2026-06-16
- 기준 앱: `/Users/jmpark/Documents/Playground/apps/mail-intelligence`
- 기준 브랜치: `feature/design-upgrade`
- 최신 확인 커밋: `3488ffe feat(portal): entity resolution, calendar hints, and multi-mailbox accounts`
- AIOSv2 기준 repo: `/Users/jmpark/Documents/Playground/AIOSv2_integration`

## 확인한 Mail Intelligence 기능

| 기능                | Standalone endpoint                                                    | AIOSv2 proxy                           | 상태      |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------------- | --------- |
| 계정 목록/활성 계정 | `/api/outlook/accounts`, `/api/outlook/accounts/active`                | `/api/proxy/outlook/accounts`          | 사용 가능 |
| 메일 분석/스레드    | `/api/outlook/analyze`                                                 | `/api/proxy/outlook/analyze`           | 사용 가능 |
| 스레드 인사이트     | `/api/portal/thread-insights`                                          | `/api/proxy/outlook/thread-insights`   | 사용 가능 |
| 업무 후보           | `/api/portal/push-candidates`                                          | `/api/proxy/outlook/candidates`        | 사용 가능 |
| 첨부 참조           | `/api/portal/attachments`                                              | `/api/proxy/outlook/attachments`       | 사용 가능 |
| 엔티티 후보         | `/api/portal/entity-candidates`                                        | `/api/proxy/outlook/entity-candidates` | 사용 가능 |
| 일정 힌트           | `/api/portal/calendar-hints`                                           | `/api/proxy/outlook/calendar-hints`    | 사용 가능 |
| 발송/읽음/설정 삭제 | `/api/outlook/send`, `/api/outlook/read`, `/api/outlook/config DELETE` | approval gate 필요                     | 위험 작업 |

## 현재 AIOSv2 모델 상태

이미 존재하는 Prisma 모델:

| 모델          | 현재 역할        | 부족한 점                                                                    |
| ------------- | ---------------- | ---------------------------------------------------------------------------- |
| `Customer`    | 고객사 저장      | mail entity candidate의 `confidence`, `sourceThread`, `entityRole` 추적 없음 |
| `Contact`     | 고객 담당자 저장 | `sourceMailThreadId`, 추출 근거 없음                                         |
| `Project`     | 프로젝트 저장    | mail thread 기반 candidate/active 전환 근거 없음                             |
| `Task`        | 업무 저장        | mail candidate에서 생성된 source metadata 부족                               |
| `Result`      | 산출물 JSON 저장 | 견적/제안서/메일 초안 artifact 용도 가능하나 타입 구분 보강 필요             |
| `MailMessage` | 개별 메일 저장   | thread/account/attachment/entity/calendar 힌트 관계 부족                     |

## 결정

1. MVP에서는 `ProjectCandidate` 별도 테이블을 만들지 않는다.
2. `Project.status = INTAKE`를 메일 기반 프로젝트 후보 상태로 사용한다.
3. Mail Intelligence 원본 응답은 삭제하지 않고 evidence/reference로 남긴다.
4. 위험 작업은 기존 approval action을 유지한다.
   - `send`
   - `delete`
   - `deploy`
   - `external-share`
   - `device-control`
5. 메일 앱의 read-only endpoint는 AIOSv2에서 직접 DB write하지 않는다.
6. DB write는 사용자가 “프로젝트 생성”, “고객 생성”, “업무 생성”을 승인한 뒤 use case를 통해 실행한다.

## Mail Intelligence → AIOS 도메인 매핑

### 1. Account

| Mail Intelligence | AIOSv2 목표                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `accounts[]`      | 운영자가 보는 mailbox source                                     |
| `activeAccountId` | Mail Hub filter state                                            |
| account email     | `MailMessage.metadata.accountEmail` 또는 후속 `MailAccount` 모델 |

MVP 처리:

- 별도 테이블 생성 전에는 portal state로만 사용한다.
- 운영 감사가 필요해지는 시점에 `MailAccount` 모델을 추가한다.

### 2. Thread Insight

| Mail Intelligence      | AIOSv2 목표                                                |
| ---------------------- | ---------------------------------------------------------- |
| `threadKey`            | `MailMessage.groupKey`, `Project.metadata.sourceThreadKey` |
| `threadTitle`          | `Project.name` 후보                                        |
| `summary`              | `Project.description` 후보                                 |
| `effectiveStatus`      | `Project.priority`, `Task.priority` 추론                   |
| `messageIds[]`         | `Project.metadata.sourceMessageIds`                        |
| `participantDomains[]` | `Customer.domain` 후보                                     |

MVP 처리:

- thread insight는 바로 `Project`를 만들지 않는다.
- Mail Hub에서 “프로젝트 후보 만들기”를 눌렀을 때 `Project.status = INTAKE`로 생성한다.

### 3. Entity Candidate

| Mail Intelligence  | AIOSv2 목표                         |
| ------------------ | ----------------------------------- |
| `domain`           | `Customer.domain`                   |
| `candidateName`    | `Customer.name`                     |
| `entityRole`       | `Customer.status` 또는 metadata     |
| `confidence`       | `Customer.notes` 또는 후속 metadata |
| `sampleSubjects[]` | evidence                            |

MVP 처리:

- `entityRole = customer`면 `Customer` 후보.
- `entityRole = partner`면 `Partner` 후보.
- 자동 생성하지 않고 승인 후 생성한다.

### 4. Task Candidate

| Mail Intelligence        | AIOSv2 목표                         |
| ------------------------ | ----------------------------------- |
| `mailMessageId`          | `Task.metadata.sourceMailMessageId` |
| `title`                  | `Task.title`                        |
| `summary`                | `Task.description`                  |
| `priority`               | `Task.priority`                     |
| `entityType`, `entityId` | `Task.customerId` 연결 후보         |

MVP 처리:

- 프로젝트 후보가 먼저 있어야 한다.
- 단독 task 생성보다 `Project(INTAKE) -> Task(BACKLOG)` 흐름을 우선한다.

### 5. Calendar Hint

| Mail Intelligence | AIOSv2 목표                             |
| ----------------- | --------------------------------------- |
| `title`           | `Task.title` 또는 project deadline note |
| `when`            | `Task.metadata.dueHint`                 |
| `owner`           | `Task.metadata.ownerHint`               |
| `messageId`       | evidence                                |

MVP 처리:

- 바로 캘린더를 만들지 않는다.
- Task 후보의 due/owner hint로만 사용한다.

### 6. Attachment

| Mail Intelligence        | AIOSv2 목표              |
| ------------------------ | ------------------------ |
| `id`                     | artifact source id       |
| `name`                   | `Result.content.name`    |
| `subject`, `fromAddress` | evidence                 |
| `proxyPath`              | download/reference route |

MVP 처리:

- 견적서/제안서 자동화 전까지 `Result(type=ARTIFACT)` 후보로만 다룬다.
- 실제 파일 다운로드/외부 공유는 approval gate 후 처리한다.

## 다음 구현 순서

### Phase M1 - Mail Hub 계약 고정

목표:

- Mail Intelligence read-only portal surface를 AIOSv2의 공식 계약으로 고정한다.

작업:

- `mail.account`, `mail.thread`, `mail.insightThread`, `mail.taskCandidate`, `mail.attachment`, `mail.entityCandidate`, `mail.calendarHint` portal block 유지
- proxy route별 fallback 응답 표준화
- `tests/integration/outlook-proxy.test.ts`에 endpoint 계약 유지

완료 기준:

- `@aios/web` typecheck 통과
- portal block registry가 Mail Hub 탭과 동일한 surface를 노출

### Phase M2 - Candidate Creation Use Case

목표:

- Mail thread insight를 `Project(INTAKE)` 후보로 승격하는 application use case를 만든다.

추가 대상:

- `packages/application/mail/src/mail-project-intake.service.ts`
- `packages/domain/mail/src/project-intake.ts`
- `tests/unit/mail-project-intake.test.ts`

주요 함수:

```ts
createProjectIntakeFromThread(input: {
  threadKey: string
  threadTitle: string
  summary?: string
  messageIds: string[]
  participantDomains: string[]
  requestedBy: string
})
```

완료 기준:

- 메일 스레드 1개가 `Project.status = INTAKE` 후보로 변환된다.
- `sourceThreadKey`, `sourceMessageIds`, `participantDomains`가 metadata에 남는다.

### Phase M3 - Customer/Partner Candidate Approval

목표:

- entity candidate를 고객/파트너 후보로 승격하되 자동 활성화하지 않는다.

작업:

- `entityRole=customer` → `Customer(status=candidate)`
- `entityRole=partner` → `Partner(status=candidate)`
- 승인 후 `active`로 전환

완료 기준:

- entity candidate가 중복 domain 기준으로 upsert된다.
- 생성 근거가 evidence에 남는다.

### Phase M4 - Task/Artifact Candidate Generation

목표:

- 프로젝트 후보에 업무 후보와 첨부 산출물 후보를 연결한다.

작업:

- task candidate → `Task(status=BACKLOG)`
- attachment ref → `Result(type=ARTIFACT, status=DRAFT)`
- calendar hint → task metadata due/owner hint

완료 기준:

- Mail Hub에서 선택한 thread 기준으로 Project/Task/Result 후보가 함께 생성된다.

### Phase M5 - Approval Queue 연결

목표:

- 후보 생성과 외부 실행을 분리한다.

자동 진행 가능:

- read-only sync
- candidate preview
- draft generation
- evidence 기록

승인 필요:

- 고객/프로젝트/업무를 active로 전환
- 메일 발송
- 첨부 다운로드 후 외부 공유
- Slack/GitHub/Sangfor 실행

완료 기준:

- `Approval` 없이 외부 전송/공유/삭제가 실행되지 않는다.
- 승인 이후 실행 결과가 evidence로 남는다.

## opencode / Cursor / Codex 역할

| 도구         | 역할        | 다음 작업                                |
| ------------ | ----------- | ---------------------------------------- |
| opencode     | 코드 생성   | Phase M2 use case 초안 구현              |
| Cursor Agent | 수정/테스트 | M2 테스트 보강, 타입 오류 수정           |
| Codex        | 검증/방향   | schema 영향 검토, approval/evidence 확인 |

## 바로 다음 작업

1. opencode에 `mail-project-intake.service.ts` 생성 지시
2. Cursor Agent에 unit test와 typecheck 수정 지시
3. Codex가 DB schema 변경이 필요한지 최종 검토

현재 판단:

- M2까지는 Prisma schema 변경 없이 `Project.description`과 `metadata` 중심으로 진행 가능하다.
- 다만 현재 Prisma `Project`에는 `metadata` 필드가 없다.
- 따라서 실제 DB 저장까지 하려면 둘 중 하나를 선택해야 한다.

선택지:

| 선택 | 내용                                    | 추천      |
| ---- | --------------------------------------- | --------- |
| A    | `Project.metadata Json?` 추가           | 추천      |
| B    | source 정보를 `description`에 섞어 저장 | 비추천    |
| C    | 별도 `MailProjectIntake` 모델 추가      | 후속 단계 |

추천 결정:

- Phase M2에서 `Project.metadata Json?`를 추가한다.
- 동시에 `Task.metadata Json?`도 추가한다.
- `MailMessage`에는 `externalMessageId`, `threadKey`, `accountEmail` 보강을 검토한다.
