# Red Team Review: Phase B-2 (Infrastructure Adapters)

**Date:** 2026-06-14
**Scope:** `packages/infrastructure/` — LLM clients, memory, MCP, sandbox, RAG, agents, learning, storage, monitoring, workflow
**Reviewers:** Security, Architecture, Quality, Operations, Requirements

---

## Summary

Phase B-2 provides infrastructure adapters for LLM providers, memory management, MCP protocol, sandbox execution, RAG, monitoring, and workflow orchestration. The codebase is well-structured with clean abstractions but has critical security vulnerabilities in sandbox execution and command injection surfaces.

**Findings:** 4 Critical · 5 High · 7 Medium · 5 Low

---

## 1. Security Reviewer

### CRITICAL — S1: Command Injection in Docker Sandbox
- **File:** `packages/infrastructure/sandbox/src/docker-sandbox.ts` (lines 66, 83, 112-113)
- **Evidence:**
  ```typescript
  // Line 66: args joined with spaces, no escaping
  const { stdout } = await execAsync(`docker ${args.join(' ')}`, ...);
  
  // Line 83: container name and command injected directly
  const fullCommand = ['exec', this.config.containerName!, command, ...args];
  await execAsync(`docker ${fullCommand.join(' ')}`, ...);
  
  // Line 112-113: filePath injected into shell command
  'sh', '-c', `echo '${encoded}' | base64 -d > ${filePath}`,
  ```
- **Impact:** If `command`, `args`, `filePath`, or `containerName` contain shell metacharacters (e.g., `; rm -rf /`), arbitrary commands execute on the host. The `JSON.stringify` in ProcessSandbox (line 29) is insufficient because the result is still passed to `execAsync` which runs through a shell.
- **Recommendation:** Use `execFile` instead of `exec` (no shell interpretation). For Docker, use the Docker API client library instead of CLI shell commands. At minimum, validate all inputs against an allowlist regex.

### CRITICAL — S2: Command Injection in Process Sandbox
- **File:** `packages/infrastructure/sandbox/src/process-sandbox.ts` (lines 29, 32)
- **Evidence:**
  ```typescript
  const fullCommand = [command, ...args].map((a) => JSON.stringify(a)).join(' ');
  const { stdout, stderr } = await execAsync(fullCommand, ...);
  ```
  `JSON.stringify` wraps strings in quotes but does NOT prevent injection. A command like `"; rm -rf / #"` becomes `""; rm -rf / #""` which still executes via shell.
- **Impact:** Arbitrary code execution on the host machine.
- **Recommendation:** Use `child_process.spawn` with `shell: false` and pass args as array. Validate `command` against `allowedCommands` list (which exists in config but is never checked!).

### CRITICAL — S3: allowedCommands Config is Never Enforced
- **File:** `packages/infrastructure/sandbox/src/process-sandbox.ts` (lines 23-24, 27-32)
- **Evidence:** `config.allowedCommands` is set to `['node', 'python3', 'echo']` but the `execute()` method never checks if `command` is in this list. Any command can be executed.
- **Impact:** The security boundary is completely ineffective.
- **Recommendation:** Add validation: `if (!this.config.allowedCommands.includes(command)) throw new Error('Command not allowed')`.

### CRITICAL — S4: Path Traversal in LocalStorageProvider
- **File:** `packages/infrastructure/storage/src/local-storage.ts` (lines 17-20, 32-35, 37-39)
- **Evidence:**
  ```typescript
  const fullPath = path.join(this.basePath, filePath);
  // No validation that fullPath is within basePath
  ```
  A `filePath` of `../../etc/passwd` would resolve outside `basePath`.
- **Impact:** Arbitrary file read/write/delete on the host filesystem.
- **Recommendation:** After `path.join`, verify `fullPath.startsWith(path.resolve(basePath))`. Reject paths with `..` components.

### HIGH — S5: Path Traversal in Process Sandbox File Operations
- **File:** `packages/infrastructure/sandbox/src/process-sandbox.ts` (lines 54-58, 61-64)
- **Evidence:** `writeFile` and `readFile` join `filePath` with temp dir but don't validate the result stays within the temp dir.
- **Impact:** Read/write arbitrary files relative to temp directory.
- **Recommendation:** Validate resolved path is within `this.tempDir`.

### HIGH — S6: MCP Client Sends Requests Without Authentication
- **File:** `packages/infrastructure/mcp/src/client.ts` (lines 43-55)
- **Evidence:** `sendRequest` sends POST to `${this.serverUrl}/mcp` with no auth headers, no TLS verification, no token.
- **Impact:** Any process on the same network can impersonate the MCP server or intercept requests (MITM).
- **Recommendation:** Add API key or mTLS authentication. Validate server URL is HTTPS in production.

### HIGH — S7: MemoryTowerClient Spawns Python with User-Controlled Paths
- **File:** `packages/infrastructure/memory/src/memory-tower-client.ts` (lines 226, 152-166)
- **Evidence:**
  ```typescript
  const child = spawn(this.pythonCommand, [serverPath], ...);
  // serverPath comes from config, and ingestFile/ingestDirectory pass user-controlled filePath/dirPath
  ```
  `ingestFile(filePath)` and `ingestDirectory(dirPath)` pass user input directly to the Python MCP server as arguments.
- **Impact:** If the MCP server doesn't validate paths, arbitrary file access.
- **Recommendation:** Validate paths are within expected directories before passing to MCP server.

### MEDIUM — S8: LLM API Keys Exposed in Constructor
- **File:** `packages/infrastructure/llm/src/openai.ts` (line 27), `packages/infrastructure/llm/src/anthropic.ts` (line 27)
- **Evidence:** API keys are read from `config.apiKey` or environment. If config is logged or serialized, keys are exposed.
- **Impact:** API key leakage through debug logs or error reports.
- **Recommendation:** Never store API keys in plain config objects. Use a secrets manager. Redact keys in toString/serialization.

---

## 2. Architecture Reviewer

### HIGH — A1: In-Memory State Without Persistence (ConversationMemory, SelfLearning, Metrics)
- **File:** `packages/infrastructure/memory/src/conversation-memory.ts` (line 9), `packages/infrastructure/learning/src/self-learning.ts` (line 24), `packages/infrastructure/monitoring/src/metrics.ts` (line 25)
- **Evidence:** All three use in-memory `Map`/arrays. `ConversationMemory` stores sessions in a `Map`, `SelfLearningSystem` stores examples in an array, `MetricsCollector` stores metrics in an array.
- **Impact:** All data lost on process restart. Not suitable for production. No horizontal scaling possible.
- **Recommendation:** Implement persistent backends (Redis, database). At minimum, document that these are development-only implementations.

### HIGH — A2: Workflow Engine Stores Executions in Memory
- **File:** `packages/infrastructure/workflow/src/engine.ts` (line 38)
- **Evidence:** `private executions: Map<string, WorkflowExecutionContext> = new Map()` — all workflow execution state is in-memory.
- **Impact:** Workflow state lost on crash. Cannot resume interrupted workflows. Memory leak for long-running processes.
- **Recommendation:** Persist execution state to database. Implement checkpoint/resume mechanism.

### HIGH — A3: Workflow Scheduler Doesn't Execute Workflows
- **File:** `packages/infrastructure/workflow/src/scheduler.ts` (lines 60-67)
- **Evidence:** `startSchedule()` only logs a message: `console.log(`Scheduled workflow ${schedule.workflowId} triggered`)`. It doesn't actually call the workflow engine.
- **Impact:** Scheduled workflows never execute. The feature is a no-op stub.
- **Recommendation:** Inject `WorkflowEngine` dependency and call `engine.execute()` in the schedule callback.

### MEDIUM — A4: LLMClientFactory Instantiates All Providers Eagerly
- **File:** `packages/infrastructure/llm/src/factory.ts` (lines 26-28)
- **Evidence:** Constructor creates all three LLM clients regardless of which ones are configured. Each client initializes its SDK instance.
- **Impact:** Wasted resources. If only OpenAI is used, Anthropic and LM Studio clients are still created.
- **Recommendation:** Use lazy initialization — create clients only when first requested.

### MEDIUM — A5: PgVectorClient is a No-Op Stub
- **File:** `packages/infrastructure/rag/src/pgvector.ts` (lines 19-33)
- **Evidence:** All methods just `console.log()` and return empty results. No actual database connection.
- **Impact:** Any code using PgVectorClient silently produces no results.
- **Recommendation:** Implement or clearly mark as TODO. Remove from public exports if not ready.

### MEDIUM — A6: LightRAG Client Uses Axios While Others Use Fetch
- **File:** `packages/infrastructure/rag/src/lightrag.ts` (line 6)
- **Evidence:** `import axios from 'axios'` — inconsistent with other HTTP clients that use `fetch`.
- **Impact:** Extra dependency. Inconsistent error handling patterns.
- **Recommendation:** Standardize on `fetch` (already used by MCP client and Langfuse).

---

## 3. Quality Reviewer

### HIGH — Q1: No Input Validation on LLM Message Content
- **File:** `packages/infrastructure/llm/src/openai.ts` (line 38), `packages/infrastructure/llm/src/anthropic.ts` (line 39)
- **Evidence:** Messages are passed directly to LLM APIs with no sanitization. `messages.map((m) => ({ role: m.role, content: m.content }))` — no length check, no content filter.
- **Impact:** Prompt injection attacks. Extremely long messages causing API errors or cost overruns.
- **Recommendation:** Add max message length validation. Consider prompt injection detection.

### MEDIUM — Q2: Anthropic isAvailable() Makes a Real API Call
- **File:** `packages/infrastructure/llm/src/anthropic.ts` (lines 93-104)
- **Evidence:** `isAvailable()` creates a real message with `max_tokens: 10` and content "ping". This costs money and has latency.
- **Impact:** `LLMClientFactory.getAvailableClient()` makes paid API calls just to check availability.
- **Recommendation:** Use a lightweight health check endpoint if available, or cache availability status with TTL.

### MEDIUM — Q3: Error Swallowing in isAvailable() Methods
- **File:** `packages/infrastructure/llm/src/openai.ts` (lines 79-86), `packages/infrastructure/llm/src/lm-studio.ts` (lines 80-87)
- **Evidence:** `catch { return false; }` — all errors are silently swallowed. Network errors, auth errors, rate limits — all return `false`.
- **Impact:** Impossible to diagnose why a provider is unavailable.
- **Recommendation:** Log the error before returning false. Consider differentiating between "unavailable" and "misconfigured".

### MEDIUM — Q4: BaseAgent.parseStep() Has Fragile Regex Parsing
- **File:** `packages/infrastructure/agents/src/base-agent.ts` (lines 91-106)
- **Evidence:** LLM output is parsed with simple regex: `/Thought:\s*(.*?)(?=Action:|Final Answer:|$)/s`. This is extremely fragile — any deviation in LLM output format breaks the agent loop.
- **Impact:** Agent silently fails to parse actions, falls through to "Final Answer" with the raw LLM output as the answer.
- **Recommendation:** Use structured output (JSON mode) from LLM instead of regex parsing. Add fallback parsing strategies.

### MEDIUM — Q5: ConversationMemory ID Generation Uses Math.random()
- **File:** `packages/infrastructure/memory/src/conversation-memory.ts` (line 31)
- **Evidence:** `id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`` — not cryptographically random.
- **Impact:** ID collisions possible under high concurrency. Not a security issue per se, but could cause data overwrites.
- **Recommendation:** Use `crypto.randomUUID()` for ID generation.

### LOW — Q6: MemoryTowerClient JSON-RPC ID is Always 0 or 1
- **File:** `packages/infrastructure/memory/src/memory-tower-client.ts` (lines 176, 189)
- **Evidence:** Initialize request has `id: 0`, tool call has `id: 1`. If multiple requests are pipelined, responses can't be correlated.
- **Impact:** Not an issue currently (sequential execution) but prevents future concurrent requests.
- **Recommendation:** Use incrementing counter or UUID for request IDs.

### LOW — Q7: LangfuseMonitor Has Unbounded In-Memory Storage
- **File:** `packages/infrastructure/monitoring/src/langfuse.ts` (lines 63-66)
- **Evidence:** `traces`, `generations`, `spans`, `scores` arrays grow unbounded. Only `eventQueue` is flushed.
- **Impact:** Memory leak in long-running processes.
- **Recommendation:** Add max size limits or periodic cleanup for in-memory arrays.

---

## 4. Operations Reviewer

### HIGH — O1: No Health Check or Connection Pooling for External Services
- **File:** `packages/infrastructure/rag/src/lightrag.ts`, `packages/infrastructure/mcp/src/client.ts`
- **Evidence:** Each request creates a new HTTP connection. No connection pooling, no health check endpoint, no retry logic.
- **Impact:** High latency, no resilience to transient failures.
- **Recommendation:** Use HTTP agents with keep-alive. Implement retry with exponential backoff.

### MEDIUM — O2: Docker Sandbox Cleanup is Best-Effort Only
- **File:** `packages/infrastructure/sandbox/src/docker-sandbox.ts` (lines 138-149)
- **Evidence:** `cleanup()` has a `try/catch` that silently ignores errors. If `docker rm -f` fails, the container stays running.
- **Impact:** Resource leak — orphaned Docker containers accumulate.
- **Recommendation:** Log cleanup failures. Implement periodic sweep of sandbox containers. Use Docker labels for identification.

### MEDIUM — O3: WorkflowScheduler Uses setInterval Without Error Handling
- **File:** `packages/infrastructure/workflow/src/scheduler.ts` (lines 62-65)
- **Evidence:** The interval callback doesn't have try/catch. If the callback throws, `setInterval` stops silently.
- **Impact:** Scheduled workflows silently stop executing.
- **Recommendation:** Wrap callback in try/catch. Log errors. Consider using `node-cron` for proper cron scheduling.

### LOW — O4: No Graceful Shutdown for LangfuseMonitor
- **File:** `packages/infrastructure/monitoring/src/langfuse.ts`
- **Evidence:** `startAutoFlush()` creates an interval but there's no `process.on('SIGTERM')` handler to flush remaining events.
- **Impact:** Monitoring data lost on process termination.
- **Recommendation:** Register shutdown hooks to flush remaining events.

### LOW — O5: MetricsCollector getSummary() Uses Math.min/max on Large Arrays
- **File:** `packages/infrastructure/monitoring/src/metrics.ts` (lines 69-70)
- **Evidence:** `Math.min(...values)` spreads the entire array as arguments. With >100K entries, this hits the max call stack size.
- **Impact:** Crash when metrics array is large.
- **Recommendation:** Use iterative min/max calculation.

---

## 5. Requirements Reviewer

### MEDIUM — R1: No Rate Limiting on LLM API Calls
- **File:** `packages/infrastructure/llm/` — no rate limiting implementation
- **Evidence:** No rate limiter, no token budget, no cost tracking across any LLM client.
- **Impact:** Unbounded API costs. Rate limit errors from providers cascade as failures.
- **Recommendation:** Implement per-provider rate limiting. Add token budget enforcement.

### LOW — R2: LM Studio Client Hardcodes 'lm-studio' as API Key
- **File:** `packages/infrastructure/llm/src/lm-studio.ts` (line 28)
- **Evidence:** `apiKey: 'lm-studio'` — hardcoded dummy key.
- **Impact:** If LM Studio is exposed to the network, this "key" provides no security. Minor since LM Studio is typically local.
- **Recommendation:** Make configurable. Document that LM Studio should not be exposed to untrusted networks.

### LOW — R3: No Telemetry/Observability for Infrastructure Calls
- **File:** `packages/infrastructure/` — no tracing integration
- **Evidence:** LangfuseMonitor exists but is not wired into any infrastructure adapter. No OpenTelemetry spans.
- **Impact:** Cannot trace requests across LLM, MCP, and RAG calls.
- **Recommendation:** Inject LangfuseMonitor or OpenTelemetry tracer into infrastructure adapters.

---

## Findings Summary

| ID | Severity | Persona | Title |
|----|----------|---------|-------|
| S1 | **Critical** | Security | Command injection in Docker sandbox |
| S2 | **Critical** | Security | Command injection in Process sandbox |
| S3 | **Critical** | Security | allowedCommands never enforced |
| S4 | **Critical** | Security | Path traversal in LocalStorageProvider |
| S5 | **High** | Security | Path traversal in Process sandbox files |
| S6 | **High** | Security | MCP client has no authentication |
| S7 | **High** | Security | MemoryTower user-controlled paths to spawn |
| A1 | **High** | Architecture | In-memory state without persistence |
| A2 | **High** | Architecture | Workflow engine state in memory only |
| A3 | **High** | Architecture | Workflow scheduler is a no-op stub |
| Q1 | **High** | Quality | No input validation on LLM messages |
| O1 | **High** | Operations | No connection pooling or retry logic |
| S8 | **Medium** | Security | API keys exposed in config objects |
| A4 | **Medium** | Architecture | Eager instantiation of all LLM providers |
| A5 | **Medium** | Architecture | PgVectorClient is a no-op stub |
| A6 | **Medium** | Architecture | Inconsistent HTTP client (axios vs fetch) |
| Q2 | **Medium** | Quality | Anthropic isAvailable() costs money |
| Q3 | **Medium** | Quality | Error swallowing in isAvailable() |
| Q4 | **Medium** | Quality | Fragile regex parsing in BaseAgent |
| Q5 | **Medium** | Quality | Non-random ID generation |
| O2 | **Medium** | Operations | Docker cleanup is best-effort |
| O3 | **Medium** | Operations | Scheduler has no error handling |
| R1 | **Medium** | Requirements | No rate limiting on LLM calls |
| Q6 | **Low** | Quality | Static JSON-RPC IDs |
| Q7 | **Low** | Quality | Unbounded in-memory monitoring storage |
| O4 | **Low** | Operations | No graceful shutdown for Langfuse |
| O5 | **Low** | Operations | Math.min/max stack overflow risk |
| R2 | **Low** | Requirements | Hardcoded LM Studio API key |
| R3 | **Low** | Requirements | No tracing integration |
