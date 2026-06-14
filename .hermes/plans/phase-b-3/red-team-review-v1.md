# Red Team Review: Phase B-3 (Domain / Application / API)

**Date:** 2026-06-14
**Scope:** `packages/domain/`, `packages/application/`, `apps/api/` — Domain entities, application services, API routers, middleware
**Reviewers:** Security, Architecture, Quality, Operations, Requirements

---

## Summary

Phase B-3 implements the domain model, application services, and API layer using tRPC with Express. The clean architecture pattern is well-applied but the API layer has critical authentication bypass vulnerabilities, all application services are disconnected from actual repositories (returning stub data), and there are significant gaps in authorization, input validation, and error handling.

**Findings:** 4 Critical · 5 High · 8 Medium · 5 Low

---

## 1. Security Reviewer

### CRITICAL — S1: Authentication Bypass via Header Spoofing
- **File:** `apps/api/src/middleware/auth.ts` (lines 23-43)
- **Evidence:**
  ```typescript
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  if (userId) {
    req.user = { id: userId, email: userEmail || 'unknown', role: 'USER' };
    next();
  }
  ```
  Any HTTP client can set `X-User-Id: admin` and `X-User-Email: admin@company.com` to impersonate any user. There is NO token validation, NO signature verification, NO session lookup.
- **Impact:** Complete authentication bypass. Any unauthenticated attacker can access any user's data by setting headers.
- **Recommendation:** Implement proper JWT/OAuth2 token validation. Verify tokens against a signing key or auth server. Never trust client-supplied identity headers.

### CRITICAL — S2: Development Mode Grants ADMIN to All Requests
- **File:** `apps/api/src/middleware/auth.ts` (lines 36-38)
- **Evidence:**
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    req.user = { id: 'dev-user', email: 'dev@aios.local', name: 'Developer', role: 'ADMIN' };
    next();
  }
  ```
  If `NODE_ENV` is not set or set to `development` in production (common misconfiguration), ALL requests get ADMIN access with no authentication.
- **Impact:** Production deployment with wrong NODE_ENV = complete auth bypass with admin privileges.
- **Recommendation:** Use a separate `AUTH_DISABLED` env var that defaults to `false`. Add startup warning if auth is disabled. Never use NODE_ENV for security decisions.

### CRITICAL — S3: tRPC Context Trusts Headers Without Validation
- **File:** `apps/api/src/context/index.ts` (lines 15-22)
- **Evidence:**
  ```typescript
  export function createContext({ req }: CreateExpressContextOptions): Context {
    return {
      userId: req.headers['x-user-id'] as string | undefined,
      sessionId: req.headers['x-session-id'] as string | undefined,
      ...
    };
  }
  ```
  tRPC context is populated from the same spoofable headers. Even though `authMiddleware` runs for `/api` routes, the tRPC endpoint at `/trpc` uses its own context creation that independently reads headers.
- **Impact:** tRPC `protectedProcedure` checks `ctx.userId` which is always truthy if the header is set — no actual authentication.
- **Recommendation:** Share auth state between Express middleware and tRPC context. Validate tokens in createContext.

### CRITICAL — S4: CORS Allows Credentials with Configurable Origin
- **File:** `apps/api/src/index.ts` (line 22)
- **Evidence:**
  ```typescript
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3110', credentials: true }));
  ```
  If `CORS_ORIGIN` is set to `*` or a misconfigured value, credentials (cookies, auth headers) are exposed to any origin.
- **Impact:** Credential theft via malicious website if CORS is misconfigured.
- **Recommendation:** Validate CORS_ORIGIN is a specific domain. Reject `*` when credentials=true. Add startup validation.

### HIGH — S5: No Authorization Checks — Any User Can Access Any Resource
- **File:** `apps/api/src/routers/mail.router.ts`, `apps/api/src/routers/workflow.router.ts`, `apps/api/src/routers/coding.router.ts`
- **Evidence:** All routers use `protectedProcedure` which only checks authentication (userId exists), NOT authorization (userId owns the resource). For example:
  ```typescript
  // workflow.router.ts line 17-19
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => { return { id: input.id, ... }; })
  ```
  Any authenticated user can access any workflow by ID. No ownership check.
- **Impact:** Horizontal privilege escalation — users can read/modify other users' data.
- **Recommendation:** Add authorization middleware that verifies resource ownership. Use Prisma queries with `where: { id, userId: ctx.userId }`.

### HIGH — S6: No Request Body Size Validation on tRPC
- **File:** `apps/api/src/index.ts` (line 23)
- **Evidence:** `express.json({ limit: '10mb' })` — 10MB is generous for API requests. tRPC procedures don't validate input sizes beyond Zod schema.
- **Impact:** Large payloads could cause memory exhaustion.
- **Recommendation:** Reduce default limit. Add per-procedure input size validation.

### MEDIUM — S7: Rate Limiter Uses In-Memory Store
- **File:** `apps/api/src/middleware/rate-limiter.ts` (line 13)
- **Evidence:** `const store = new Map<string, RateLimitEntry>()` — in-memory rate limiting.
- **Impact:** Rate limits reset on restart. Not shared across multiple instances. Each instance has its own limit counter.
- **Recommendation:** Use Redis for distributed rate limiting.

### MEDIUM — S8: Rate Limiter Keyed by IP — Easily Bypassed
- **File:** `apps/api/src/middleware/rate-limiter.ts` (line 25)
- **Evidence:** `const key = req.ip || 'unknown'` — behind a proxy, `req.ip` is the proxy IP unless `trust proxy` is configured.
- **Impact:** All requests from behind a single proxy share one rate limit bucket. Also easily bypassed with IP rotation.
- **Recommendation:** Configure `app.set('trust proxy', 1)`. Consider rate limiting by authenticated user ID instead of IP.

---

## 2. Architecture Reviewer

### HIGH — A1: Application Services Are Disconnected from Repositories
- **File:** `apps/api/src/routers/mail.router.ts` (lines 12-16), `apps/api/src/routers/workflow.router.ts`, `apps/api/src/routers/coding.router.ts`
- **Evidence:** ALL router procedures return hardcoded stub data instead of calling application services:
  ```typescript
  // mail.router.ts
  query(async ({ input }) => { return { mails: [], total: 0, limit, offset }; })
  
  // workflow.router.ts  
  mutation(async ({ input }) => { return { id: `wf_${Date.now()}`, ...input, status: 'draft' }; })
  ```
  `MailService`, `WorkflowService`, `CodingService` exist in `packages/application/` but are never instantiated or called.
- **Impact:** The API layer is a facade with no real functionality. The entire DDD architecture (domain → application → infrastructure) is wired up but unused.
- **Recommendation:** Wire application services into routers via dependency injection. Create service instances in context or a composition root.

### HIGH — A2: No Dependency Injection Container
- **File:** `apps/api/src/` — no DI configuration
- **Evidence:** No composition root, no DI container (e.g., tsyringe, inversify, awilix). Services, repositories, and infrastructure adapters are not wired together.
- **Impact:** Cannot properly instantiate the dependency graph. Each layer depends on interfaces but nothing binds implementations.
- **Recommendation:** Create a `src/container.ts` or `src/composition-root.ts` that wires repositories → services → routers.

### HIGH — A3: Domain Entities Are Schemas, Not Rich Models
- **File:** `packages/domain/mail/src/entities.ts`, `packages/domain/workflow/src/entities.ts`, `packages/domain/coding/src/entities.ts`
- **Evidence:** All domain entities are Zod schemas that produce plain data objects. No behavior, no invariants, no domain methods. For example, `Workflow` has no method to validate step transitions, `MailMessage` has no method to check if it's spam.
- **Impact:** Domain logic leaks into application services or routers. The "domain" layer is just a type definition layer.
- **Recommendation:** Add domain methods that enforce invariants. For example, `Workflow.canTransitionTo(newStatus)`, `MailMessage.isSpam()`.

### MEDIUM — A4: ID Generation Uses Date.now() — Not Monotonic
- **File:** `packages/application/workflow/src/workflow.service.ts` (line 26), `packages/application/coding/src/coding.service.ts` (line 31), `apps/api/src/routers/workflow.router.ts` (line 38)
- **Evidence:** `id: `wf_${Date.now()}`` — IDs are timestamp-based. In concurrent requests, two entities could get the same ID.
- **Impact:** ID collisions under concurrent load. Race condition in create operations.
- **Recommendation:** Use `crypto.randomUUID()` or let the database generate IDs (CUID).

### MEDIUM — A5: Router Returns IDs That Should Be Server-Generated
- **File:** `apps/api/src/routers/workflow.router.ts` (line 38)
- **Evidence:** `return { id: `wf_${Date.now()}`, ...input }` — the router generates the ID client-side. The client sends data, the server echoes it back with a generated ID. The service layer also generates IDs independently.
- **Impact:** ID generation is duplicated and inconsistent between router and service layers.
- **Recommendation:** Let the database/service layer be the single source of ID generation.

---

## 3. Quality Reviewer

### HIGH — Q1: LLM JSON Parsing Has No Validation
- **File:** `packages/application/mail/src/mail.service.ts` (lines 51-53), `packages/application/coding/src/coding.service.ts` (lines 99-103)
- **Evidence:**
  ```typescript
  // mail.service.ts
  try { return JSON.parse(result.content) as AIAnalysis; } catch { ... }
  
  // coding.service.ts
  try { reviewData = JSON.parse(result.content); } catch { reviewData = { score: 50, ... }; }
  ```
  `JSON.parse` result is cast with `as` but never validated against the Zod schema. If LLM returns `{ "score": "not a number" }`, it passes through.
- **Impact:** Invalid data stored in database. Downstream consumers crash on unexpected types.
- **Recommendation:** Use `AIAnalysisSchema.parse()` and `CodeReviewSchema.parse()` to validate LLM output. Handle validation errors gracefully.

### HIGH — Q2: MailService.getMailStats() Fetches ALL Records
- **File:** `packages/application/mail/src/mail.service.ts` (lines 74-81)
- **Evidence:**
  ```typescript
  async getMailStats(): Promise<{ total: number; unread: number; analyzed: number }> {
    const all = await this.mailRepo.findAll(); // no limit!
    return { total: all.length, unread: all.filter(...).length, analyzed: all.filter(...).length };
  }
  ```
  Fetches every mail record into memory to count them. Same pattern in `SangforService.getAlertStats()`.
- **Impact:** O(n) memory usage. With millions of emails, this causes OOM.
- **Recommendation:** Use database-level aggregation: `COUNT(*)`, `COUNT(*) WHERE status = 'unread'`, etc.

### MEDIUM — Q3: No Error Differentiation in Application Services
- **File:** `packages/application/workflow/src/workflow.service.ts` (line 41), `packages/application/coding/src/coding.service.ts` (line 38)
- **Evidence:** `throw new Error(`Workflow not found: ${workflowId}`)` — generic Error class. No distinction between "not found" (404), "forbidden" (403), "invalid input" (400).
- **Impact:** Error handler returns 500 for all errors. Client cannot distinguish between error types.
- **Recommendation:** Use typed errors (NotFoundError, ForbiddenError, ValidationError) that map to HTTP status codes.

### MEDIUM — Q4: WorkflowService.executeWorkflow() Catches All Errors
- **File:** `packages/application/workflow/src/workflow.service.ts` (lines 74-80)
- **Evidence:**
  ```typescript
  } catch (error) {
    await this.executionRepo.update(executionId, { status: 'failed', error: String(error) });
  }
  ```
  All errors (including programming errors, connection failures) are caught and stored as "failed" execution. The caller receives a "failed" execution object but doesn't know if it's a workflow logic failure or a system error.
- **Impact:** System errors are silently swallowed. No alerting, no retry opportunity.
- **Recommendation:** Differentiate between workflow failures (expected) and system errors (unexpected). Re-throw system errors.

### MEDIUM — Q5: No Input Sanitization on Domain Entity Fields
- **File:** `packages/domain/mail/src/value-objects.ts` (line 15)
- **Evidence:** Email validation regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` is overly permissive. Allows `a@b.c` which is technically valid but could be used for spam/abuse.
- **Impact:** Low — but demonstrates insufficient input validation across the domain layer.
- **Recommendation:** Use a proper email validation library or stricter regex.

### MEDIUM — Q6: Error Handler Leaks Stack Traces in Development
- **File:** `apps/api/src/middleware/error-handler.ts` (line 27)
- **Evidence:** `console.error('Unhandled error:', err)` logs the full error object including stack trace. In production, this goes to stdout which may be captured by log aggregation.
- **Impact:** Stack traces in logs could expose internal paths and code structure.
- **Recommendation:** Use structured logging with redaction. Only include stack traces in development.

### LOW — Q7: Duplicate Schema Files in Domain
- **File:** `packages/domain/dist/models/index 2.d.ts`, `packages/domain/dist/models/index 2.js`
- **Evidence:** Build artifacts contain files with ` 2` suffix, suggesting merge conflicts or accidental copies.
- **Impact:** Confusion about which file is canonical.
- **Recommendation:** Clean up build artifacts. Add `.gitignore` for `dist/`.

### LOW — Q8: tRPC Error Logging Uses console.error
- **File:** `apps/api/src/index.ts` (line 81)
- **Evidence:** `onError: ({ error }) => console.error('tRPC Error:', error)` — no structured logging.
- **Impact:** Inconsistent log format with rest of application.
- **Recommendation:** Use a structured logger.

---

## 4. Operations Reviewer

### HIGH — O1: No Graceful Shutdown for API Server
- **File:** `apps/api/src/index.ts` (lines 91-101)
- **Evidence:**
  ```typescript
  app.listen(PORT, () => { console.log(`🚀 AIOS API Server running on port ${PORT}`); });
  ```
  No `process.on('SIGTERM')` handler. No connection draining. No cleanup of in-memory stores.
- **Impact:** In-flight requests are terminated abruptly. Rate limiter state lost. Monitoring events not flushed.
- **Recommendation:** Implement graceful shutdown: stop accepting new connections, wait for in-flight requests, flush monitoring, disconnect DB.

### MEDIUM — O2: No Request Logging Middleware
- **File:** `apps/api/src/` — no request logger
- **Evidence:** No morgan, no pino-http, no request/response logging middleware.
- **Impact:** Cannot debug API issues. No audit trail of API calls.
- **Recommendation:** Add request logging middleware with method, path, status, duration, userId.

### MEDIUM — O3: Health Check Doesn't Verify Dependencies
- **File:** `apps/api/src/index.ts` (lines 27-29)
- **Evidence:**
  ```typescript
  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  ```
  Always returns `ok` regardless of database connectivity, LLM availability, or any other dependency.
- **Impact:** Load balancer routes traffic to unhealthy instances.
- **Recommendation:** Add `/health/ready` that checks DB connection, critical service availability.

### MEDIUM — O4: No CORS Preflight Cache Configuration
- **File:** `apps/api/src/index.ts` (line 22)
- **Evidence:** `cors()` without `maxAge` option. Browsers send preflight OPTIONS requests on every cross-origin request.
- **Impact:** Increased latency for cross-origin API calls.
- **Recommendation:** Add `maxAge: 86400` to cache preflight responses.

### LOW — O5: API Port Configuration Has No Validation
- **File:** `apps/api/src/index.ts` (line 16)
- **Evidence:** `const PORT = process.env.API_PORT || 3200` — no validation that PORT is a valid port number.
- **Impact:** Invalid port causes cryptic error on startup.
- **Recommendation:** Validate port is a number between 1024-65535.

---

## 5. Requirements Reviewer

### HIGH — R1: No Pagination Implementation — Only Stub Responses
- **File:** `apps/api/src/routers/mail.router.ts` (lines 10-16)
- **Evidence:** `list` accepts `limit` and `offset` but always returns `{ mails: [], total: 0 }`. The service layer has `findAll(options)` but it's never called.
- **Impact:** API consumers cannot retrieve data. Pagination parameters are accepted but non-functional.
- **Recommendation:** Wire up actual repository calls with pagination.

### MEDIUM — R2: No CORS for Multiple Origins
- **File:** `apps/api/src/index.ts` (line 22)
- **Evidence:** Single origin `http://localhost:3110`. Production may need multiple frontend domains.
- **Impact:** Frontend on different domain cannot access API.
- **Recommendation:** Support array of origins via environment variable.

### MEDIUM — R3: Workflow Create Endpoint Doesn't Validate Step Graph
- **File:** `apps/api/src/routers/workflow.router.ts` (lines 22-38)
- **Evidence:** `startStep` is validated as a string but not checked to exist in the `steps` array. `nextSteps` references are not validated to exist.
- **Impact:** Invalid workflow definitions that reference non-existent steps.
- **Recommendation:** Add Zod refinement to validate step graph integrity.

### MEDIUM — R4: No API Versioning Strategy
- **File:** `apps/api/src/index.ts`
- **Evidence:** Routes are at `/trpc` and `/api` with no version prefix (e.g., `/api/v1/`).
- **Impact:** Breaking changes affect all clients simultaneously.
- **Recommendation:** Implement URL-based or header-based API versioning.

### LOW — R5: Missing API Documentation
- **File:** `apps/api/` — no OpenAPI/Swagger spec
- **Evidence:** tRPC generates types but no REST API documentation. No Swagger UI endpoint.
- **Impact:** Developers must read source code to understand API.
- **Recommendation:** Add tRPC OpenAPI generator or separate API documentation.

---

## Findings Summary

| ID | Severity | Persona | Title |
|----|----------|---------|-------|
| S1 | **Critical** | Security | Authentication bypass via header spoofing |
| S2 | **Critical** | Security | Development mode grants ADMIN to all |
| S3 | **Critical** | Security | tRPC context trusts headers without validation |
| S4 | **Critical** | Security | CORS misconfiguration risk with credentials |
| S5 | **High** | Security | No authorization — any user accesses any resource |
| S6 | **High** | Security | 10MB request body limit |
| A1 | **High** | Architecture | Application services disconnected from routers |
| A2 | **High** | Architecture | No dependency injection container |
| A3 | **High** | Architecture | Domain entities are flat data, not rich models |
| Q1 | **High** | Quality | LLM JSON output not validated with Zod |
| Q2 | **High** | Quality | Stats endpoints fetch all records into memory |
| O1 | **High** | Operations | No graceful shutdown |
| R1 | **High** | Requirements | Pagination is stub-only |
| S7 | **Medium** | Security | In-memory rate limiter not distributed |
| S8 | **Medium** | Security | Rate limiter keyed by IP (proxy issues) |
| A4 | **Medium** | Architecture | Date.now() ID generation — collision risk |
| A5 | **Medium** | Architecture | ID generation duplicated in router and service |
| Q3 | **Medium** | Quality | No error type differentiation |
| Q4 | **Medium** | Quality | Workflow execution swallows all errors |
| Q5 | **Medium** | Quality | Permissive email validation regex |
| Q6 | **Medium** | Quality | Stack traces in error logs |
| O2 | **Medium** | Operations | No request logging |
| O3 | **Medium** | Operations | Health check doesn't verify dependencies |
| O4 | **Medium** | Operations | No CORS preflight cache |
| R2 | **Medium** | Requirements | Single CORS origin |
| R3 | **Medium** | Requirements | Workflow step graph not validated |
| R4 | **Medium** | Requirements | No API versioning strategy |
| Q7 | **Low** | Quality | Duplicate build artifact files |
| Q8 | **Low** | Quality | tRPC error logging uses console.error |
| O5 | **Low** | Operations | No port validation |
| R5 | **Low** | Requirements | Missing API documentation |
