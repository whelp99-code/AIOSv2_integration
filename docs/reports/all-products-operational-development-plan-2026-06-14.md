# 전체 제품 정상 동작 개발 계획서

**작성일:** 2026-06-14  
**기준일:** 2026-06-13 Phase 7 검증 결과  
**대상:** AIOSv2 Portal, AIOS v1, F-aios-v3-core, sangfor-mcp-workflow, vibe-coding-os, whelp99 MCP, Outlook/Mail, GitHub, Slack, Collaboration Runtime  
**기준 문서:** `docs/reports/product-integration-blueprint-status.md`, `docs/reports/phase7-final-report.md`, `docs/reports/phase7-code-change-tracker.md`

---

## 1. 목표

모든 제품이 "빌드만 통과"하는 상태가 아니라, AIOSv2 Portal에서 실제 운영 플로우로 사용할 수 있는 상태를 만든다.

정상 동작 기준은 다음 5개 조건이다.

| 기준          | 완료 조건                                                |
| ------------- | -------------------------------------------------------- |
| Build/Test    | 각 제품 빌드, 타입체크, 핵심 테스트가 재현 가능하게 통과 |
| Health        | Portal에서 각 제품 health 상태를 실시간 확인 가능        |
| Proxy/API     | Portal API가 upstream 주요 기능을 호출 가능              |
| UI            | 사용자가 Portal 화면에서 주요 작업을 수행 가능           |
| Approval Gate | 삭제, 전송, 배포, 외부 공유, 운영 변경은 승인 후 실행    |

---

## 2. 현재 상태 요약

2026-06-13 기준 Phase 7에서 빌드/테스트 게이트는 대부분 통과했다. 다만 제품 통합은 아직 부분 완성이다.

| 제품                  | 현재 상태 | 주요 갭                                                                 |
| --------------------- | --------- | ----------------------------------------------------------------------- |
| AIOSv2 Portal         | 55%       | Unified Ops Console, Kanban 실제 데이터 연결, shared DB 동기화          |
| AIOS v1               | 42%       | mail import/candidates/thread proxy, 고객/파트너 상세 CRUD, 승인 게이트 |
| F-aios-v3-core        | 22%       | workflows UI 소스 불명확, orchestrator/monitoring/RAG 미노출            |
| sangfor-mcp-workflow  | 38%       | device read proxy, compliance POST gate, mock UI 제거                   |
| vibe-coding-os        | 28%       | dedicated UI, RAG ingest 승인 UX, agent/learning proxy                  |
| whelp99 MCP           | 12%       | HTTP/MCP bridge, tool proxy, 승인 게이트                                |
| Outlook/Mail          | 38%       | Outlook과 AIOS v1 mail intelligence 통합, 후보 승인 흐름                |
| GitHub                | 22%       | 실제 Octokit API, PR 자동화 UI, token/session 연결                      |
| Slack                 | 12%       | send proxy, send approval gate, 알림 템플릿                             |
| Collaboration Runtime | 62%       | UI dispatch, job progress, Codex/Cursor Agent trigger                   |

주의: `phase7-final-report.md`의 100%는 빌드/TS 게이트 기준이다. 운영 통합 완료 기준은 `product-integration-blueprint-status.md`의 진행률을 따른다.

---

## 3. 역할 분담

현재 사용할 수 있는 실행 도구는 다음과 같이 고정한다.

| 역할             | 도구                                                  | 책임                                                       |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| 코드 생성        | `opencode run "<prompt>"`                             | 신규 proxy, UI, adapter, service 초안 구현                 |
| 코드 수정/테스트 | `agent --print --trust --workspace <path> "<prompt>"` | Cursor Agent 기반 수정, 테스트 보강, 실패 수정             |
| 코드 검증        | Codex                                                 | diff 검토, 테스트 재현, evidence 정리, 승인 필요 작업 분리 |
| 에디터 열기      | `cursor <path>`                                       | 파일/워크스페이스 탐색 및 수동 확인                        |

Repo에 반영된 실행 경로:

| 명령                                                     | 용도                       |
| -------------------------------------------------------- | -------------------------- |
| `pnpm collaboration:dispatch-cursor-agent -- "<prompt>"` | Cursor Agent 직접 실행     |
| `pnpm collaboration:dispatch-opencode`                   | Phase 5 opencode 작업 실행 |
| `pnpm collaboration:dispatch-opencode-phase6`            | Phase 6 진단 수정 실행     |
| `pnpm collaboration:dispatch-opencode-fix`               | Codex 리뷰 기반 fix 실행   |
| `pnpm collaboration:dispatch-opencode-phase7`            | Phase 7 remediation 실행   |

---

## 4. Phase 계획

### Phase 0. 기준선 정리 및 검증 복구

**목표:** 다음 개발을 시작하기 전, 현재 워크트리와 검증 기준을 안정화한다.

**작업:**

| 작업                                                        | 담당  | 산출물                                                     |
| ----------------------------------------------------------- | ----- | ---------------------------------------------------------- |
| 현재 untracked `.hermes/plans/* 2.*` 중 보존/삭제 대상 분류 | Codex | 정리 목록                                                  |
| `pnpm typecheck` 실패 원인 정리                             | Codex | `apps/api/src/index.ts` createContext export mismatch 분석 |
| Cursor Agent/opencode 명령 동작 재검증                      | Codex | command routing evidence                                   |
| 변경 파일 기준 Prettier check                               | Codex | 검증 로그                                                  |

**완료 기준:**

- `pnpm exec vitest run tests/unit/command-agent-runtime.test.ts` 통과
- `pnpm collaboration:dispatch-cursor-agent -- "Respond with exactly: OK"` 통과
- `pnpm typecheck` 실패가 신규 작업 blocker인지 기존 이슈인지 분리 기록
- 문서 기준선이 `product-integration-blueprint-status.md`로 통일

---

### Phase 1. AIOSv2 Portal 운영 콘솔 완성

**목표:** 모든 제품 상태, 승인 대기, 협업 실행, 실패 원인을 한 화면에서 운영 가능하게 만든다.

**작업:**

| 작업                                                      | 담당         | 변경 대상                                                   |
| --------------------------------------------------------- | ------------ | ----------------------------------------------------------- |
| Unified Ops Console 화면 설계 및 데이터 요구사항 정리     | Cursor Agent | `docs/reports`, `/collaboration`, `/settings`, `/dashboard` |
| health + approvals + collaboration sessions 통합 API 구성 | opencode     | `apps/web/src/app/api/ops/*`, 기존 health/approval route    |
| pending approvals 목록, approve/reject/resume 버튼 연결   | opencode     | `apps/web/src/components/ops/*`                             |
| opencode/Cursor Agent dispatch 버튼 추가                  | opencode     | `/collaboration` UI, `scripts/dispatch-*`                   |
| long-running job progress 표시                            | Cursor Agent | collaboration session metadata, polling UI                  |
| Codex review 결과 표시 영역 추가                          | Cursor Agent | evidence/report 링크                                        |

**완료 기준:**

- `/collaboration` 또는 `/ops`에서 다음을 한 화면에 표시: product health, pending approvals, active assignments, last evidence, dispatch action
- 승인 필요한 작업은 409 pending → approve → resume 흐름으로 재현
- opencode와 Cursor Agent dispatch가 UI 또는 API로 호출 가능
- `pnpm test`, 관련 route/component 테스트 통과

---

### Phase 2. AIOS v1 + Outlook/Mail 통합 완성

**목표:** 메일 수집 → 후보 추출 → 고객/프로젝트/업무 생성 → 승인 대기까지 연결한다.

**작업:**

| 작업                                                   | 담당         | 변경 대상                                                               |
| ------------------------------------------------------ | ------------ | ----------------------------------------------------------------------- |
| AIOS v1 mail API proxy batch 구현                      | opencode     | `/api/mail-import`, `/api/mail-candidates`, `/api/mail-insight-threads` |
| Outlook proxy와 AIOS v1 mail intelligence 통합 탭 구성 | Cursor Agent | `/mail` page                                                            |
| 후보 고객/프로젝트/업무 생성 API 연결                  | opencode     | `apps/web/src/app/api/customers`, `tasks`, `workflows`                  |
| 고객/파트너 상세 CRUD route 추가                       | opencode     | `/api/customers/[id]`, `/api/partners/[id]`                             |
| 생성/수정/삭제 위험도 분류                             | Codex        | approval policy review                                                  |
| 후보 approve/reject UX 구현                            | Cursor Agent | mail page, approval queue                                               |

**완료 기준:**

- `/mail`에서 Outlook message와 AIOS v1 candidates를 함께 확인
- mail import 실행 후 customer/project/task 후보 생성
- 고객/프로젝트 생성은 승인 정책에 맞게 실행
- 삭제/전송/외부 공유는 approval gate 필수
- mail 관련 smoke test 3개 이상 추가

---

### Phase 3. F-aios-v3-core 워크플로우/RAG 통합

**목표:** AIOSv2 Portal에서 v3 workflow, knowledge, orchestrator, monitoring 기능을 실제로 호출한다.

**작업:**

| 작업                                                                | 담당         | 변경 대상                          |
| ------------------------------------------------------------------- | ------------ | ---------------------------------- |
| `/workflows` 데이터 소스 분리: AIOS v1 tasks vs F-aios-v3 workflows | Cursor Agent | workflows UI                       |
| v3 proxy map 작성                                                   | Codex        | docs + route inventory             |
| orchestrator, monitoring, lightrag proxy 추가                       | opencode     | `/api/aios-v3/*`                   |
| v3 전용 탭 또는 페이지 추가                                         | Cursor Agent | `/workflows`, `/knowledge`, `/ops` |
| RAG search/ingest/read flow 검증                                    | Codex        | integration tests                  |

**완료 기준:**

- 사용자가 Portal에서 v1 task와 v3 workflow를 혼동하지 않음
- `/api/aios-v3/health`, workflows, knowledge, monitoring proxy가 정상 응답
- v3 upstream unavailable 시 degraded 상태와 재시도 안내 표시
- v3 proxy smoke test 통과

---

### Phase 4. Sangfor 운영 기능 완성

**목표:** Sangfor 보안 장비/정책/컴플라이언스 흐름을 Portal에서 운영 가능하게 만든다.

**작업:**

| 작업                                                | 담당         | 변경 대상                    |
| --------------------------------------------------- | ------------ | ---------------------------- |
| device read proxy 추가                              | opencode     | `/api/sangfor/device/*`      |
| compliance POST route gate 적용                     | opencode     | `/api/sangfor/compliance/*`  |
| devices/topology mock 제거 및 live fallback 정리    | Cursor Agent | `/sangfor` page              |
| deploy/external-share/device-control 승인 정책 강화 | Codex        | approval tests               |
| Sangfor event/compliance smoke test 확장            | Cursor Agent | `tests/phase5-smoke.test.ts` |

**완료 기준:**

- `/sangfor`에서 workflows, events, devices, compliance trend를 live data로 확인
- compliance proposal/roadmap/track 같은 write route는 승인 전 실행 불가
- upstream healthy 상태에서는 mock fallback을 쓰지 않음
- Sangfor 테스트가 LM Studio 유무와 무관하게 안정적으로 통과

---

### Phase 5. vibe-coding-os 통합

**목표:** 프로젝트, RAG ingest, agent run, learning schedule을 Portal에서 관리한다.

**작업:**

| 작업                                             | 담당         | 변경 대상                              |
| ------------------------------------------------ | ------------ | -------------------------------------- |
| `/vibe-coding` 페이지 또는 dashboard widget 추가 | Cursor Agent | web UI                                 |
| projects list/detail proxy 강화                  | opencode     | `/api/vibe-coding/projects`            |
| RAG ingest form + approval retry UX 구현         | Cursor Agent | UI + approval flow                     |
| agent execution/learning schedule proxy 추가     | opencode     | `/api/vibe-coding/agents`, `/learning` |
| sandbox/write 작업 승인 정책 적용                | Codex        | approval tests                         |

**완료 기준:**

- Portal에서 vibe projects 조회 가능
- RAG ingest는 409 pending → approve → retry flow로 재현
- agent run은 로그와 evidence를 남김
- 외부 공유 또는 실행 위험 작업은 approval gate 통과

---

### Phase 6. whelp99 MCP, GitHub, Slack 완성

**목표:** health-only 상태의 connector를 실제 실행 경로로 확장한다.

**작업:**

| 영역        | 담당         | 작업                                                |
| ----------- | ------------ | --------------------------------------------------- |
| whelp99 MCP | opencode     | HTTP/MCP bridge 설계 및 `/api/whelp99/*` route 추가 |
| whelp99 MCP | Codex        | tool proxy에 필요한 승인 정책 정의                  |
| GitHub      | opencode     | Octokit client로 branch/commit/PR API 구현          |
| GitHub      | Cursor Agent | PR automation UI 및 상태 표시                       |
| Slack       | opencode     | `POST /api/slack/send` 구현                         |
| Slack       | Codex        | `send` approval gate 검증                           |

**완료 기준:**

- whelp99 MCP가 filesystem probe가 아니라 callable tool bridge로 승격
- GitHub branch/commit/PR 생성이 실제 API로 가능
- Slack send는 승인 전 실행 불가
- connector별 실패 원인이 settings/ops 화면에 표시

---

### Phase 7. 통합 회귀 테스트 및 운영 검증

**목표:** 모든 제품이 실제 사용자 흐름 기준으로 정상 동작함을 증명한다.

**통합 시나리오:**

| 시나리오                                                        | 제품                             |
| --------------------------------------------------------------- | -------------------------------- |
| 메일 수집 → 고객 후보 → 프로젝트/업무 생성 → 승인               | Outlook/Mail, AIOS v1, Portal    |
| Sangfor 정책 제안 → 승인 → 워크플로우 실행                      | Sangfor, Approval                |
| RAG ingest → 승인 → 검색                                        | vibe-coding, F-aios-v3, Approval |
| 개발 작업 생성 → opencode 구현 → Cursor Agent 수정 → Codex 검증 | Collaboration Runtime            |
| GitHub PR 생성 → Slack 알림 승인 → 전송                         | GitHub, Slack, Approval          |

**검증 명령:**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec prettier --check <changed-files>
git diff --check
```

**제품별 외부 repo 검증:**

```bash
# AIOS v1
pnpm run build

# vibe-coding-os
pnpm build

# sangfor-mcp-workflow
pnpm build
pnpm test

# mail-intelligence
npm run verify:health
npm run verify:health:full
```

**완료 기준:**

- 모든 제품 build/test 결과를 `docs/evidence/`에 기록
- Portal에서 각 제품 health가 확인 가능
- 주요 write flow가 approval gate를 통과
- 실패 시 원인, 재시도, 수동 조치 필요 여부가 evidence에 남음

---

## 5. 승인 정책

자동 진행 가능:

| 작업                       | 조건                        |
| -------------------------- | --------------------------- |
| 코드 작성/수정             | repo 내부 변경              |
| 문서 작성                  | docs/reports, docs/evidence |
| 테스트 실행                | 로컬/비파괴 명령            |
| mock 제거 및 fallback 정리 | 운영 데이터 변경 없음       |

승인 필요:

| 작업                                     | 이유               |
| ---------------------------------------- | ------------------ |
| 운영 DB migration/push                   | 데이터 구조 변경   |
| 메일/Slack 실제 전송                     | 외부 발송          |
| GitHub push/merge/release tag            | 외부 시스템 반영   |
| Sangfor deploy/device-control            | 운영 장비 영향     |
| 외부 공유/RAG ingest 중 민감 데이터 포함 | 데이터 유출 가능성 |

---

## 6. 우선순위 실행 순서

| 순서 | Phase   | 이유                                                     |
| ---- | ------- | -------------------------------------------------------- |
| 1    | Phase 0 | 현재 검증 기준과 typecheck blocker 정리                  |
| 2    | Phase 1 | 모든 제품 운영 상태를 볼 수 있는 기준 화면 확보          |
| 3    | Phase 2 | 핵심 비즈니스 플로우인 mail → customer/project/task 완성 |
| 4    | Phase 4 | Sangfor 운영 기능은 승인 게이트와 직접 연결됨            |
| 5    | Phase 3 | v3 workflow/RAG를 Portal workflow와 분리                 |
| 6    | Phase 5 | vibe-coding agent/RAG 기능 확장                          |
| 7    | Phase 6 | 외부 connector 실행 기능 확장                            |
| 8    | Phase 7 | 전체 회귀 및 운영 증거 정리                              |

---

## 7. 산출물

각 Phase는 다음 파일을 남긴다.

| 파일                                                   | 내용                    |
| ------------------------------------------------------ | ----------------------- |
| `docs/reports/phase-{N}-operational-plan.md`           | 상세 구현 계획          |
| `docs/evidence/phase-{N}-verification.md`              | 실행 명령과 결과        |
| `docs/reports/phase-{N}-risk-review.md`                | 승인 필요 작업과 위험도 |
| `docs/reports/product-integration-blueprint-status.md` | 제품별 진행률 갱신      |

---

## 8. 즉시 착수 항목

1. `pnpm typecheck` 실패 원인 수정 또는 별도 blocker 문서화
2. Unified Ops Console 구현 계획을 Phase 1 상세 문서로 분리
3. AIOS v1 mail proxy 3종 우선 구현 지시서를 opencode용으로 작성
4. Cursor Agent 수정/테스트 지시서 작성
5. Codex 검증 체크리스트 작성

---

## 9. 성공 판정

최종 성공은 다음 상태다.

- AIOSv2 Portal에서 모든 제품 health가 표시된다.
- Mail, Workflow, Sangfor, RAG, GitHub, Slack의 주요 작업이 UI에서 실행 가능하다.
- 위험 작업은 승인 없이는 실행되지 않는다.
- 모든 제품의 build/test/smoke 결과가 evidence에 남아 있다.
- 사용자는 복사/붙여넣기 없이 Portal에서 운영 흐름을 진행할 수 있다.
