# Product Integration Blueprint Status

> **Last updated:** 2026-06-14  
> **Session:** `cursor-opencode-main-session`  
> **Integration phase:** 7 completed (opencode + Cursor Agent + Codex)  
> **Verification (2026-06-14):** 67 web API routes, connector routes on `apps/web`, **394 tests passing**, `pnpm lint` + `pnpm typecheck` + `pnpm build` PASS. Phase 8 live stack: [`phase-8-live-upstream-verification.md`](../evidence/phase-8-live-upstream-verification.md), [`phase-8-live-approval-smoke.md`](../evidence/phase-8-live-approval-smoke.md).

**Canonical document** for integration-scope products. Supersedes stale timeline/checklist entries in older reports (see [Stale Doc Index](#stale-doc-index)).

---

## Blueprint References

| Layer            | Document                                                                                                                     | Scope                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Product vision   | [`.hermes/plans/2026-06-11_010000-aios-brainstorming.md`](../../.hermes/plans/2026-06-11_010000-aios-brainstorming.md)       | 5 capabilities: mail, knowledge, agents, code, self-evolution |
| Real integration | [`.hermes/plans/2026-06-11_020000-real-integration-plan.md`](../../.hermes/plans/2026-06-11_020000-real-integration-plan.md) | ~30 AIOS v1 API proxies, auth, dashboard                      |
| Execution phases | [`cursor-opencode-collaboration.md`](cursor-opencode-collaboration.md), [`phase5-handoff.md`](phase5-handoff.md), [`phase-7-integrated-operational-verification.md`](../evidence/phase-7-integrated-operational-verification.md) | Phases 1–7: health, proxy, gates, Ops Console, connectors, evidence |
| Registry         | [`packages/shared/src/constants/integrations.ts`](../../packages/shared/src/constants/integrations.ts)                       | 5 upstream targets + env keys                                 |

---

## How to Read Progress

Each product is scored on four axes (each 0–100%, combined into overall **Progress**):

| Axis       | Meaning                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| **Health** | Probe via `/api/integrations/health` or dedicated health route            |
| **Proxy**  | Portal API routes proxying upstream (vs Hermes/blueprint planned surface) |
| **UI**     | User-facing pages showing live data (not hardcoded/mock)                  |
| **Gate**   | Approval gate on dangerous writes (`deploy`, `external-share`, etc.)      |

**Progress** = weighted average: Health 15%, Proxy 35%, UI 30%, Gate 20% (Gate N/A → excluded from average for that product).

---

## Summary Dashboard

| Product               | Progress | Health | Proxy | UI  | Gate | Next Priority               |
| --------------------- | -------- | ------ | ----- | --- | ---- | --------------------------- |
| AIOSv2 Portal (Hub)   | 78%      | 95%    | 90%   | 75% | 90%  | Browser/live UX smoke       |
| AIOS v1               | 58%      | 100%   | 60%   | 50% | 50%  | unified mail hub UI         |
| F-aios-v3-core        | 45%      | 100%   | 55%   | 10% | 50%  | workflows UI source clarity |
| sangfor-mcp-workflow  | 68%      | 100%   | 70%   | 45% | 80%  | live device validation      |
| vibe-coding-os        | 58%      | 70%    | 75%   | 60% | 80%  | Docker Postgres for full ok |
| whelp99 MCP           | 72%      | 100%   | 85%   | 15% | 90%  | expand safe tool live set   |
| Outlook / Mail        | 55%      | 70%    | 60%   | 70% | 50%  | unified mail hub UI         |
| GitHub                | 50%      | 50%    | 55%   | 25% | 80%  | token-backed live PR smoke  |
| Slack                 | 48%      | 50%    | 55%   | 25% | 90%  | set `SLACK_WEBHOOK_URL` live |
| Collaboration Runtime | 75%      | —      | 85%   | 60% | 95%  | job progress visibility     |

**Integration-scope weighted average:** ~58% (product vision) / ~82% (Hermes real-integration plan) / Phase 1–7 build/test/evidence **complete**.

---

## 1. AIOSv2 Portal (Hub)

**Blueprint goal:** API Gateway + unified dashboard + shared auth; single entry for all AIOS capabilities ([brainstorming](../../.hermes/plans/2026-06-11_010000-aios-brainstorming.md), [real-integration plan](../../.hermes/plans/2026-06-11_020000-real-integration-plan.md)).

### 진행 (Done)

- Integration registry and multi-project health: [`/api/integrations/health`](../../apps/web/src/app/api/integrations/health/route.ts), [`project-health-probe.ts`](../../packages/infrastructure/src/integrations/project-health-probe.ts)
- Shared proxy infrastructure: [`upstream-proxy.ts`](../../apps/web/src/lib/integrations/upstream-proxy.ts), [`approval-gate.ts`](../../apps/web/src/lib/integrations/approval-gate.ts)
- UI pages: `/dashboard`, `/settings`, `/mail`, `/workflows`, `/sangfor`, `/collaboration`, `/kanban`, **`/ops`**, **`/vibe-coding`**
- **Unified Ops Console** ([`/ops`](../../apps/web/src/app/(portal)/ops/page.tsx), [`ops-console.tsx`](../../apps/web/src/components/ops/ops-console.tsx)): integrations health, approvals, sessions, phase dispatch
- Ops APIs: [`/api/ops/summary`](../../apps/web/src/app/api/ops/summary/route.ts), [`/api/ops/dispatch`](../../apps/web/src/app/api/ops/dispatch/route.ts)
- Settings integrations tab: live health + Outlook/GitHub/Slack status
- CI: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- **67** Next.js API routes under [`apps/web/src/app/api/`](../../apps/web/src/app/api/)
- Phase 7 evidence: [`phase-7-integrated-operational-verification.md`](../evidence/phase-7-integrated-operational-verification.md)
- Phase 8 evidence: [`phase-8-live-upstream-verification.md`](../evidence/phase-8-live-upstream-verification.md), [`phase-8-live-approval-smoke.md`](../evidence/phase-8-live-approval-smoke.md)

### 미진 (Not done)

- **Kanban** uses local mock cards, not `/api/tasks` ([`kanban-board.tsx`](../../apps/web/src/components/kanban/kanban-board.tsx))
- **Shared DB** — Prisma schema exists; portal data not persisted or synced with upstreams
- **Browser E2E smoke** — `/ops` and `/vibe-coding` HTTP smoke PASS; full live upstream UX not yet exercised end-to-end

### 개선사항

| Priority | Item                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| **P0**   | Browser/live UX smoke across major portal flows                              |
| **P1**   | Wire Kanban to `/api/tasks` or domain workflow service                       |
| **P2**   | Shared auth/session with upstream services; remove duplicate env config      |

---

## 2. AIOS v1

**Blueprint goal:** Mail intelligence, customer/partner CRM, automation workflows, upstream source for portal ([brainstorming § AIOS v1](../../.hermes/plans/2026-06-11_010000-aios-brainstorming.md)).

**Env:** `AIOS_V1_URL` (default `http://localhost:3101`)

### 진행 (Done)

- Health probe via integrations registry
- **11 proxy routes** via [`proxyAiosV1Json`](../../apps/web/src/lib/integrations/aios-v1-proxy.ts):

| Portal route      | Upstream                                  |
| ----------------- | ----------------------------------------- |
| `/api/customers`  | `/api/customers`                          |
| `/api/tasks`      | `/api/tasks`                              |
| `/api/partners`   | `/api/partners`                           |
| `/api/knowledge`  | `/api/knowledge`, `/api/knowledge/search` |
| `/api/workflows`  | `/api/tasks` (mapped)                     |
| `/api/automation` | `/api/actions`                            |
| `/api/github`     | `/api/connectors`                         |
| `/api/plan`       | `/api/plan`                               |
| `/api/analyze`    | `/api/analyze`                            |
| `/api/commands`   | `/api/commands`                           |
| `/api/risk`       | `/api/risk`                               |

- UI: dashboard (customers, partners, workflows), workflows page
- Fallback UX when upstream unreachable (plan/analyze/commands/risk)

### 미진 (Not done)

Hermes plan ~30 APIs — remaining gaps:

| Missing proxy                             | Hermes reference                                |
| ----------------------------------------- | ----------------------------------------------- |
| `/api/customers/[id]` GET/PUT/DELETE      | customerApi                                     |
| `/api/partners/[id]`                      | partnerApi                                      |
| `/api/workflows/[id]/execute` (native v1) | workflowApi                                     |
| `/api/knowledge/documents`                | knowledgeApi                                    |
| `/api/automation/workflows`               | automationApi (path mismatch vs `/api/actions`) |

- Mail intelligence proxies **done** — see [§7 Outlook / Mail](#7-outlook--mail)
- Approval gates on some AIOS v1 write routes still partial

### 개선사항

| Priority | Item                                                                      |
| -------- | ------------------------------------------------------------------------- |
| **P0**   | `customers/[id]`, `partners/[id]` CRUD routes                             |
| **P1**   | Approval policy on v1 POST/PUT/DELETE; align automation paths with Hermes |
| **P2**   | Unified mail hub UI merging Outlook + v1 intelligence                     |

---

## 3. F-aios-v3-core

**Blueprint goal:** Workflow engine, knowledge graph, orchestrator, evolution, monitoring — 15 packages ([brainstorming § F-aios-v3](../../.hermes/plans/2026-06-11_010000-aios-brainstorming.md)).

**Env:** `F_AIOS_V3_URL` (default `http://localhost:3200`)

### 진행 (Done)

- Health probe + dedicated proxy:
  - [`/api/aios-v3/health`](../../apps/web/src/app/api/aios-v3/health/route.ts) → `/health`
  - [`/api/aios-v3/workflows`](../../apps/web/src/app/api/aios-v3/workflows/route.ts) → `/api/workflows`
  - [`/api/aios-v3/knowledge`](../../apps/web/src/app/api/aios-v3/knowledge/route.ts) → `/api/knowledge`, `/api/knowledge/search`
  - [`/api/aios-v3/lightrag`](../../apps/web/src/app/api/aios-v3/lightrag/route.ts) → LightRAG endpoints
  - [`/api/aios-v3/orchestrator`](../../apps/web/src/app/api/aios-v3/orchestrator/route.ts) → orchestrator endpoints
  - [`/api/aios-v3/monitoring`](../../apps/web/src/app/api/aios-v3/monitoring/route.ts) → monitoring endpoints
- Tests: [`tests/integration/faios-v3-proxy.test.ts`](../../tests/integration/faios-v3-proxy.test.ts)
- Dashboard integrations row via `/api/integrations/health`

### 미진 (Not done)

- **Remaining packages** (a2a, ag-ui, evolution, hyperagents, etc.) — no portal proxy
- **Workflows UI** uses `/api/workflows` → AIOS v1 tasks, not F-aios-v3
- No F-aios-v3 dedicated UI page
- Self-evolution / benchmark capabilities not surfaced

### 개선사항

| Priority | Item                                                                       |
| -------- | -------------------------------------------------------------------------- |
| **P0**   | Clarify workflows UI data source (v1 vs v3) or add F-aios-v3 workflows tab |
| **P1**   | Proxy remaining package endpoints (evolution, hyperagents, a2a)          |
| **P2**   | Package-level integration matrix in docs + settings                        |

---

## 4. sangfor-mcp-workflow

**Blueprint goal:** Security appliance workflows, compliance, MCP operator console ([integrations registry](../../packages/shared/src/constants/integrations.ts)).

**Env:** `SANGFOR_MCP_URL` (default `http://localhost:3500`)

### 진행 (Done)

| Portal route                          | Upstream                     | Gate       |
| ------------------------------------- | ---------------------------- | ---------- |
| `/api/sangfor/health`                 | `/api/system/health`         | —          |
| `/api/sangfor/workflows`              | `/api/workflows`             | —          |
| `/api/sangfor/dashboard`              | `/api/dashboard/stats`       | —          |
| `/api/sangfor/events`                 | `/api/events`                | —          |
| `/api/sangfor/compliance/trend`       | `/api/compliance/trend`      | —          |
| `/api/sangfor/compliance/track`       | `/api/compliance/track`      | **deploy** |
| `/api/sangfor/compliance/roadmap`     | `/api/compliance/roadmap`    | **deploy** |
| `/api/sangfor/compliance/proposal`    | `/api/compliance/proposal`   | **deploy** |
| `/api/sangfor/device/capture-menu`    | `/api/device/capture-menu`   | **deploy** |
| `/api/sangfor/device/compare`         | `/api/device/compare`        | **deploy** |
| `/api/sangfor/workflows/[id]/execute` | `/api/workflows/:id/execute` | **deploy** |

- UI [`/sangfor`](../../apps/web/src/app/sangfor/page.tsx): workflows tab live; security tab events live with mock fallback; execute + approval flow
- Tests: [`tests/integration/sangfor-phase4-proxy.test.ts`](../../tests/integration/sangfor-phase4-proxy.test.ts), events smoke in [`tests/phase5-smoke.test.ts`](../../tests/phase5-smoke.test.ts)

### 미진 (Not done)

Upstream operator-console has additional routes not yet proxied:

- Templates, learning, access, manual, vendors, guide generate
- **Devices / topology tabs** — mock data only in UI; live device validation pending

### 개선사항

| Priority | Item                                                                 |
| -------- | -------------------------------------------------------------------- |
| **P0**   | Live device validation with upstream operator-console              |
| **P1**   | Remove mock fallback when upstream healthy; templates/learning proxy |
| **P2**   | Topology tab wired to live device data                             |

---

## 5. vibe-coding-os

**Blueprint goal:** Learning system, RAG, agent framework ([integrations registry](../../packages/shared/src/constants/integrations.ts)).

**Env:** `VIBE_CODING_OS_URL` (default `http://localhost:4000`)

### 진행 (Done)

| Portal route                              | Upstream                    | Gate               |
| ----------------------------------------- | --------------------------- | ------------------ |
| `/api/vibe-coding/health`                 | `/api/health`               | —                  |
| `/api/vibe-coding/projects`               | `/api/projects`             | —                  |
| `/api/vibe-coding/projects/[id]`          | `/api/projects/:id`         | —                  |
| `/api/vibe-coding/rag/ingest`             | `/api/rag/ingest`           | **external-share** |
| `/api/vibe-coding/agents`                 | `/api/agents`               | —                  |
| `/api/vibe-coding/agents/run`             | `/api/agents/run`           | **deploy**         |
| `/api/vibe-coding/learning/schedules`     | `/api/learning/schedules`   | **deploy**         |
| `/api/vibe-coding/sandbox/run`            | `/api/sandbox/run`          | **deploy**         |

- UI: [`/vibe-coding`](../../apps/web/src/app/vibe-coding/page.tsx) — projects, RAG ingest form, agent controls
- Approval + resume tested in [`tests/integration.test.ts`](../../tests/integration.test.ts)
- Proxy tests: [`tests/integration/vibe-coding-phase5-proxy.test.ts`](../../tests/integration/vibe-coding-phase5-proxy.test.ts)
- Health in integrations dashboard

### 미진 (Not done)

- Live RAG search smoke with upstream vibe-coding-os
- Full agent run progress visibility in portal

### 개선사항

| Priority | Item                                                      |
| -------- | --------------------------------------------------------- |
| **P0**   | Live RAG search smoke with upstream running                          |
| **P1**   | Agent run progress polling in `/vibe-coding` UI                      |
| **P2**   | Learning schedule management UI                                      |

---

## 6. whelp99-code-sangfor-engineer-mcp

**Blueprint goal:** Sangfor engineer MCP extension ([integrations registry](../../packages/shared/src/constants/integrations.ts)).

**Env:** `WHELP99_MCP_PATH` (filesystem probe), `WHELP99_MCP_HTTP_URL` (web bridge)

### 진행 (Done)

- Filesystem probe in [`project-health-probe.ts`](../../packages/infrastructure/src/integrations/project-health-probe.ts)
- [`GET /api/whelp99/health`](../../apps/api/src/index.ts) on API app (probeIntegrationTarget)
- Web bridge routes:
  - [`GET /api/whelp99/health`](../../apps/web/src/app/api/whelp99/health/route.ts)
  - [`GET /api/whelp99/tools`](../../apps/web/src/app/api/whelp99/tools/route.ts)
  - [`POST /api/whelp99/tools/call`](../../apps/web/src/app/api/whelp99/tools/call/route.ts)
- Settings integrations row (`planned` / `unreachable`)
- Tests in [`tests/phase5-smoke.test.ts`](../../tests/phase5-smoke.test.ts) and [`tests/integration/phase6-connectors.test.ts`](../../tests/integration/phase6-connectors.test.ts)

### 미진 (Not done)

- Real MCP HTTP service must be configured with `WHELP99_MCP_HTTP_URL`.
- Portal UI does not yet expose a generic tool-call form.

### 개선사항

| Priority | Item                                                 |
| -------- | ---------------------------------------------------- |
| **P1**   | Connect a real MCP HTTP endpoint and run live smoke  |
| **P2**   | Add portal tool-call UI with approval queue handoff  |
| **P3**   | Keep filesystem probe as fallback diagnostics source |

---

## 7. Outlook / Mail

**Blueprint goal:** Mail intelligence — classification, candidates, auto-processing ([brainstorming § 메일](../../.hermes/plans/2026-06-11_010000-aios-brainstorming.md)).

### 진행 (Done)

| Portal route                  | Upstream                  |
| ----------------------------- | ------------------------- |
| `/api/proxy/outlook/status`   | Mail intelligence service |
| `/api/proxy/outlook/messages` | Mail intelligence service |

- UI: [`/mail`](../../apps/web/src/app/mail/page.tsx), dashboard mail widget
- Settings: Outlook connected status
- AIOS v1 mail routes:
  - [`POST /api/mail-import`](../../apps/web/src/app/api/mail-import/route.ts)
  - [`GET/POST /api/mail-candidates`](../../apps/web/src/app/api/mail-candidates/route.ts)
  - [`GET/POST /api/mail-insight-threads`](../../apps/web/src/app/api/mail-insight-threads/route.ts)
- Tests in [`tests/integration/aios-v1-mail-proxy.test.ts`](../../tests/integration/aios-v1-mail-proxy.test.ts)

### 미진 (Not done)

- Single “mail hub” merging Outlook + v1 intelligence
- Candidate approval workflow UI

### 개선사항

| Priority | Item                                            |
| -------- | ----------------------------------------------- |
| **P1**   | Unified mail page tabs: Outlook + v1 candidates |
| **P2**   | Candidate approve/reject with approval gate UI  |

---

## 8. GitHub

**Blueprint goal:** Code repository integration; domain Phase 4 PR automation interfaces ([`deferred-items.md`](deferred-items.md) — Octokit deferred).

### 진행 (Done)

- [`/api/github`](../../apps/web/src/app/api/github/route.ts) → AIOS v1 `/api/connectors` (GitHub connector subset)
- [`POST /api/github/branches`](../../apps/web/src/app/api/github/branches/route.ts) → GitHub REST branch creation with `external-share` gate
- [`POST /api/github/pull-requests`](../../apps/web/src/app/api/github/pull-requests/route.ts) → GitHub REST PR creation with `external-share` gate
- Settings: `connected` from API response
- NextAuth GitHub provider ([`apps/web/src/lib/auth/index.ts`](../../apps/web/src/lib/auth/index.ts))
- Tests in [`tests/integration/phase6-connectors.test.ts`](../../tests/integration/phase6-connectors.test.ts)

### 미진 (Not done)

- Commit creation, merge, push, and tag operations are intentionally not implemented.
- PR automation UI
- Portal GitHub auth not linked to v1 connector tokens

### 개선사항

| Priority | Item                                             |
| -------- | ------------------------------------------------ |
| **P1**   | Token-backed live branch/PR smoke with approval  |
| **P2**   | Wire domain PR automation models to portal UI    |
| **P3**   | Add commit creation only after approval contract |

---

## 9. Slack

**Blueprint goal:** Team notifications and alerts.

### 진행 (Done)

- [`/api/slack/status`](../../apps/web/src/app/api/slack/status/route.ts) (web) + [`apps/api/src/index.ts`](../../apps/api/src/index.ts) — env: `SLACK_WEBHOOK_URL`, `SLACK_BOT_TOKEN`
- [`POST /api/slack/send`](../../apps/web/src/app/api/slack/send/route.ts) with `send` approval gate
- Settings: connected / unreachable display
- Tests in [`tests/integration/phase6-connectors.test.ts`](../../tests/integration/phase6-connectors.test.ts)

### 미진 (Not done)

- Bot workflows, channel management
- Live webhook send smoke requires explicit approval.

### 개선사항

| Priority | Item                                                 |
| -------- | ---------------------------------------------------- |
| **P1**   | Live webhook send smoke through approval flow        |
| **P2**   | Notification templates; link to automation workflows |

---

## 10. Collaboration Runtime (Cursor / opencode / Codex)

**Blueprint goal:** Multi-agent orchestration with shared state, handoffs, approval ([`cursor-opencode-collaboration.md`](cursor-opencode-collaboration.md)).

### 진행 (Done)

- Session state: [`.aios/context/collaboration-state.json`](../../.aios/context/collaboration-state.json)
- Approval queue: [`.aios/context/approval-queue.json`](../../.aios/context/approval-queue.json)
- APIs: `/api/collaboration/sessions`, `/execute`, `/assignments/[id]/resume`, `/api/approvals`
- UI: [`/collaboration`](../../apps/web/src/app/collaboration/page.tsx) — sessions, assignments, approvals, cursor/opencode trigger
- Evidence: [`docs/evidence/cursor-opencode-main-session.md`](../evidence/cursor-opencode-main-session.md)
- CLI: `pnpm collaboration:run`, `collaboration:continue`, `collaboration:dispatch-opencode`, `collaboration:dispatch-cursor-agent`
- Phases 1–7 assignments **done** for build/test/evidence scope
- Gated proxy integration with [`approval-gate.ts`](../../apps/web/src/lib/integrations/approval-gate.ts)

### 미진 (Not done)

- **UI phase dispatch** — `/api/ops/dispatch` exists; full prompt UX and Codex trigger still limited
- **Codex dispatch** — review-only assignments recorded but no UI/API trigger
- **Auto loop** — no auto `continue` on phase completion or failure retry chain
- **Job progress** — long opencode runs (15min+) invisible in portal

### 개선사항

| Priority | Item                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| **P0**   | Collaboration UI: “Dispatch Phase N to opencode” wired to dispatch script/API |
| **P1**   | Codex review trigger; assignment progress polling                             |
| **P2**   | Auto phase continue + evidence refresh on opencode completion                 |

---

## Cross-Product Gaps (Post–Phase 7)

Consolidated from [`phase5-handoff.md`](phase5-handoff.md), Phase 7 evidence, and this audit:

| ID  | Gap                                              | Status (2026-06-14)   | Products affected     |
| --- | ------------------------------------------------ | --------------------- | --------------------- |
| G1  | Unified Ops Console                              | **Done** (HTTP smoke) | Portal, Collaboration |
| G2  | AIOS v1 mail API batch                           | **Partial** — import/candidates/threads proxied | AIOS v1, Outlook/Mail |
| G3  | F-aios-v3 deep proxy map                         | **Partial** — lightrag/orchestrator/monitoring added | F-aios-v3             |
| G4  | sangfor device/compliance POST + UI mock removal | **Partial** — routes + gates done; live validation pending | sangfor               |
| G5  | whelp99 MCP HTTP bridge live endpoint            | **Done** — bridge :3600 + portal probe + live `sangfor.products` | whelp99               |
| G6  | Slack live send smoke                            | **Partial** — gate PASS; live blocked on webhook env | Slack                 |
| G7  | Browser/live UX smoke for major flows            | **Partial** — Phase 8 stack + integrations health live | All                   |

```mermaid
flowchart TB
  subgraph phase1to7 [Phase1to7 Complete]
    Health["integrations/health"]
    ProxyCore["upstream-proxy + product proxies"]
    Gates["deploy + external-share + send gates"]
    OpsUI["/ops Unified Ops Console"]
    Connectors["whelp99 GitHub Slack"]
    Evidence["phase-0..7 evidence docs"]
  end
  subgraph post7 [Post Phase7]
    LiveUX["G7 partial live stack"]
    LiveUpstream["Phase 8 upstream verification"]
    MailHub["unified mail hub UI"]
    SlackGH["Slack/GitHub prod credentials"]
  end
  phase1to7 --> post7
```

---

## Code Inventory (verification snapshot — 2026-06-14)

### Web API routes (67)

Core: `integrations/health`, `ops/summary`, `ops/dispatch`, `collaboration/*`, `approvals`, `auth/*`

Product proxies: `aios-v3/*` (health, workflows, knowledge, lightrag, orchestrator, monitoring), AIOS v1 (`customers`, `tasks`, `partners`, `knowledge`, `workflows`, `automation`, `github`, `plan`, `analyze`, `commands`, `risk`, `mail-import`, `mail-candidates`, `mail-insight-threads`), `sangfor/*` (health, workflows, dashboard, events, compliance, device), `vibe-coding/*` (health, projects, rag, agents, learning, sandbox), `whelp99/*`, `github/branches`, `github/pull-requests`, `slack/send`, `proxy/outlook/*`

### API app extras

- `GET /api/whelp99/health` (filesystem probe)
- `GET /api/slack/status`

### Tests (394)

| Suite | File | Focus |
| ----- | ---- | ----- |
| Unit / schema | `tests/unit/*`, `tests/basic.test.ts` | domain, infra, schemas |
| Approval | `tests/approval-gate.test.ts` | GET/HEAD-safe gate regression |
| Integration | `tests/integration.test.ts` | collaboration + approval resume |
| Phase proxies | `tests/integration/aios-v1-mail-proxy.test.ts`, `faios-v3-proxy.test.ts`, `sangfor-phase4-proxy.test.ts`, `vibe-coding-phase5-proxy.test.ts`, `phase6-connectors.test.ts` | product proxy + gate evidence |
| Smoke | `tests/phase5-smoke.test.ts` | upstream health smoke |

---

## Stale Doc Index

These documents are **historical** or **partially outdated**. Use **this file** as the source of truth for integration product status.

| Document                                                                                                 | Stale aspect                                                 | Use instead                             |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| [`final-feature-diff.md`](final-feature-diff.md)                                                         | “Development Complete” = monorepo structure, not integration | This doc                                |
| [`missing-feature-checklist.md`](missing-feature-checklist.md)                                           | UI/tests marked missing but partially implemented            | This doc + checklist for v2.0.1 backlog |
| [`.hermes/...-real-integration-plan.md`](../../.hermes/plans/2026-06-11_020000-real-integration-plan.md) | Timeline all “미시작”; Phases 1–7 build/test/evidence done       | This doc                                |
| [`phase5-handoff.md`](phase5-handoff.md)                                                                 | Task checklist may lag opencode completion                   | evidence + this doc                     |

---

## Related Links

- Collaboration contract: [`cursor-opencode-collaboration.md`](cursor-opencode-collaboration.md)
- Session evidence: [`docs/evidence/cursor-opencode-main-session.md`](../evidence/cursor-opencode-main-session.md)
- Integration env vars: collaboration contract § Environment Variables
