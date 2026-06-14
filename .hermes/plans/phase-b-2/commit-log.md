# 커밋 로그 — Phase B-2 인프라 어댑터 실구현

**Date:** 2026-06-14
**Phase:** Track B Phase B-2 — 인프라 어댑터 실구현

---

## 📝 커밋 목록

```log
feat(infra): initialize Phase B-2 infrastructure adapters
feat(llm): add input validation and secret masking
feat(llm): replace isAvailable real API calls with health check + cache TTL
feat(llm): add error logging in isAvailable
feat(llm): implement lazy initialization in factory
feat(memory): add Redis backend option to ConversationMemory
feat(memory): switch ID generation to crypto.randomUUID
feat(memory): add path validation in MemoryTower client
feat(mcp): add API key + mTLS authentication
feat(mcp): implement keep-alive and exponential backoff retry
feat(sandbox): replace exec with execFile and disable shell (docker-sandbox)
feat(sandbox): replace execAsync with spawn(shell:false) (process-sandbox)
feat(sandbox): enforce allowedCommands allowlist before execute
feat(sandbox): validate paths within basePath and tempDir
feat(storage): add path traversal protection in LocalStorageProvider
feat(rag): implement real PgVector CRUD with DB connection
feat(rag): migrate LightRAG HTTP client from axios to fetch
feat(monitoring): add memory limits and iterative min/max in MetricsCollector
feat(monitoring): add SIGTERM graceful shutdown in LangfuseMonitor
feat(workflow): persist workflow execution state with checkpoint/resume
feat(workflow): inject WorkflowEngine into scheduler and add error handling
feat(agents): switch BaseAgent step parser to JSON mode structured output
feat(learning): improve SelfLearning persistence and validation
refactor(infrastructure): unify error handling and logging conventions
test(infrastructure): add 54 unit and 12 integration tests
test(infrastructure): verify path traversal and command injection defenses
docs(phase-b-2): add phase-plan, review reports, fix summaries
```

---

## 🏷️ 태그

- `phase-b-2-implementation` — 구현 완료 태그
- `security-hardened` — 보안 조치 완료

---

## 📊 통계

| 파일 수 | +추가 / -삭제 |
|---------|---------------|
| 21개 파일 | +1,243 / -417 |
