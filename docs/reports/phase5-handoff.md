# Phase 5 Handoff: Deep Integration

**Session:** `cursor-opencode-main-session`  
**Prepared by:** Cursor (orchestrator)  
**Implementer:** opencode  
**Reviewer:** Codex (review-only)

## Objective

Phase 4에서 "관측 + gated proxy + live UI"를 완료했다. Phase 5는 **남은 upstream 통일·확장 proxy·connector 실연동**을 마무리한다.

## Acceptance Criteria

- [ ] AIOS v1 proxy 11개 route가 `proxyAiosV1Json` + `upstream-proxy` 패턴으로 통일
- [ ] sangfor events/compliance read proxy 추가, sangfor UI security 탭 live 연동
- [ ] `GET /api/whelp99/health` — filesystem probe bridge (HTTP 서버 없음 유지)
- [ ] settings GitHub/Slack 행이 env 또는 `/api/github` 기반 실상태 표시
- [ ] `pnpm test`, `pnpm typecheck` 통과
- [ ] evidence 갱신

---

## Task 1 — opencode: AIOS v1 upstream-proxy 완료

**현재 상태 (Cursor 점검):**

| Route | Status |
|-------|--------|
| customers, tasks, partners, knowledge, workflows, automation, github | ✅ `proxyAiosV1Json` |
| plan, analyze, commands, risk | ❌ 아직 raw `fetch` + fallback |

**작업:**

1. `apps/web/src/lib/integrations/aios-v1-proxy.ts` — 이미 존재, 필요 시 query/buildPath 보완
2. `plan`, `analyze`, `commands`, `risk` route를 `proxyAiosV1Json`로 마이그레이션
3. 기존 upstream unreachable fallback UX는 유지 (mock/plan fallback OK)
4. `aios-v3/health`도 `upstream-proxy` + `getFaiosV3Url()`로 통일 (Phase 4 누락)

**Target files:**

- `apps/web/src/app/api/plan/route.ts`
- `apps/web/src/app/api/analyze/route.ts`
- `apps/web/src/app/api/commands/route.ts`
- `apps/web/src/app/api/risk/route.ts`
- `apps/web/src/app/api/aios-v3/health/route.ts`

---

## Task 2 — opencode: sangfor 확장 proxy + UI

**Upstream (sangfor-mcp-workflow operator-console):**

| Portal route | Upstream | Method | Approval |
|--------------|----------|--------|----------|
| `/api/sangfor/events` | `/api/events` | GET | none |
| `/api/sangfor/compliance/trend` | `/api/compliance/trend` | GET | none |
| `/api/sangfor/compliance/roadmap` | `/api/compliance/roadmap` | POST | none (read-like planning) |

**UI (`apps/web/src/app/sangfor/page.tsx`):**

- security 탭: `GET /api/sangfor/events` 우선, unreachable 시 `mockEvents` fallback
- `(live)` / `(mock fallback)` 표시 유지

---

## Task 3 — opencode: whelp99 health bridge

**Route:** `GET /api/whelp99/health`

- `@aios/infrastructure`의 `probeIntegrationTarget` 또는 `probeAllIntegrations`에서 `whelp99-code-sangfor-engineer-mcp`만 probe
- 응답: `{ id, status, upstream, details }` (`planned` | `unreachable`)
- HTTP MCP bridge는 Phase 5 범위 밖 — `readinessNote`만 반환

---

## Task 4 — opencode: GitHub/Slack settings 실연동

**Settings integrations 탭:**

- GitHub: `GET /api/github` → `connected` 필드 또는 connectors 배열로 상태 표시
- Slack: `SLACK_WEBHOOK_URL` 또는 `SLACK_BOT_TOKEN` env 존재 시 `ok`, 없으면 `미연결`
- Phase 5 라벨 제거, 실제 probe 결과만 표시

---

## Task 5 — opencode: tests

**추가 테스트 (`tests/integration.test.ts` 또는 신규):**

- AIOS v1 customers proxy smoke (fetch mock)
- sangfor events proxy smoke
- whelp99 health returns `planned` or `unreachable`

**검증:** `pnpm test`, `pnpm typecheck`

---

## Task 6 — codex: review-only

- Phase 5 diff 리뷰 artifact만 작성 (구현 없음)
- 승인 게이트 누락 여부, proxy 패턴 일관성 점검

---

## Out of Scope (Phase 6+)

- AIOS v1 전 route approval gate
- whelp99 MCP stdio HTTP bridge
- sangfor device/capture POST proxy (deploy/external-share 게이트 필요)
- Slack outbound send proxy
