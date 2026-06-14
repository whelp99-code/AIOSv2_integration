# Phase A-4: F-aios-v3-core 패키지 Publish

> **작성일**: 2026-06-14
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

### ❌ 미구현된 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **npm publish** | 패키지 배포 | 🔴 높음 |
| **버전 관리** | semver 적용 | 🔴 높음 |
| **의존성 정리** | 중복 의존성 제거 | 🟡 중간 |
| **테스트 커버리지** | 통합 테스트 부족 | 🟡 중간 |
| **문서화** | API 문서 부족 | 🟢 낮음 |

---

## 🎯 Phase A-4 목표

### 1차 목표: 핵심 패키지 npm publish

**배포 대상 패키지:**
- workflow
- knowledge-graph
- monitoring
- mcp-adapters
- sandbox
- orchestrator

### 2차 목표: 버전 관리

**semver 적용:**
- 1.0.0 버전 시작
- Breaking Change 시 major 버전 업데이트
- 기능 추가 시 minor 버전 업데이트
- 버그 수정 시 patch 버전 업데이트

### 3차 목표: 의존성 정리

**중복 의존성 제거:**
- 공통 의존성 추출
- 버전 통일
- 불필요한 의존성 제거

---

## 📋 구현 상세

### Task 4.1: 패키지 버전 관리 설정

**Objective:** 모든 패키지에 semver 적용

**Files:**
- Modify: `packages/*/package.json`

**Step 1: 버전 설정**

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

**Step 2: 커밋**

```bash
git add packages/*/package.json
git commit -m "chore(version): apply semver to all packages"
```

---

### Task 4.2: npm publish 설정

**Objective:** npm publish를 위한 설정

**Files:**
- Create: `.npmrc`
- Modify: `package.json`

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
  "workspaces": [
    "packages/*"
  ],
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

### Task 4.3: 패키지 빌드 테스트

**Objective:** 모든 패키지 빌드 테스트

**Step 1: 빌드 실행**

```bash
cd ~/Documents/Playground/F - aios-v3-core
pnpm build
```

**Step 2: 테스트 실행**

```bash
pnpm test
```

**Step 3: 커밋**

```bash
git add -A
git commit -m "test(build): verify all packages build successfully"
```

---

### Task 4.4: npm publish 실행

**Objective:** 핵심 패키지 npm publish

**Step 1: workflow 패키지 publish**

```bash
cd ~/Documents/Playground/F - aios-v3-core
npm publish --workspace=@aios/workflow
```

**Step 2: knowledge-graph 패키지 publish**

```bash
npm publish --workspace=@aios/knowledge-graph
```

**Step 3: monitoring 패키지 publish**

```bash
npm publish --workspace=@aios/monitoring
```

**Step 4: mcp-adapters 패키지 publish**

```bash
npm publish --workspace=@aios/mcp-adapters
```

**Step 5: sandbox 패키지 publish**

```bash
npm publish --workspace=@aios/sandbox
```

**Step 6: orchestrator 패키지 publish**

```bash
npm publish --workspace=@aios/orchestrator
```

**Step 7: 커밋**

```bash
git add -A
git commit -m "publish: release core packages to npm"
```

---

## 📋 검증 기준

### ✅ 완료 조건

1. **패키지 빌드 성공**
   - 모든 패키지 빌드 통과
   - TypeScript 컴파일 에러 없음

2. **테스트 통과**
   - 모든 패키지 테스트 통과
   - 커버리지 80% 이상

3. **npm publish 성공**
   - 6개 핵심 패키지 배포 완료
   - npm에서 패키지 확인 가능

4. **버전 관리**
   - semver 적용 완료
   - Breaking Change 시 major 버전 업데이트

---

## 📅 타임라인

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 4.1 | 패키지 버전 관리 설정 | 0.25일 | ⏸️ 대기 |
| 4.2 | npm publish 설정 | 0.25일 | ⏸️ 대기 |
| 4.3 | 패키지 빌드 테스트 | 0.5일 | ⏸️ 대기 |
| 4.4 | npm publish 실행 | 0.5일 | ⏸️ 대기 |

**총 예상 기간: 1.5일**

---

## ⚠️ 리스크

1. **npm 인증** - NPM_TOKEN 환경변수 필요
2. **의존성 충돌** - 버전 통일 필요
3. **빌드 에러** - TypeScript 컴파일 에러 가능

---

## 🎯 성공 기준

1. ✅ 모든 패키지 빌드 성공
2. ✅ 모든 패키지 테스트 통과
3. ✅ 6개 핵심 패키지 npm publish 완료
4. ✅ 버전 관리 적용 완료
