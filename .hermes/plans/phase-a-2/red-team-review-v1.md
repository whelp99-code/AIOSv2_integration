# Phase A-2: Sangfor MCP Operator Console — Red Team Review v1

**Date**: 2026-06-14  
**Scope**: `apps/web/src/app/api/sangfor/` (7 route files) + `packages/domain/sangfor/` (4 source files)

---

## 1. Security Reviewer

### Critical

#### [SEC-C1] Upstream proxy path injection via query string passthrough
- **File**: `apps/web/src/app/api/sangfor/compliance/trend/route.ts:8-9`
- **Evidence**: `searchParams.toString()` is directly concatenated into the upstream path without sanitization. An attacker could inject path traversal characters or CRLF into query params, reaching arbitrary upstream endpoints.
```ts
const query = searchParams.toString();
const path = query ? `/api/compliance/trend?${query}` : '/api/compliance/trend';
```
- **Risk**: SSRF/path injection to internal Sangfor MCP service.

#### [SEC-C2] Workflow execute proxy forwards arbitrary `body.payload` without validation
- **File**: `apps/web/src/app/api/sangfor/workflows/[id]/execute/route.ts:32-33`
- **Evidence**: `body.payload ?? {}` is passed directly to the upstream POST body with no schema validation. Any JSON payload is forwarded as-is.
```ts
body: body.payload ?? {},
```
- **Risk**: Upstream injection, denial of service, or exploitation of downstream vulnerabilities.

### High

#### [SEC-H1] No authentication middleware on any Sangfor API route
- **Files**: All 7 route files
- **Evidence**: No `getServerSession`, `auth()`, token validation, or middleware guard exists. All endpoints are publicly accessible if the Next.js server is reachable.
- **Risk**: Unauthenticated access to security policy data, workflow execution, compliance trends, and device health.

#### [SEC-H2] Error responses leak internal upstream details to client
- **File**: `apps/web/src/lib/integrations/upstream-proxy.ts:55-63`
- **Evidence**: `error.message` is sent directly to the client as `details`:
```ts
const message = error instanceof Error ? error.message : String(error);
return NextResponse.json({ error: label, details: message }, { status });
```
- **Risk**: Stack traces, internal hostnames, or connection strings may be exposed.

#### [SEC-H3] Approval gate bypass — `requestedBy` is client-controlled
- **File**: `apps/web/src/app/api/sangfor/workflows/[id]/execute/route.ts:18`
- **Evidence**: `body.requestedBy` defaults to `'opencode'` if not provided. Any caller can impersonate any user identity.
```ts
requestedBy: typeof body.requestedBy === 'string' ? body.requestedBy : 'opencode',
```
- **Risk**: Audit trail is untrustworthy; approvals can be attributed to arbitrary users.

### Medium

#### [SEC-M1] Compliance roadmap POST accepts arbitrary body forwarding
- **File**: `apps/web/src/app/api/sangfor/compliance/roadmap/route.ts:18-22`
- **Evidence**: Entire request body is forwarded to upstream with `body` spread, no validation.

#### [SEC-M2] No rate limiting on any endpoint
- **Evidence**: No rate limiter middleware found across all routes. High-frequency requests to `GET /api/sangfor/events` or `GET /api/sangfor/health` could be used for reconnaissance or DoS.

### Low

#### [SEC-L1] `upstreamProxyResponse` does not sanitize response headers
- **File**: `apps/web/src/lib/integrations/upstream-proxy.ts:66-68`
- **Evidence**: Only JSON body is proxied; status code is passed through. Cookies or security headers from upstream are not forwarded or filtered — acceptable, but no explicit sanitization policy exists.

---

## 2. Architecture Reviewer

### High

#### [ARCH-H1] All routes are pure pass-through proxies with no business logic layer
- **Files**: All 7 route files
- **Evidence**: Every route is a thin `proxyUpstreamJson()` → `upstreamProxyResponse()` wrapper. No domain logic, no entity validation using the Zod schemas defined in `packages/domain/sangfor/src/entities.ts`.
- **Risk**: The `domain/sangfor` package is effectively dead code — schemas exist but are never used by the API layer. The API has no value-add over direct upstream calls.

#### [ARCH-H2] `domain/sangfor` has zero consumers within the reviewed scope
- **Evidence**: `index.ts` exports entities and repositories, but no API route imports from `@aios/domain/sangfor`. Repositories are interface-only with no implementations.
- **Risk**: Violates DDD layering — domain layer exists but is disconnected from the delivery layer.

### Medium

#### [ARCH-M1] Deep relative import paths (6 levels) in execute route
- **File**: `apps/web/src/app/api/sangfor/workflows/[id]/execute/route.ts:2-4`
- **Evidence**: `../../../../../../lib/integrations/approval-gate` — fragile path that breaks on restructuring.
- **Recommendation**: Use `@/lib/integrations/...` path alias.

#### [ARCH-M2] `events.ts` defines domain events but no event bus/dispatcher exists
- **File**: `packages/domain/sangfor/src/events.ts`
- **Evidence**: 5 event types and a handler type are defined, but no publish/subscribe infrastructure exists anywhere.

### Low

#### [ARCH-L1] Inconsistent coding style between roadmap route and other routes
- **Evidence**: `compliance/roadmap/route.ts` uses double quotes and explicit `let body` pattern; others use single quotes and `request.json().catch(() => ({}))`.

---

## 3. Quality Reviewer

### Critical

#### [QUAL-C1] Zero test coverage for all Sangfor API routes
- **Evidence**: No `*.test.*` or `*.spec.*` files found under `apps/web/src/app/api/sangfor/` or `packages/domain/sangfor/`. The `packages/domain/sangfor/package.json` declares `vitest` but has no test files.
- **Risk**: All proxy logic, approval gating, and error handling are untested.

### High

#### [QUAL-H1] `proxyUpstreamJson` returns `{}` on JSON parse failure silently
- **File**: `apps/web/src/lib/integrations/upstream-proxy.ts:39-41`
- **Evidence**: If upstream returns non-JSON (e.g., HTML error page), data silently becomes `{}` while `ok: false` may still be true if status was 2xx with non-JSON body. No distinction between "upstream returned empty" vs "upstream returned garbage".

#### [QUAL-H2] Repository interfaces have no implementations
- **File**: `packages/domain/sangfor/src/repositories.ts`
- **Evidence**: `SecurityPolicyRepository`, `NetworkDeviceRepository`, `ThreatAlertRepository` are pure interfaces. No in-memory, database, or MCP-backed implementations exist.

### Medium

#### [QUAL-M1] `NetworkDevice.ipAddress` accepts any string, no IP format validation
- **File**: `packages/domain/sangfor/src/entities.ts:35`
- **Evidence**: `z.string()` — should use `.ip()` or `.regex()` for IPv4/IPv6 validation.

#### [QUAL-M2] `SecurityPolicySchema.rules[].source/destination` are unvalidated strings
- **File**: `packages/domain/sangfor/src/entities.ts:19-20`
- **Evidence**: No CIDR, IP, or hostname format validation on network address fields.

### Low

#### [QUAL-L1] `events.ts` not re-exported from `index.ts`
- **File**: `packages/domain/sangfor/src/index.ts`
- **Evidence**: Only `entities` and `repositories` are exported; `events` module is omitted from barrel export.

---

## 4. Operations Reviewer

### High

#### [OPS-H1] No health check distinguishes upstream availability vs route health
- **File**: `apps/web/src/app/api/sangfor/health/route.ts`
- **Evidence**: Returns upstream health response verbatim with 503 on exception. No local liveness/readiness distinction. If upstream is slow (10s timeout), health check blocks for 10s.

#### [OPS-H2] No request/response logging or metrics instrumentation
- **Files**: All route files
- **Evidence**: Only `console.error` in catch blocks (`upstream-proxy.ts:56`). No structured logging, no request ID propagation, no latency metrics.

### Medium

#### [OPS-M1] Fixed 10-second timeout may be too long for health, too short for workflow execution
- **File**: `apps/web/src/lib/integrations/upstream-proxy.ts:33`
- **Evidence**: `AbortSignal.timeout(options.timeoutMs ?? 10_000)` — no per-route override. Workflow execution may legitimately take >10s.

#### [OPS-M2] No retry logic for transient upstream failures
- **Evidence**: All routes fail immediately on upstream error. No exponential backoff or circuit breaker pattern.

### Low

#### [OPS-L1] Approval artifact recording failure is not caught
- **File**: `apps/web/src/app/api/sangfor/workflows/[id]/execute/route.ts:35`
- **Evidence**: `await recordApprovalArtifact(...)` could throw; if it does, the successful workflow response is lost.

---

## 5. Requirements Reviewer

### High

#### [REQ-H1] No CRUD endpoints for SecurityPolicy or NetworkDevice
- **Evidence**: Domain defines `SecurityPolicyRepository` (CRUD) and `NetworkDeviceRepository` (CRUD), but API routes only provide: workflows, events, health, dashboard, compliance. No policy management API exists.
- **Gap**: If the Operator Console needs to manage policies, this is missing.

#### [REQ-H2] `events` endpoint has no filtering or pagination
- **File**: `apps/web/src/app/api/sangfor/events/route.ts`
- **Evidence**: `GET /api/sangfor/events` passes no query params upstream. No `?severity=`, `?since=`, `?limit=` support. Could return unbounded event data.

### Medium

#### [REQ-M1] Workflow list endpoint has no pagination or filtering
- **File**: `apps/web/src/app/api/sangfor/workflows/route.ts`
- **Evidence**: `GET` with no params; relies entirely on upstream pagination (if it exists).

#### [REQ-M2] No WebSocket/SSE endpoint for real-time events
- **Evidence**: `events` is a polling GET endpoint. For an Operator Console, real-time threat/alert updates are typically expected.

### Low

#### [REQ-L1] `dashboard` endpoint returns raw upstream stats with no transformation
- **File**: `apps/web/src/app/api/sangfor/dashboard/route.ts`
- **Evidence**: Pure proxy; no aggregation or formatting for the console UI. This may be intentional but means the frontend must understand upstream data shapes directly.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3     |
| High     | 8     |
| Medium   | 7     |
| Low      | 5     |
| **Total**| **23**|

### Top 3 Action Items

1. **[SEC-C1 + SEC-C2]** Sanitize and validate all inputs before proxying to upstream — implement a whitelist of allowed query params for `compliance/trend` and a Zod schema for workflow execute payloads.
2. **[SEC-H1]** Add authentication middleware (`middleware.ts` or per-route `auth()` guard) to all `/api/sangfor/*` routes before any further development.
3. **[QUAL-C1]** Write integration tests for the approval gate flow and upstream proxy error handling — the execute route has complex branching that is currently untested.
