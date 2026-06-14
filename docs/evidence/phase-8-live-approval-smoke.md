# Phase 8 — Live Approval Smoke

> **Date:** 2026-06-14  
> **Script:** `node scripts/live-approval-smoke.mjs`  
> **Portal:** `http://127.0.0.1:3110`

## Flow (409 → approve → retry)

All dangerous routes use `ensureApprovedAction` (`apps/web/src/lib/integrations/approval-gate.ts`):

1. POST without `approvalId` → **409** + pending approval
2. POST `/api/approvals` with `status: "approved"`
3. POST retry with `approvalId` → live execution

## Dry-run (`node scripts/live-approval-smoke.mjs`)

| Connector | Step | Result |
| --------- | ---- | ------ |
| Slack `POST /api/slack/send` | pending | **409** — approval created |
| GitHub branch + PR | env-config | Skipped — `GITHUB_SMOKE_*` not set |
| whelp99 `POST /api/whelp99/tools/call` (`sangfor.products`) | pending | **409** — approval created |

## Execute (`node scripts/live-approval-smoke.mjs --execute`)

| Connector | Result | Evidence |
| --------- | ------ | -------- |
| **Slack send** | **Skipped** | `SLACK_WEBHOOK_URL` not in `.env.local` — set real webhook before prod send |
| **GitHub branch + PR** | **Skipped** | `GITHUB_TOKEN`, `GITHUB_SMOKE_OWNER`, `GITHUB_SMOKE_REPO`, `GITHUB_SMOKE_BASE_SHA` not configured |
| **whelp99 safe tool** | **PASS live** | `sangfor.products` → **200** after approval |

### whelp99 live (approved)

- Tool: `sangfor.products` (read-only whitelist on HTTP bridge)
- Bridge: `http://127.0.0.1:3600/tools/call`
- Portal route: `POST /api/whelp99/tools/call` with `approvalId` → **200**
- Direct bridge control (no gate): returns Sangfor product catalog JSON

## Env required for full prod smoke

```bash
# .env.local (not committed)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
GITHUB_TOKEN=ghp_...
GITHUB_SMOKE_OWNER=your-org
GITHUB_SMOKE_REPO=your-repo
GITHUB_SMOKE_BASE_SHA=<base-branch-sha>
WHELP99_MCP_HTTP_URL=http://localhost:3600
```

## Verdict

| Gate | Dry-run | Live execute |
| ---- | ------- | ------------ |
| Slack `send` | PASS (409) | **Blocked** — webhook env |
| GitHub `external-share` | N/A (env) | **Blocked** — token + smoke repo env |
| whelp99 `device-control` | PASS (409) | **PASS** — `sangfor.products` live |

**Phase 8 approval smoke: Partial PASS** — whelp99 live verified; Slack/GitHub await operator credentials in `.env.local`.
