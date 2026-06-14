# Phase 7 코드 변경 추적

**기준일**: 2026-06-14  
**범위**: Phase 7 remediation 커밋(2026-06-13) + 이후 `main` 추가 변경

---

## 1. Phase 7 remediation 커밋 (푸시 완료)

| Repo | SHA | 메시지 | 파일 수 |
|------|-----|--------|---------|
| [AIOSv2](https://github.com/whelp99-code/AIOSv2_integration) | `814a8fb` | fix: Phase 7 remediation | 16 |
| [vibe-coding-os](https://github.com/whelp99-code/vibe-coding-os) | `853a183` | fix: i18n keys | 2 |
| [sangfor-mcp-workflow](https://github.com/whelp99-code/sangfor-mcp-workflow) | `9a9d7a7` | fix: LM Studio skip | 1 |
| [mail-intelligence](https://github.com/whelp99-code/mail-intelligence) | `7170bbb` | feat: verify-health | 6 |

---

## 2. AIOSv2 — `814a8fb` 코드 변경

### 2.1 런타임 / API (핵심)

| 파일 | 변경 요약 |
|------|-----------|
| `apps/web/src/lib/integrations/approval-middleware.ts` | `requestWithJsonBody()` — GET/HEAD 요청에 body 미부착 (Request 생성 오류 방지) |
| `apps/web/src/app/api/approvals/route.ts` | Prettier + domain `isApprovalActionType` 정렬 |
| `apps/web/src/app/api/collaboration/execute/route.ts` | Prettier + `normalizeApprovalActionType` 사용 |
| `packages/domain/src/models/index.ts` | approval policy export 정리 |
| `packages/infrastructure/src/collaboration/approval-file-store.ts` | domain 정규화 함수 재사용 |

### 2.2 테스트

| 파일 | 변경 요약 |
|------|-----------|
| `tests/approval-gate.test.ts` | GET dev-mode `createGatedHandler` 회귀 테스트 추가 (26/26 suite) |

### 2.3 스크립트 / 설정

| 파일 | 변경 요약 |
|------|-----------|
| `scripts/dispatch-opencode-phase7-remediation.ts` | **신규** — 4-repo remediation opencode 디스패치 |
| `scripts/dispatch-opencode-fix-directive.ts` | Prettier |
| `package.json` | `collaboration:dispatch-opencode-phase7` 스크립트 추가 |

### 2.4 문서

| 파일 | 변경 요약 |
|------|-----------|
| `docs/reports/phase7-final-report.md` | §8 감사·실측 정정 |
| `docs/evidence/cursor-opencode-main-session.md` | phase7 remediation 검증 기록 |
| `docs/reports/phase6-progress-report.md` | 검증 수치 정정 |
| `docs/reports/product-integration-blueprint-status.md` | verification 배너 갱신 |
| `docs/reports/codex-monitoring-feedback-*.md` | Prettier |
| `docs/reports/cursor-to-opencode-fix-directive.md` | Prettier |

### 2.5 커밋 제외

| 파일 | 이유 |
|------|------|
| `.aios/context/collaboration-state.json` | 런타임 세션 상태 (로컬 only) |

---

## 3. vibe-coding-os — `853a183`

| 파일 | 변경 |
|------|------|
| `messages/ko.json` | `common.backToList`, `common.loading`, `projects.subtitle`, `projects.create.*` 추가 |
| `messages/en.json` | 동일 키 en 번역 추가 |

**효과**: `pnpm build` SSG 시 `MISSING_MESSAGE` 0건

---

## 4. sangfor-mcp-workflow — `9a9d7a7`

| 파일 | 변경 |
|------|------|
| `tests/ai-workflow.test.ts` | `getCurrentModel` 테스트에 `isLmStudioReady()` 가드 — LM Studio 미준비 시 skip |

**효과**: flaky 42/44 → 안정적 44/44 (LM Studio on) 또는 skip (off)

---

## 5. mail-intelligence — `7170bbb`

| 파일 | 변경 |
|------|------|
| `scripts/verify-health.mjs` | **신규** — syntax-only / `--full` API probe |
| `package.json` | `verify:health`, `verify:health:full` 스크립트 |
| `README.md` | 기본 포트 3010, 레거시 10200 명시 |
| `server.mjs` | `demoMessages()` 인라인 제거 |
| `src/analyzer.js`, `src/app.js` | demo 의존 정리 |

**검증**: `npm run verify:health:full` → `/api/outlook/status` PASS @3010

---

## 6. `814a8fb` 이후 AIOSv2 추가 변경 (`814a8fb..HEAD`)

현재 HEAD: `0ff1dbb` (2026-06-14)

| SHA | 요약 | 주요 경로 |
|-----|------|-----------|
| `ad892ad` | analyze/plan/risk/commands Prisma 실구현 + 테스트 | `apps/web/src/app/api/{analyze,plan,risk,commands}/` |
| `ce6f246` | Track B DB 마이그레이션 | `packages/db/` |
| `5287f31` | Track B 인프라 어댑터 | `packages/infrastructure/` |
| `70b75c1` | Red Team Critical/High 보안 수정 | 다수 API routes |
| `4268ee2` | skill compliance + error sanitization | `.hermes/`, routes |
| `0ff1dbb` | GET `projectId` Zod + CommandRegistry whitelist | `apps/web/src/lib/schemas/`, `command-registry.ts` |

**통계**: 101 files, +13,761 / -684 lines (`814a8fb..0ff1dbb`)

---

## 7. Phase 7 이후 다른 repo

### vibe-coding-os (`853a183..8f0afca`)

| SHA | 요약 |
|-----|------|
| `a12758c` | API key auth + tests |
| `8f0afca` | Phase A-3: RBAC default ON, 26 routes `requireAuth()`, SSRF guard, health hardening |

### sangfor-mcp-workflow (`9a9d7a7..ce26f82`)

| SHA | 요약 |
|-----|------|
| `086a5a9` | device health check API + auth |
| `ce26f82` | Phase A-2: credentials→env, MCP auth, path traversal 방지 |

### mail-intelligence

`7170bbb` 이후 추가 커밋 없음 (HEAD 동일)

---

## 8. 빠른 diff 명령

```bash
# Phase 7 단일 커밋
git -C AIOSv2_integration show 814a8fb --stat
git -C vibe-coding-os show 853a183
git -C sangfor-mcp-workflow show 9a9d7a7
git -C apps/mail-intelligence show 7170bbb

# AIOSv2 Phase7 이후 전체
git -C AIOSv2_integration log --oneline 814a8fb..HEAD
git -C AIOSv2_integration diff --stat 814a8fb..HEAD
```

---

_마지막 갱신: Cursor audit 2026-06-14_
