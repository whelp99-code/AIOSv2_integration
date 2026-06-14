# opencode AIOS v1 Mail Proxy Directive

**Date:** 2026-06-14  
**Owner:** opencode  
**Reviewer:** Codex  
**Fix/test partner:** Cursor Agent  
**Goal:** Add AIOS v1 mail intelligence proxy routes required for the mail-to-project workflow.

## Summary

Implement the first mail intelligence proxy batch:

```text
/api/mail-import
/api/mail-candidates
/api/mail-insight-threads
```

Use the existing AIOS v1 proxy and approval patterns. Do not invent a second proxy framework.

## Existing Contracts

Relevant existing files:

| File                                                   | Use                              |
| ------------------------------------------------------ | -------------------------------- |
| `apps/web/src/lib/integrations/aios-v1-proxy.ts`       | Existing AIOS v1 proxy helper    |
| `apps/web/src/lib/integrations/approval-middleware.ts` | Approval-aware request handling  |
| `packages/proxy-core/src/aios-v1-adapter.ts`           | Existing path and action mapping |
| `tests/integration/aios-v1-routes.test.ts`             | Existing route pattern reference |
| `tests/phase5-smoke.test.ts`                           | Smoke test pattern reference     |

Known mapping already present in `packages/proxy-core/src/aios-v1-adapter.ts`:

```ts
"/api/mail-import": "external-share"
"/api/mail-candidates": "external-share"
"/api/mail-insight-threads": "external-share"
```

Treat these routes as approval-sensitive unless the route is implemented as read-only.

## Implementation Tasks

### 1. Add route handlers

Create or update these route files:

```text
apps/web/src/app/api/mail-import/route.ts
apps/web/src/app/api/mail-candidates/route.ts
apps/web/src/app/api/mail-insight-threads/route.ts
```

Rules:

- Use existing AIOS v1 URL resolution.
- Preserve query string passthrough for GET routes.
- Preserve JSON body passthrough for POST routes.
- Return degraded/fallback response only if that is already the local pattern for similar routes.
- Do not trust client-provided user identity headers.

### 2. Apply approval gate

Approval-sensitive behavior:

| Route                       | Method                   | Default gate     |
| --------------------------- | ------------------------ | ---------------- |
| `/api/mail-import`          | `POST`                   | `external-share` |
| `/api/mail-candidates`      | `POST`, mutation actions | `external-share` |
| `/api/mail-insight-threads` | `POST`, mutation actions | `external-share` |

Read-only `GET` may bypass approval if upstream contract is read-only.

Approval response must follow existing pattern:

- Missing approval: return `409` with pending approval details.
- Approved approval id: forward upstream request.
- Rejected approval id: do not forward upstream request.

### 3. Add tests

Add focused smoke tests for:

| Scenario                    | Expected                                          |
| --------------------------- | ------------------------------------------------- |
| upstream reachable GET      | proxy returns upstream JSON                       |
| upstream unavailable        | route returns established degraded/fallback shape |
| POST without approval       | returns 409 pending                               |
| POST with approved approval | forwards request                                  |
| rejected approval           | does not forward request                          |

Use existing local Express server and temp fixture patterns. Avoid depending on fixed external ports.

### 4. Update docs

Update integration status after implementation:

- `docs/reports/product-integration-blueprint-status.md`
- `docs/evidence/phase-2-aios-v1-mail-proxy-verification.md`

## Verification Commands

Run:

```bash
pnpm exec vitest run tests/integration/aios-v1-routes.test.ts
pnpm exec vitest run tests/phase5-smoke.test.ts
pnpm test
pnpm typecheck
pnpm exec prettier --check <changed-files>
git diff --check
```

If `pnpm typecheck` fails on the known `createContext` blocker, document that separately and still report whether the mail proxy tests pass.

## Acceptance Criteria

- Three mail proxy routes exist.
- Approval-sensitive writes do not forward upstream before approval.
- Read-only behavior is documented and tested.
- Smoke tests cover reachable, unreachable, approval pending, and approval approved paths.
- Codex can verify the diff without guessing route behavior.
