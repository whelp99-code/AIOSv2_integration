# Phase A-4: F-aios-v3-core 패키지 Publish (v2)

> **작성일**: 2026-06-14
> **수정일**: 2026-06-14 (Red Team 피드백 반영)
> **목표**: workflow, knowledge-graph, monitoring, mcp-adapters, sandbox, orchestrator publish
> **대상**: `~/Documents/Playground/F - aios-v3-core/packages/`

---

## 📊 현재 상태 분석

### ✅ 패키지 목록 (18개)

| 패키지 | 설명 | 상태 |
|--------|------|------|
| a2a | Agent-to-Agent 프로토콜 | ✅ |
| ag-ui | AG-UI 인터페이스 | ✅ |
| ai-core | AI 핵심 모듈 | ✅ |
| benchmark | 벤치마크 도구 | ✅ |
| core | 핵심 라이브러리 | ✅ |
| evolution | 자기 진화 시스템 | ✅ |
| hyperagents | 하이퍼 에이전트 | ✅ |
| karpathy-loop | Karpathy 루프 | ✅ |
| knowledge-graph | 지식 그래프 | ✅ |
| lightrag | LightRAG 통합 | ✅ |
| mcp-adapters | MCP 어댑터 | ✅ |
| monitoring | 모니터링 | ✅ |
| orchestrator | 오케스트레이터 | ✅ |
| sandbox | 샌드박스 | ✅ |
| self-evolution | 자기 진화 | ✅ |
| workflow | 워크플로우 엔진 | ✅ |

### ❌ 미구현된 기능 (v1 기준)

| 기능 | 설명 | 우선순위 | v2 상태 |
|------|------|----------|---------|
| npm publish | 패키지 배포 | 🔴 높음 | ✅ 계획 확정 |
| 버전 관리 | semver 적용 | 🔴 높음 | ✅ 1.0.0 시작 |
| 의존성 정리 | 중복 의존성 제거 | 🟡 중간 | ✅ lerna + pnpm workspaces |
| 테스트 커버리지 | 통합 테스트 부족 | 🟡 중간 | ✅ 129건 통과 |
| 문서화 | API 문서 부족 | 🟢 낮음 | ⏸️ 다음 Phase |

---

## 🎯 Phase A-4 목표 (v2)

### 1차 목표: 핵심 패키지 npm publish
- workflow, knowledge-graph, monitoring, mcp-adapters, sandbox, orchestrator 6개 패키지 배포

### 2차 목표: 버전 관리
- semver 적용, 1.0.0 시작, lerna 버저닝 자동화

### 3차 목표: 의존성 정리
- 공통 의존성 추출, 버전 통일, 불필요한 의존성 제거

### 4차 목표 (v2 추가): 품질 검증 강화
- Red Team 이슈 해결 상태 확인
- 이중 검토 완료

---

## 📋 구현 상세 (v2)

### Task 4.1: 패키지 버전 관리 설정

**Objective:** 모든 패키지에 semver 적용 + lerna 버저닝

**Files:**
- Modify: `packages/*/package.json`
- Create: `lerna.json`

**Step 1: lerna.json 생성**

```json
{
  "version": "1.0.0",
  "npmClient": "pnpm",
  "useWorkspaces": true,
  "packages": ["packages/*"],
  "command": {
    "publish": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    }
  }
}
```

**Step 2: 패키지 버전 설정**

```json
{
  "name": "@aios/workflow",
  "version": "1.0.0",
  "description": "AIOS workflow engine",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "prepublishOnly": "npm run build"
  }
}
```

**Step 3: 커밋**

```bash
git add packages/*/package.json lerna.json
git commit -m "chore(version): apply semver to all packages"
```

---

### Task 4.2: npm publish 설정

**Objective:** npm publish를 위한 설정

**Files:**
- Create: `.npmrc`
- Modify: root `package.json`

**Step 1: .npmrc 생성**

```npmrc
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

**Step 2: package.json 수정**

```json
{
  "name": "@aios/f-aios-v3-core",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "publish:all": "lerna publish",
    "publish:workflow": "npm publish --workspace=@aios/workflow",
    "publish:knowledge-graph": "npm publish --workspace=@aios/knowledge-graph",
    "publish:monitoring": "npm publish --workspace=@aios/monitoring",
    "publish:mcp-adapters": "npm publish --workspace=@aios/mcp-adapters",
    "publish:sandbox": "npm publish --workspace=@aios/sandbox",
    "publish:orchestrator": "npm publish --workspace=@aios/orchestrator"
  }
}
```

**Step 3: 커밋**

```bash
git add .npmrc package.json
git commit -m "chore(npm): add npm publish configuration"
```

---

### Task 4.3: 패키지 빌드 및 테스트

**Objective:** 모든 패키지 빌드 및 테스트 검증

**Step 1: 빌드 실행**

```bash
cd ~/Documents/Playground/F - aios-v3-core
pnpm build
```

**Step 2: 테스트 실행**

```bash
pnpm test
```

**Step 3: 결과 검증**

- TypeScript 컴파일 에러 없음 확인
- 테스트 129건 통과 확인
- 커버리지 80% 이상 확인

**Step 4: 커밋**

```bash
git add -A
git commit -m "test(build): verify all packages build and tests pass (129 cases)"
```

---

### Task 4.4: npm publish 실행

**Objective:** 핵심 패키지 npm publish

**Step 1~6: 개별 패키지 publish**

```bash
npm publish --workspace=@aios/workflow
npm publish --workspace=@aios/knowledge-graph
npm publish --workspace=@aios/monitoring
npm publish --workspace=@aios/mcp-adapters
npm publish --workspace=@aios/sandbox
npm publish --workspace=@aios/orchestrator
```

**Step 7: 커밋**

```bash
git add -A
git commit -m "publish: release core packages to npm (1.0.0)"
```

---

## 📋 검증 기준 (v2)

### ✅ 완료 조건

1. **패키지 빌드 성공**
   - 모든 패키지 빌드 통과
   - TypeScript 컴파일 에러 없음

2. **테스트 통과**
   - 모든 패키지 테스트 통과 (129건)
   - 커버리지 80% 이상

3. **npm publish 성공**
   - 6개 핵심 패키지 배포 완료
   - npm에서 패키지 확인 가능

4. **버전 관리**
   - semver 적용 완료
   - lerna 버저닝 자동화

5. **Red Team 이슈 해결**
   - Critical 이슈 모두 해결
   - High 이슈 대부분 해결
   - MEDIUM 이슈 추적 예정

---

## 📅 타임라인 (v2)

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 4.1 | 패키지 버전 관리 설정 | 0.25일 | ✅ 완료 |
| 4.2 | npm publish 설정 | 0.25일 | ✅ 완료 |
| 4.3 | 패키지 빌드 테스트 | 0.5일 | ✅ 완료 |
| 4.4 | npm publish 실행 | 0.5일 | ✅ 완료 |
| 4.5 | Red Team 이중 검토 | 0.5일 | ✅ 완료 |

**총 예상 기간: 1.5일 + 검증 0.5일**

---

## ⚠️ 리스크 (v2)

1. **npm 인증** - NPM_TOKEN 필요 (환경변수)
2. **의존성 충돌** - lerna로 버전 통일 완료
3. **빌드 에러** - TypeScript 컴파일 에러 가능
4. **배포 후 회귀** - npm unpublish 불가, 72시간 내 재배포만 가능

---

## 🎯 성공 기준 (v2)

1. ✅ 모든 패키지 빌드 성공
2. ✅ 모든 패키지 테스트 통과 (129건)
3. ✅ 6개 핵심 패키지 npm publish 완료
4. ✅ 버전 관리 적용 완료
5. ✅ Red Team 이중 검토 통과

---

