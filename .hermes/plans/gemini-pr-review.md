# Gemini PR Review — Track A: Full Codebase Review

**Reviewer:** Gemini (Hermes Agent)
**Date:** 2026-06-14
**Scope:** Full source code (apps/, packages/, plugins/, tests/)
**Project:** AIOSv2 Integration — Modular Monolith Monorepo

---

## Summary

This PR review covers the entire AIOSv2 integration codebase, a Turborepo-based monorepo with Next.js (web), Express/tRPC (API), domain packages, infrastructure adapters, and plugin system. The codebase demonstrates solid architectural patterns (DDD layering, approval gates, Zod validation schemas), but has **critical security vulnerabilities** in authentication and authorization that must be resolved before production deployment.

**Overall Assessment:** ❌ **Request Changes** — 3 Critical, 5 High findings block production readiness.

| Severity | Count |
|----------|-------|
| Critical | 3     |
| High     | 5     |
| Medium   | 8     |
| Low      | 6     |

---

## Findings by Severity

### Critical

#### CRIT-001: Hardcoded NextAuth Secret Fallback

```json
{
  "id": "CRIT-001",
  "severity": "Critical",
  "category": "auth",
  "file": "apps/web/src/lib/auth/index.ts",
  "line": 10,
  "title": "Hardcoded fallback secret in NextAuth configuration",
  "description": "NextAuth secret uses hardcoded fallback 'aiosv2-dev-secret-2024' when NEXTAUTH_SECRET env var is missing. If deployed without the env var, all session tokens are signed with a publicly known secret, enabling session forgery.",
  "code": "secret: process.env.NEXTAUTH_SECRET || 'aiosv2-dev-secret-2024'",
  "impact": "Complete session forgery. Attacker can forge valid JWT/session tokens for any user.",
  "recommendation": "Remove the hardcoded fallback. Throw an error at startup if NEXTAUTH_SECRET is not set. The @aios/config schema already validates this — integrate it.",
  "fix": "secret: process.env.NEXTAUTH_SECRET! // Let it fail loudly if missing"
}
```

#### CRIT-002: API Auth Middleware Trusts Client-Supplied Headers

```json
{
  "id": "CRIT-002",
  "severity": "Critical",
  "category": "auth",
  "file": "apps/api/src/middleware/auth.ts",
  "line": 24,
  "title": "Authentication bypass via spoofed X-User-Id header",
  "description": "The Express API auth middleware trusts x-user-id and x-user-email headers directly from the client request without any token/session verification. Any HTTP client can impersonate any user by setting these headers. In development mode, all requests default to ADMIN role.",
  "code": "const userId = req.headers['x-user-id'] as string;",
  "impact": "Complete authentication bypass. Any client can impersonate any user including admins. The tRPC protectedProcedure also relies on ctx.userId which comes from this middleware.",
  "recommendation": "Replace header-based auth with proper JWT/session verification. Validate tokens server-side using the TokenManager or NextAuth session. Never trust client-supplied identity headers.",
  "fix": "Verify JWT token from Authorization header or session cookie, then extract user identity from the verified token."
}
```

#### CRIT-003: Next.js Middleware Bypasses All API Authentication

```json
{
  "id": "CRIT-003",
  "severity": "Critical",
  "category": "auth",
  "file": "apps/web/src/proxy.ts",
  "line": 17,
  "title": "Next.js middleware allows all /api routes without authentication",
  "description": "The proxy.ts middleware explicitly returns NextResponse.next() for ALL routes starting with '/api', bypassing any authentication check. This means all Next.js API routes (approvals, collaboration/execute, sangfor/workflows, customers, partners, etc.) are accessible without any authentication.",
  "code": "if (pathname.startsWith('/api')) { return NextResponse.next() }",
  "impact": "All Next.js API endpoints are publicly accessible without authentication. Sensitive operations like approval resolution, workflow execution, and data mutations are exposed.",
  "recommendation": "Implement proper session verification in the middleware for API routes. Use NextAuth's auth() function to check sessions. Only exempt truly public endpoints like /api/auth/* and /api/ops/health.",
  "fix": "Check session for /api routes, redirect to 401 for unauthenticated requests, with explicit allowlist for public routes."
}
```

---

### High

#### HIGH-001: Development Mode Authentication Bypass with Admin Role

```json
{
  "id": "HIGH-001",
  "severity": "High",
  "category": "auth",
  "file": "apps/api/src/middleware/auth.ts",
  "line": 36,
  "title": "Dev mode grants ADMIN role without authentication",
  "description": "When NODE_ENV=development, the auth middleware grants ADMIN role to all requests without any authentication. If NODE_ENV is misconfigured in production (a common mistake), this provides full admin access to all API endpoints.",
  "code": "if (process.env.NODE_ENV === 'development') { req.user = { id: 'dev-user', email: 'dev@aios.local', name: 'Developer', role: 'ADMIN' }; }",
  "impact": "If NODE_ENV is accidentally 'development' in production, all API endpoints are accessible with full admin privileges.",
  "recommendation": "Never grant elevated roles based on NODE_ENV. Use a separate explicit flag like DEV_AUTH_BYPASS that defaults to false, and log warnings when active."
}
```

#### HIGH-002: Development Mode Approval Gate Bypass

```json
{
  "id": "HIGH-002",
  "severity": "High",
  "category": "auth",
  "file": "apps/web/src/lib/integrations/approval-middleware.ts",
  "line": 223,
  "title": "Approval gates bypassed in all non-production environments",
  "description": "createGatedHandler skips ALL approval gates when NODE_ENV !== 'production'. This includes destructive operations like workflow execution, data mutations, and config changes. The skipOnDev option in withApprovalGate has the same issue.",
  "code": "if (process.env.NODE_ENV !== 'production') { /* bypass approval gate */ }",
  "impact": "Staging/testing deployments have no approval gates. Any misconfiguration of NODE_ENV removes all safety controls for destructive operations.",
  "recommendation": "Use an explicit environment variable like APPROVAL_GATE_DISABLED=true to opt out, rather than relying on NODE_ENV. Default to gates ON in all environments."
}
```

#### HIGH-003: Command Injection in ProcessSandbox

```json
{
  "id": "HIGH-003",
  "severity": "High",
  "category": "security",
  "file": "packages/infrastructure/sandbox/src/process-sandbox.ts",
  "line": 29,
  "title": "Shell command injection via JSON.stringify in ProcessSandbox",
  "description": "ProcessSandbox.execute() builds a command string by JSON.stringify-ing each argument and joining with spaces, then passes to execAsync which runs in a shell. JSON.stringify does NOT prevent shell metacharacter injection — a crafted argument like 'foo$(malicious)' will be JSON-quoted but the $() will still be interpreted by the shell. Additionally, writeFile/readFile join paths without sanitization.",
  "code": "const fullCommand = [command, ...args].map((a) => JSON.stringify(a)).join(' '); await execAsync(fullCommand, ...);",
  "impact": "Arbitrary command execution on the host system if user-controlled input reaches the sandbox.",
  "recommendation": "Use spawn() instead of exec() to avoid shell interpretation. If exec is required, use proper shell escaping (not JSON.stringify). Validate and sanitize all file paths."
}
```

#### HIGH-004: Command Injection in DockerSandbox

```json
{
  "id": "HIGH-004",
  "severity": "High",
  "category": "security",
  "file": "packages/infrastructure/sandbox/src/docker-sandbox.ts",
  "line": 66,
  "title": "Shell command injection in DockerSandbox via string concatenation",
  "description": "DockerSandbox builds docker commands via string concatenation and passes to execAsync (shell execution). The writeFile method (line 113) directly interpolates filePath into a shell command: `echo '${encoded}' | base64 -d > ${filePath}`. A malicious filePath could escape the shell context.",
  "code": "await execAsync(`docker ${fullCommand.join(' ')}`, ...);",
  "impact": "Container escape or host command execution if user-controlled input reaches DockerSandbox methods.",
  "recommendation": "Use spawn() with argument arrays instead of exec() with string concatenation. Sanitize filePath parameters."
}
```

#### HIGH-005: OAuth Tokens Stored in Plain Text

```json
{
  "id": "HIGH-005",
  "severity": "High",
  "category": "security",
  "file": "packages/auth/src/token-manager.ts",
  "line": 129,
  "title": "Microsoft Graph OAuth tokens stored without encryption",
  "description": "TokenManager.storeGraphToken() stores access tokens and refresh tokens in plain text in an in-memory Map. The code comment explicitly states '암호화는 추후' (encryption later). Refresh tokens are long-lived credentials that grant persistent access to Microsoft Graph APIs.",
  "code": "// 평문 저장 (암호화는 추후) ... this.store.set(product, stored);",
  "impact": "If the process memory is dumped (e.g., via crash dump, /proc/pid/mem), all OAuth tokens including refresh tokens are exposed in plain text.",
  "recommendation": "Encrypt tokens at rest using the signing key or a dedicated encryption key. For production, use a proper secrets manager or encrypted store."
}
```

---

### Medium

#### MED-001: In-Memory Rate Limiter Won't Scale

```json
{
  "id": "MED-001",
  "severity": "Medium",
  "category": "api",
  "file": "apps/api/src/middleware/rate-limiter.ts",
  "line": 13,
  "title": "Rate limiter uses in-memory Map with no eviction",
  "description": "The rate limiter stores entries in a Map that never evicts stale entries. Over time, this causes unbounded memory growth. Additionally, it doesn't work across multiple process instances.",
  "impact": "Memory leak in long-running processes. Rate limiting is ineffective with multiple instances.",
  "recommendation": "Use a Redis-backed rate limiter (e.g., rate-limiter-flexible) for production. Add periodic cleanup of expired entries."
}
```

#### MED-002: No CSRF Protection on Next.js API Routes

```json
{
  "id": "MED-002",
  "severity": "Medium",
  "category": "security",
  "file": "apps/web/src/app/api/*",
  "title": "No CSRF protection on state-changing API endpoints",
  "description": "Next.js API routes (approvals, commands, workflows, collaboration/execute, sangfor/workflows) accept POST requests without CSRF token validation. While SameSite cookies provide some protection, they don't cover all attack vectors.",
  "impact": "Cross-site request forgery attacks could trigger workflow executions, approval resolutions, or data mutations.",
  "recommendation": "Implement CSRF token validation for all state-changing endpoints. Use NextAuth's built-in CSRF protection or a custom middleware."
}
```

#### MED-003: Missing Input Validation on Approval Endpoints

```json
{
  "id": "MED-003",
  "severity": "Medium",
  "category": "api",
  "file": "apps/web/src/app/api/approvals/route.ts",
  "line": 30,
  "title": "Approval endpoints accept unvalidated body fields",
  "description": "The POST /api/approvals endpoint reads body fields (type, sessionId, assignmentId, requester, requestedBy, target, context) directly without schema validation. Type checking is minimal (only status and actionType are validated).",
  "impact": "Unexpected data shapes could cause runtime errors or bypass intended business logic.",
  "recommendation": "Define Zod schemas for all request bodies and validate before processing."
}
```

#### MED-004: No GitHub Webhook Signature Verification

```json
{
  "id": "MED-004",
  "severity": "Medium",
  "category": "security",
  "file": "apps/web/src/app/api/github/webhooks/route.ts",
  "title": "GitHub webhook endpoint does not verify HMAC signatures",
  "description": "The webhook handler proxies requests to AIOS v1 without verifying the X-Hub-Signature-256 header. This means any attacker can send forged webhook payloads.",
  "impact": "Forged webhook payloads could trigger unintended actions (config changes, deployments).",
  "recommendation": "Verify GitHub webhook signatures using HMAC-SHA256 before processing."
}
```

#### MED-005: No RBAC Implementation

```json
{
  "id": "MED-005",
  "severity": "Medium",
  "category": "auth",
  "file": "apps/api/src/middleware/auth.ts",
  "title": "Role field exists but no role-based access control is enforced",
  "description": "The AuthUser interface has a role field, but no middleware or route handler checks roles. All authenticated users (or dev-bypassed users) have the same access level. The tRPC protectedProcedure only checks for authentication, not authorization.",
  "impact": "No privilege separation. Any authenticated user can perform any operation.",
  "recommendation": "Implement role-based middleware that checks user roles against required permissions for each endpoint."
}
```

#### MED-006: Duplicate AppError Class Definitions

```json
{
  "id": "MED-006",
  "severity": "Medium",
  "category": "quality",
  "files": ["packages/shared/src/utils/errors.ts", "apps/api/src/middleware/error-handler.ts"],
  "title": "Two incompatible AppError classes with different signatures",
  "description": "packages/shared defines AppError(message, code, statusCode, details) while apps/api defines AppError(statusCode, message, code). The constructor parameter order is different, which will cause bugs if code imports the wrong one.",
  "impact": "Runtime errors if the wrong AppError is used. Error properties may be swapped.",
  "recommendation": "Consolidate to a single AppError class in @aios/shared and import it everywhere."
}
```

#### MED-007: Collaboration Execute Endpoint Has No Rate Limiting

```json
{
  "id": "MED-007",
  "severity": "Medium",
  "category": "api",
  "file": "apps/web/src/app/api/collaboration/execute/route.ts",
  "title": "Heavy execution endpoint has no rate limiting or concurrency control",
  "description": "The POST /api/collaboration/execute endpoint spawns external processes (cursor-agent, opencode) but has no rate limiting, concurrency limits, or resource quotas. Multiple concurrent requests could exhaust system resources.",
  "impact": "Denial of service through resource exhaustion. Multiple concurrent executions could crash the server.",
  "recommendation": "Add concurrency limits (e.g., max 2-3 concurrent executions), rate limiting, and request timeouts."
}
```

#### MED-008: Idempotency Cache Has Weak Key Collision Resistance

```json
{
  "id": "MED-008",
  "severity": "Medium",
  "category": "api",
  "file": "apps/web/src/lib/integrations/approval-middleware.ts",
  "line": 16,
  "title": "In-memory idempotency cache lost on restart, weak eviction",
  "description": "The idempotency cache uses a simple Map with FIFO eviction at 500 entries. Cache is lost on process restart. The cache key includes userId but not the full request body hash, so different requests with the same idempotency key could collide.",
  "impact": "Idempotency guarantees break across restarts. Potential for incorrect cached responses.",
  "recommendation": "Use Redis for idempotency cache. Include request body hash in cache key."
}
```

---

### Low

#### LOW-001: Missing Test Coverage for Authentication

```json
{
  "id": "LOW-001",
  "severity": "Low",
  "category": "test",
  "title": "No tests for auth middleware, NextAuth config, or TokenManager",
  "description": "The test suite has no dedicated tests for: apps/web/src/lib/auth/* (NextAuth config), apps/api/src/middleware/auth.ts (Express auth middleware), packages/auth/src/token-manager.ts (JWT token management).",
  "impact": "Auth logic regressions could go undetected.",
  "recommendation": "Add unit tests for auth middleware, token verification, and session management."
}
```

#### LOW-002: Missing Test Coverage for API Routes

```json
{
  "id": "LOW-002",
  "severity": "Low",
  "category": "test",
  "title": "Most Next.js API routes lack integration tests",
  "description": "Only aios-v1-routes.test.ts exists for API route testing. Routes like /api/approvals, /api/collaboration/*, /api/sangfor/*, /api/customers, /api/partners, /api/workflows have no tests.",
  "impact": "API contract violations and regressions could go undetected.",
  "recommendation": "Add integration tests for all API routes, at minimum for happy path and error cases."
}
```

#### LOW-003: Duplicate Files with " 2" Suffix

```json
{
  "id": "LOW-003",
  "severity": "Low",
  "category": "quality",
  "files": ["eslint.config 2.js", "apps/web/src/lib/schemas/aios-v1.schema 2.ts", "apps/web/src/lib/services/command-registry 2.ts"],
  "title": "Multiple files with ' 2' suffix indicating merge artifacts",
  "description": "Several files exist with ' 2' in their names, likely from merge conflicts or accidental copies. These are confusing and may cause import issues.",
  "impact": "Developer confusion. Potential import of wrong file version.",
  "recommendation": "Remove duplicate files and ensure only canonical versions remain."
}
```

#### LOW-004: Hardcoded Username in MemoryTowerClient

```json
{
  "id": "LOW-004",
  "severity": "Low",
  "category": "quality",
  "file": "packages/infrastructure/memory/src/memory-tower-client.ts",
  "line": 75,
  "title": "Hardcoded default userId 'jmpark'",
  "description": "MemoryTowerClient defaults userId to 'jmpark' which is a developer-specific value.",
  "code": "this.userId = config.userId ?? 'jmpark';",
  "impact": "Incorrect user attribution in non-development environments.",
  "recommendation": "Use a generic default like 'default' or require userId explicitly."
}
```

#### LOW-005: Inconsistent Error Response Format

```json
{
  "id": "LOW-005",
  "severity": "Low",
  "category": "quality",
  "title": "Three different error response formats across API routes",
  "description": "Routes return errors in at least 3 formats: { error: string }, { error: { code, message } }, and { success: false, error: string }. This makes client-side error handling inconsistent.",
  "impact": "Difficult client-side error handling. Potential for missed error cases.",
  "recommendation": "Standardize on a single error response format across all endpoints."
}
```

#### LOW-006: Misleading getConfigUnsafe Function Name

```json
{
  "id": "LOW-006",
  "severity": "Low",
  "category": "quality",
  "file": "packages/config/src/schema.ts",
  "line": 115,
  "title": "getConfigUnsafe() just calls getConfig() — misleading name",
  "description": "The function getConfigUnsafe is documented as '검증 없이 설정 읽기' (read config without validation) but it simply calls getConfig() which performs full validation.",
  "impact": "Developer confusion about what the function actually does.",
  "recommendation": "Either make it actually skip validation or rename/remove it."
}
```

---

## Approval Recommendation

**❌ Request Changes**

The codebase has **3 Critical** and **5 High** severity findings that must be resolved before production deployment. The most urgent issues are:

1. **Authentication is fundamentally broken** — the Next.js middleware bypasses all auth, the Express API trusts client headers, and hardcoded secrets enable session forgery.
2. **Command injection vulnerabilities** exist in both sandbox implementations.
3. **Approval gates can be bypassed** via NODE_ENV misconfiguration.

The architectural foundation is sound (DDD, approval gates, Zod schemas), but the security implementation needs significant hardening.

---

## Required Fixes

### Before Merge (Blocking)

| # | Finding | Fix Required |
|---|---------|-------------|
| 1 | CRIT-001 | Remove hardcoded NextAuth secret fallback. Fail fast if NEXTAUTH_SECRET is not set. |
| 2 | CRIT-002 | Replace header-based auth with JWT/session verification in Express API middleware. |
| 3 | CRIT-003 | Add session verification to Next.js middleware for /api routes. |
| 4 | HIGH-001 | Remove NODE_ENV-based admin bypass. Use explicit opt-in flag. |
| 5 | HIGH-002 | Remove NODE_ENV-based approval gate bypass. Gates should be ON by default. |
| 6 | HIGH-003 | Refactor ProcessSandbox to use spawn() instead of exec(). |
| 7 | HIGH-004 | Refactor DockerSandbox to use spawn() instead of exec() with string concatenation. |
| 8 | HIGH-005 | Implement token encryption or use a secrets manager for OAuth tokens. |

### Before Production (Non-blocking)

| # | Finding | Recommendation |
|---|---------|---------------|
| 9 | MED-001 | Use Redis-backed rate limiter |
| 10 | MED-002 | Add CSRF protection |
| 11 | MED-003 | Add Zod schemas for all request bodies |
| 12 | MED-004 | Verify GitHub webhook signatures |
| 13 | MED-005 | Implement RBAC |
| 14 | MED-006 | Consolidate AppError classes |
| 15 | MED-007 | Add concurrency limits for execution endpoint |
| 16 | MED-008 | Use Redis for idempotency cache |

### Technical Debt

| # | Finding | Action |
|---|---------|--------|
| 17 | LOW-001 | Add auth test coverage |
| 18 | LOW-002 | Add API route integration tests |
| 19 | LOW-003 | Remove duplicate " 2" files |
| 20 | LOW-004 | Remove hardcoded username |
| 21 | LOW-005 | Standardize error response format |
| 22 | LOW-006 | Fix misleading getConfigUnsafe function |

---

## Positive Observations

- **Zod schema validation** is well-implemented for AIOS v1 schemas (`aios-v1.schema.ts`) with proper input sanitization
- **Approval gate system** is architecturally sound with proper idempotency support
- **Domain layer** follows DDD patterns with proper entity/value-object separation
- **Config validation** (`@aios/config`) enforces required secrets at startup
- **Secret masking** utility for logging is a good security practice
- **Type-safe Prisma queries** with safe select/omit constants prevent data leakage
- **Comprehensive test suite** exists for infrastructure layer (file stores, evidence writer, session coordinator)
