# Cursor + opencode Collaboration Contract

## Goal
Cursor와 opencode가 같은 협업 상태를 읽고, 작업 분담과 핸드오프를 `.aios/context/collaboration-state.json` 기준으로 공유한다.

## Operating Rules
- Cursor는 계획, 분해, 검토, 상태 정리를 담당한다.
- opencode는 실제 구현, 패치, 테스트, 수정 반영을 담당한다.
- Codex는 보조 검토, 리팩토링 제안, 정리 역할로만 참여한다.
- 위험 작업은 반드시 승인 게이트를 통과해야 한다.
- 세션 상태는 채팅이 아니라 파일과 로그에 남긴다.

## Environment Variables
- `AIOS_WORKSPACE_ROOT`: monorepo 루트 경로 (미설정 시 `.aios/context/collaboration-state.json` 탐색)
- `AIOS_COLLABORATION_STATE_PATH`: 협업 상태 파일 경로
- `AIOS_APPROVAL_QUEUE_PATH`: 승인 큐 파일 경로
- `AIOS_COLLABORATION_EVIDENCE_DIR`: evidence 출력 디렉터리 (`docs/evidence` 기본)
- `AIOS_V1_URL`: AIOS v1 upstream (기본 `http://localhost:3101`)
- `F_AIOS_V3_URL`: F-aios-v3-core API (기본 `http://localhost:3200`)
- `SANGFOR_MCP_URL`: sangfor-mcp-workflow console (기본 `http://localhost:3500`)
- `VIBE_CODING_OS_URL`: vibe-coding-os (기본 `http://localhost:4000`)
- `WHELP99_MCP_PATH`: whelp99 MCP 레포 경로 (filesystem probe)
- `CURSOR_AGENT_COMMAND`: Cursor 실행 클라이언트 경로 또는 명령
- `OPENCODE_COMMAND`: opencode 실행 클라이언트 경로 또는 명령

## Command Routing

- 상세 명령표는 [`codex-cli-command-reference.md`](codex-cli-command-reference.md)와 [`scripts/codex-cli-command-routing.md`](../../scripts/codex-cli-command-routing.md)를 우선 참조한다.
- 현재 workspace 기준 `opencode`는 실제 실행 가능한 agent command이고, `cursor`는 editor launcher로 취급한다.
- `cursor agent`가 필요한 플로우는 이 repo의 현재 CLI 조합으로는 직접 실행할 수 없다.
- 따라서 code generation / implementation은 `opencode`, navigation / file opening은 `cursor`로 분리한다.

## Approval Gate
- 위험 액션 분류는 `delete`, `send`, `deploy`, `external-share`로 고정한다.
- 승인 요청은 `sessionId`, `assignmentId`, `requestedBy`, `actionType`을 반드시 포함한다.
- 승인 전 assignment 상태는 `waiting-for-approval`로 유지한다.
- 승인 완료 후에는 resume API를 통해 동일 assignment를 재실행한다.

### Phase 4 Gated Proxy APIs

| Portal API | actionType | 승인 전 응답 |
|------------|------------|--------------|
| `POST /api/sangfor/workflows/[id]/execute` | `deploy` | 409 + `approvalStatus: pending` |
| `POST /api/vibe-coding/rag/ingest` | `external-share` | 409 + `approvalStatus: pending` |

- `approvalId` 없이 호출하면 `ApprovalFileStore.create()` 후 pending 반환.
- `approvalId`가 있으면 `approved` 상태일 때만 upstream proxy 호출.
- evidence는 `CollaborationEvidenceWriter`로 `docs/evidence/<session-id>.md`에 갱신.

## Assignment Lifecycle
- `queued -> running -> done`
- `queued -> waiting-for-approval -> done`
- 실패 시 `failed`, 보류 시 `deferred`

## Evidence
- 실행 결과는 session artifact와 `docs/evidence/<session-id>.md`에 함께 남긴다.
- evidence 문서는 objective, participants, assignments executed, approvals requested/resolved, failures and retry result, remaining work를 포함한다.

## Shared State
- `schemaVersion`: 상태 포맷 버전
- `projects`: 연동 대상 프로젝트 레지스트리
- `sessions`: 현재 협업 세션과 handoff/assignment 기록

## Current Session
- `cursor-opencode-main-session`
- objective: AIOS v1, F-aios-v3-core, sangfor-mcp-workflow, vibe-coding-os, whelp99-code-sangfor-engineer-mcp 연동
- status: `completed` (phase 6: diagnostic fix — build blockers)
- handoff: [`docs/reports/phase6-diagnostic-fix-handoff.md`](phase6-diagnostic-fix-handoff.md)
- **product status (canonical):** [`docs/reports/product-integration-blueprint-status.md`](product-integration-blueprint-status.md)

### Phase 5 Scope (opencode)

1. AIOS v1 잔여 4 route + aios-v3/health → `upstream-proxy` 통일
2. sangfor events/compliance proxy + sangfor UI security 탭 live
3. whelp99 filesystem health bridge
4. GitHub/Slack settings 실상태
5. integration tests + typecheck

## Notes
- 이 문서는 다음 세션이 와도 동일한 기준으로 작업을 이어받기 위한 핸드오프 문서다.
- 실제 수정은 코드를 통해 이어가고, 이 문서는 협업 계약의 읽기 전용 요약으로 유지한다.
