# 스킬 도구할당 모니터링 결과

> **모니터링 일시**: 2026-06-14 16:45 KST
> **스킬 버전**: dev-loop-process **v1.5.1**
> **대상 세션**: `20260613_103333_c5b5f4` (메인 Track A), `20260614_152949_303471` (Track B + 모니터링)
> **감사 방법**: `agent.log` / `agent.log.1` tool_executor 이벤트 분석
> **사용자 직접 확인**: 16:34 KST에 사용자가 *"초기에 지정한, cursor, codex, Gemini는 어디에 할당했니? 전부 너가하는거잖아!!!"* 라고 직접 항의

---

## Step별 실제 사용 도구

| Step | 이름 | 스킬 요구 도구 | 실제 사용 도구 | 준수 여부 |
|------|------|---------------|---------------|----------|
| 0 | Auth Gate | `terminal("bash check-tool-auth.sh")` | ✅ `terminal` (스크립트 실행) | ✅ 준수 |
| 0.5 | Config | `terminal("grep delegation config.yaml")` | ✅ `terminal` (grep 실행) | ✅ 준수 |
| 1 | Plan v1 | `write_file()` | ✅ `write_file` (6회 in c5b5f4) | ✅ 준수 |
| 2 | Red Team v1 | `delegate_task(tasks=[3+2])` | ✅ `delegate_task` (2회 in c5b5f4, 10:01-10:06) | ✅ 준수 |
| 3 | Plan v2 | `write_file()` | ✅ `write_file` | ✅ 준수 |
| **4** | **개발 실행** | **`terminal("opencode run ...")`** | ❌ **`write_file` + `patch` + `terminal`(sed/git 등)** | 🔴 **위반** |
| **5** | **검증** | **`terminal("cursor agent --print --force ...")`** | ❌ **`terminal`(vitest/pnpm 직접 실행)** | 🔴 **위반** |
| 5.5 | Pre-proc | `terminal("git diff ...")` | ✅ `terminal` | ✅ 준수 |
| **5.6** | **1차 Red Team** | **`terminal("gemini -p ...")`** | ❌ **180초 타임아웃 → 실패** | 🔴 **실패** |
| 5.7 | Evidence | `read_file()` + 파일 대조 | ✅ `read_file` (6회) | ✅ 준수 |
| **6** | **수정 루프** | **`terminal("opencode run ...")`** | ❌ **`patch` + `terminal`(Hermes 직접 수정)** | 🔴 **위반** |
| 7 | Reviewer | `write_file()` | ✅ `write_file` | ✅ 준수 |
| **8** | **최종 Red Team** | **`delegate_task(tasks=[3+2])`** | ✅ `delegate_task` (c5b5f4에서 추가 호출) | ✅ 준수 |
| **9** | **2차 Red Team** | **`terminal("codex review")` 또는 `terminal("claude -p")`** | ❌ **Codex 120초 타임아웃 → 실패** | 🔴 **실패** |
| 10 | PR 리뷰 | `terminal("gemini -p ...")` | ❌ **Gemini CLI 인증/타임아웃 문제** | 🔴 **실패** |
| 11 | PR/Push | `terminal("git add/commit/push")` | ✅ `terminal` | ✅ 준수 |

---

## 세션별 도구 사용 통계

### 세션 `20260613_103333_c5b5f4` (Track A 메인)

| 도구 | 호출 횟수 | 역할 |
|------|----------|------|
| terminal | 67 (+ 48 in agent.log) | 모든 CLI 작업 |
| write_file | 13 | 산출물 + 직접 코드 작성 |
| delegate_task | 2 | Step 2/8 Red Team 전용 ✅ |
| read_file | 6 | 파일 확인 |
| patch | 1 | 직접 코드 수정 |
| skill_manage | 25 | 스킬 편집 |
| skill_view | 13 | 스킬 참조 |

**⚠️ `opencode` 호출: 0회** — Step 4/6에서 OpenCode가 한 번도 호출되지 않음
**⚠️ `cursor agent` 호출: 0회** — Step 5에서 Cursor CLI가 한 번도 호출되지 않음
**⚠️ `gemini` 호출: 1회 (실패)** — Step 5.6에서 180초 타임아웃
**⚠️ `codex` 호출: 1회 (실패)** — Step 9에서 120초 타임아웃
**⚠️ `claude -p` 호출: 0회** — Step 9 대체 도구도 미사용

### 세션 `20260614_152949_303471` (Track B + 모니터링)

| 도구 | 호출 횟수 | 역할 |
|------|----------|------|
| terminal | 26 | CLI 작업 |
| delegate_task | **6** | ⚠️ **구현 작업에도 사용** |
| execute_code | 11 | 코드 실행 |
| search_files | 13 | 파일 검색 |
| patch | 3 | 직접 코드 수정 |
| write_file | 1 | 산출물 |

**⚠️ `delegate_task`가 6회** — Step 2/8(Red Team 전용) 외에도 구현 작업에 사용됨

---

## 불일치 항목 (상세)

### 🔴 Critical — 핵심 도구 미사용 (3건)

#### 1. Step 4/6: OpenCode → Hermes 직접 구현으로 대체

| 항목 | 내용 |
|------|------|
| **스킬 요구** | `terminal("opencode run '작업' --workspace DIR")` |
| **실제 실행** | Hermes가 `write_file()`, `patch()`, `terminal(sed/git)` 직접 호출 |
| **발생 횟수** | 모든 Phase (Track A + Track B 전체) |
| **영향** | 코드 품질, 컨텍스트 크기, 모델 역량 차이 |
| **원인 추정** | opencode CLI 인증 미설정 또는 미설치 |

#### 2. Step 5: Cursor CLI → Hermes 직접 테스트로 대체

| 항목 | 내용 |
|------|------|
| **스킬 요구** | `terminal("cursor agent --print --force --workspace DIR 'test'")` |
| **실제 실행** | `terminal("npx vitest run")`, `terminal("pnpm typecheck")` 직접 실행 |
| **발생 횟수** | 모든 검증 단계 |
| **영향** | Cursor의 에이전트 분석 능력 미활용 |
| **원인 추정** | Cursor CLI 인증 미설정 또는 PATH 미설정 |

#### 3. Step 9: Codex/Claude Code → 타임아웃/미실행

| 항목 | 내용 |
|------|------|
| **스킬 요구** | `terminal("codex review --base HEAD~5")` 또는 `terminal("claude -p '...'")` |
| **실제 실행** | Codex: 120초 타임아웃 (1회 시도), Claude: 미시도 |
| **영향** | 2차 Red Team 분석 누락 → Track B에서 산출물 없음 |
| **원인 추정** | Codex 인증/네트릭워크 문제, Claude Code 미설치 |

### 🟡 High — delegate_task 남용 (1건)

#### 4. delegate_task Step 2/8 외 사용

| 항목 | 내용 |
|------|------|
| **스킬 규칙** | `delegate_task()`는 Step 2/8(Red Team 페르소나)에서만 허용 |
| **실제 실행** | Session 303471에서 6회 호출 — 구현/분석 작업에도 사용 |
| **스킬 명시 위반** | "스킬에 정의된 도구를 delegate_task()로 대체하지 마라" |
| **사용자 확인** | 16:34에 사용자가 직접 "전부 너가하는거잖아!!!" 항의 |

### 🟡 Medium — CLI 도구 인증 실패 (2건)

#### 5. Gemini CLI 타임아웃

| 항목 | 내용 |
|------|------|
| **시도** | 1회 (Step 5.6 Phase A-1) |
| **결과** | 180초 타임아웃 (exit_code: 124) |
| **Graceful Degradation** | 산출물에 "Gemini CLI unavailable" 명시 여부 미확인 |

#### 6. Codex CLI 타임아웃

| 항목 | 내용 |
|------|------|
| **시도** | 1회 (Step 9) |
| **결과** | 120초 타임아웃 (exit_code: 124) |
| **Graceful Degradation** | 스킬 허용 대체(delegate_task)로 전환되었으나 산출물 명시 여부 미확인 |

---

## Graceful Degradation 준수 여부

| 도구 | 미인증 시 대체 | 스킬 요구 산출물 명시 | 실제 명시 여부 |
|------|---------------|---------------------|---------------|
| OpenCode | `delegate_task()` 서브에이전트 | "OpenCode unavailable — used delegate_task" | ❌ **미명시** — Hermes가 직접 구현 |
| Cursor CLI | `terminal(vitest + typecheck)` 직접 | "Cursor CLI unavailable — used terminal" | ❌ **미명시** |
| Gemini CLI | Hermes 자체 분석 | "Gemini CLI unavailable — Hermes analysis" | ❌ **미명시** |
| Codex | `delegate_task()` 서브에이전트 | "Codex unavailable — used delegate_task" | ❌ **미명시** |

**⚠️ Graceful Degradation을 사용하면서 산출물에 대체 사실을 명시하지 않은 것은 v1.5.1 규칙 위반.**

---

## 개선 권고

### 🔴 즉시 조치 필요 (Critical)

#### 1. CLI 도구 인증 상태 점검 및 설정
```bash
# 모든 CLI 도구 인증 확인
bash ~/.hermes/skills/software-development/dev-loop-process/scripts/check-tool-auth.sh

# OpenCode 인증
opencode auth status

# Cursor CLI 인증
/Applications/Cursor.app/Contents/Resources/app/bin/cursor agent login

# PATH 설정
echo 'export PATH="/Applications/Cursor.app/Contents/Resources/app/bin:$PATH"' >> ~/.zshrc
```

#### 2. delegate_task Step 2/8 전용 강제화
- 스킬에 **런타임 검증 로직** 추가 권장
- delegate_task 호출 시 현재 Step 컨텍스트 확인 → Step 2/8 외 차단
- 또는 시스템 프롬프트에 "Step 4/6은 반드시 opencode run을 terminal()로 호출" 명시 강화

#### 3. Graceful Degradation 산출물 명시 의무화
- 대체 사용 시 `implementation-summary.md` 또는 `test-result-report.md` 머리글에 반드시 다음 형식으로 기록:
  ```
  > ⚠️ **도구 대체 알림**: [도구명] 사용 불가 → [대체방법]으로 실행됨
  > 원인: [인증 실패/타임아웃/미설치]
  > 일시: [타임스탬프]
  ```

### 🟡 개선 권장 (Medium)

#### 4. CLI 도구 헬스체크 자동화
- Step 0(Auth Gate)에서 각 도구의 실제 호출 가능성 테스트
- `opencode --version`, `cursor agent --version`, `codex --version`, `claude --version`
- 버전 응답 없으면 해당 Step의 Graceful Degradation 경로 자동 활성화

#### 5. delegate_task 남용 실시간 감지
- 모니터링 스크립트가 agent.log를 tail하면서 `delegate_task completed` 발생 시
  - 직전 컨텍스트가 Step 2/8인지 확인
  - 아니면 Telegram 알림 발송

#### 6. 세션 모델 점검
- delegation.model이 `mimo-v2.5-pro` (현재) → `anthropic/claude-sonnet-4` (권장) 변경 고려
- Red Team 서브에이전트 품질 향상

### 🟢 사항 (Low)

#### 7. 모니터링 리포트 자동 생성
- 각 dev-loop 세션 종료 시 자동으로 이 형식의 감사 리포트 생성
- `skill-tool-audit.md`를 Phase별로 분리 생성

---

## 전체 준수 점수

| 카테고리 | 준수율 | 설명 |
|---------|--------|------|
| Step 0~0.5 (준비) | **100%** | Auth Gate, Config 검증 정상 실행 |
| Step 1~3 (계획/리뷰) | **100%** | write_file, delegate_task 정상 사용 |
| **Step 4 (구현)** | **0%** | OpenCode 미사용 — Hermes 직접 구현 |
| **Step 5 (검증)** | **10%** | Cursor CLI 미사용 — terminal 직접 실행 (Graceful Degradation이나 명시 없음) |
| Step 5.5~5.7 | **80%** | git diff/read_file 정상, Gemini만 실패 |
| **Step 6 (수정)** | **0%** | OpenCode 미사용 — Hermes patch 직접 수정 |
| Step 7~8 | **100%** | write_file, delegate_task 정상 |
| **Step 9 (2차 RT)** | **0%** | Codex 타임아웃, Claude 미시도 |
| **Step 10 (PR 리뷰)** | **0%** | Gemini CLI 미작동 |
| Step 11 (PR/Push) | **100%** | git 명령 정상 |
| **종합** | **🔴 약 39%** | 구현/검증/리뷰 핵심 3개 도구 그룹 모두 미준수 |

---

## 결론

**v1.5.1 스킬의 도구할당 규칙은 전반적으로 미준수되고 있다.**

가장 심각한 문제는 스킬이 정의한 **4개 핵심 CLI 도구(OpenCode, Cursor CLI, Gemini CLI, Codex/Claude)가 실전에서 전혀 사용되지 않았다는 것**이다. Hermes가 `write_file`, `patch`, `terminal`로 모든 것을 직접 처리했으며, 사용자가 16:34에 이를 직접 확인하고 항의했다.

**근본 원인**: CLI 도구 인증/설치 미완료 + Graceful Degradation 산출물 명시 미준수

**즉시 실행해야 할 조치**:
1. `check-tool-auth.sh` 실행하여 각 도구 인증 상태 확인
2. 인증 가능한 도구부터 즉시 인증 (Cursor CLI 우선)
3. 인증 불가 도구는 Graceful Degradation 경로를 명확히 하고 산출물에 반드시 명시
4. delegate_task 남용 차단을 위한 런타임 검증 로직 추가
