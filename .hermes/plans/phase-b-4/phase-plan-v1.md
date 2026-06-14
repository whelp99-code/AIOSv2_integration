# Track B Phase B-4: UI 통합 검증 + 플러그인 시스템

> **작성일**: 2026-06-14
> **목표**: UI 통합 검증, 플러그인 시스템 활성화, 브릿지 레이어 구현
> **대상**: apps/web/, plugins/, packages/ui/

---

## 📊 현재 상태 분석

### 1. apps/web/ — UI 통합 상태

| 항목 | 상태 | 설명 |
|------|------|------|
| **프레임워크** | ✅ 구현 | Next.js 16, React 19, App Router |
| **Portal Layout** | ✅ 구현 | Sidebar + Header 레이아웃 (SessionProvider 포함) |
| **라우트 페이지** | ✅ 구현 | 9개 페이지: `/`, `/dashboard`, `/mail`, `/workflows`, `/kanban`, `/sangfor`, `/settings`, `/collaboration`, `/ops`, `/auth/signin` |
| **API Routes** | ✅ 구현 | 30+ API 엔드포인트 (approvals, collaboration, workflows, sangfor, mail, knowledge, github, tasks 등) |
| **컴포넌트** | ✅ 구현 | 19개 TSX 컴포넌트 (dashboard, kanban-board, sidebar, header, ops-console 등) |
| **인증** | ✅ 구현 | NextAuth 5 beta + GitHub OAuth + Prisma Adapter |
| **빌드** | ✅ 성공 | .next 빌드 아티팩트 존재 (turbopack) |
| **테스트** | ❌ 없음 | UI 컴포넌트에 대한 단위/통합 테스트 없음 |

#### UI 라우트 상세

| 라우트 | 컴포넌트 | 데이터 연동 | 상태 |
|--------|----------|-------------|------|
| `/` (Home) | Link 기반 네비게이션 | 없음 | ✅ |
| `/dashboard` | Dashboard 컴포넌트 | API 연동 | ✅ |
| `/collaboration` | CollaborationPage | /api/collaboration/*, /api/approvals | ✅ |
| `/mail` | MailPage | /api/mail-* | ✅ |
| `/workflows` | WorkflowsPage | /api/workflows | ✅ (CRUD 포함) |
| `/kanban` | KanbanBoard (dynamic import) | /api/tasks | ✅ |
| `/sangfor` | SangforPage | /api/sangfor/* (mock 데이터 포함) | ✅ |
| `/settings` | SettingsPage | 설정 관리 | ✅ |
| `/ops` | OpsConsole | /api/ops/health/* | ✅ |
| `/auth/signin` | SignIn | NextAuth | ✅ |

#### 미구현/부족 항목

1. **UI 컴포넌트 테스트** — Playwright/E2E 테스트 없음
2. **반응형 디자인** — 모바일 대응 미확인
3. **에러 바운더리** — 글로벌 에러 페이지 존재하지만 커스텀 에러 UI 부족
4. **로딩 상태** — 스켈레톤/스피너 컴포넌트 미구현
5. **접근성 (a11y)** — ARIA 속성, 키보드 네비게이션 미검증
6. **SEO** — 메타데이터 설정 부족
7. **다크모드** — 미구현

---

### 2. plugins/ — 플러그인 시스템 상태

| 항목 | 상태 | 설명 |
|------|------|------|
| **plugin-core** | ✅ 구현 | AIOSPlugin 인터페이스, PluginRegistry, PluginLoader |
| **mail-plugin** | ✅ stub | 예제 플러그인 (실제 서비스 로직은 주석 처리) |
| **의존성 검증** | ✅ 구현 | 등록 시 dependency 검증, 해제 시 역의존성 검증 |
| **활성화 관리** | ✅ 구현 | onActivate/onDeactivate 생명주기, 역순 해제 |
| **동적 로딩** | ✅ 구현 | 파일시스템 기반 플러그인 디렉토리 스캔 |
| **Web 연동** | ❌ 미구현 | 플러그인 → Next.js 라우트/UI 주입 미구현 |
| **이벤트 시스템** | ❌ 미구현 | registerEvents() 인터페이스만 정의, 구현 없음 |
| **샌드박스** | ❌ 미구현 | 플러그인 격리 환경 없음 |
| **설정 관리** | ❼ 구현 | 플러그인 설정 UI/config 파일 없음 |
| **테스트** | ❌ 없음 | plugin-core/mail-plugin 테스트 없음 |

#### 플러그인 코어 아키텍처

```
plugin-core/
├── src/
│   ├── types.ts      # AIOSPlugin, PluginManifest, PluginRegistry 인터페이스
│   ├── registry.ts   # PluginRegistryImpl (싱글턴, 의존성 검증)
│   ├── loader.ts     # PluginLoader (동적 import, 자동 등록)
│   └── index.ts      # 내보내기
└── dist/             # 빌드 결과

mail-plugin/
├── src/
│   └── index.ts      # mailPlugin 예제 (stub)
└── dist/             # 빌드 결과
```

---

## 🎯 Phase B-4 목표

### 1차 목표: UI 통합 검증
- 모든 UI 페이지 정상 렌더링 확인
- API Routes ↔ 프론트엔드 데이터 연동 검증
- Portal Layout (sidebar + header) 일관성 확인
- 에러/로딩 상태 처리 검증

### 2차 목표: 플러그인 시스템 활성화
- plugin-core 단위 테스트 작성
- mail-plugin 실제 서비스 연동 (stub → 실제)
- 플러그인 ↔ Next.js 라우트 브릿지 구현
- 플러그인 이벤트 시스템 기본 구현

### 3차 목표: UI-Plugin 브릿지
- 플러그인이 UI 컴포넌트를 등록하는 메커니즘
- 플러그인이 API 라우트를 등록하는 메커니즘
- 플러그인 설정 UI

---

## 📋 구현 상세

### Task 4.1: plugin-core 단위 테스트

**Objective:** 플러그인 코어 시스템 검증

**Files:**
- Create: `plugins/plugin-core/tests/registry.test.ts`
- Create: `plugins/plugin-core/tests/loader.test.ts`

**Test Cases:**
1. PluginRegistry — register/unregister 동작
2. PluginRegistry — 중복 등록 방지
3. PluginRegistry — 의존성 검증 (미등록 의존성 → 에러)
4. PluginRegistry — 역의존성 검증 (의존 플러그인 있으면 unregister 불가)
5. PluginRegistry — 활성화 실패 시 롤백
6. PluginRegistry — deactivateAll (역순 해제)
7. PluginLoader — 디렉토리 스캔 및 로딩
8. PluginLoader — 잘못된 플러그인 구조 처리

**Status:** ⏸️ 대기

---

### Task 4.2: mail-plugin 서비스 연동

**Objective:** mail-plugin stub → 실제 서비스 연결

**Files:**
- Modify: `plugins/mail-plugin/src/index.ts`
- Modify: `plugins/mail-plugin/package.json`

**Current State:**
```typescript
// 현재: 주석 처리된 stub
registerRoutes(router: any) {
  // router.get('/api/mail', getMails);
  console.log('[MailPlugin] Routes registered');
}
```

**Target State:**
```typescript
// 목표: 실제 서비스 등록
registerRoutes(router: NextRouter) {
  // apps/web/src/app/api/mail-*/route.ts와 연동
  router.register('/api/mail-plugin', mailPluginRoute);
}

registerServices(container: ServiceContainer) {
  container.register('mailPluginService', new MailPluginService());
}
```

**Status:** ⏸️ 대기

---

### Task 4.3: 플러그인-UI 브릿지 레이어

**Objective:** 플러그인이 UI 컴포넌트와 라우트를 동적으로 주입

**Files:**
- Create: `packages/ui/src/plugin-bridge.ts`
- Create: `apps/web/src/lib/plugins/plugin-bridge.ts`
- Modify: `apps/web/src/app/(portal)/layout.tsx`

**Design:**
```typescript
// packages/ui/src/plugin-bridge.ts
export interface PluginUIBridge {
  registerPage(path: string, component: React.ComponentType): void;
  registerWidget(slot: string, component: React.ComponentType): void;
  registerNavItem(item: NavItem): void;
  getRegisteredPages(): Map<string, React.ComponentType>;
  getRegisteredWidgets(slot: string): React.ComponentType[];
  getRegisteredNavItems(): NavItem[];
}

// apps/web/src/app/(portal)/layout.tsx 수정
// Sidebar에서 플러그인 네비게이션 항목 표시
```

**Status:** ⏸️ 대기

---

### Task 4.4: 플러그인 이벤트 시스템

**Objective:** 플러그인 간 이벤트 통신 구현

**Files:**
- Create: `plugins/plugin-core/src/event-bus.ts`
- Modify: `plugins/plugin-core/src/index.ts`
- Modify: `plugins/plugin-core/src/types.ts`

**Design:**
```typescript
// plugins/plugin-core/src/event-bus.ts
export class PluginEventBus {
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  on(event: string, listener: (data: unknown) => void): void;
  off(event: string, listener: (data: unknown) => void): void;
  emit(event: string, data: unknown): void;
}

// types.ts의 registerEvents() 구현
registerEvents(emitter: PluginEventBus): void;
```

**Status:** ⏸️ 대기

---

### Task 4.5: UI 에러/로딩 상태 표준화

**Objective:** 일관된 에러/로딩 UI 패턴

**Files:**
- Create: `packages/ui/src/components/loading-skeleton.tsx`
- Create: `packages/ui/src/components/error-boundary.tsx`
- Create: `packages/ui/src/components/error-fallback.tsx`
- Modify: 각 페이지 (로딩/에러 상태 추가)

**Status:** ⏸️ 대기

---

### Task 4.6: UI 컴포넌트 테스트

**Objective:** 핵심 UI 컴포넌트 검증

**Files:**
- Create: `apps/web/src/components/__tests__/sidebar.test.tsx`
- Create: `apps/web/src/components/__tests__/dashboard.test.tsx`
- Create: `apps/web/src/components/__tests__/kanban-board.test.tsx`

**Tool:** Vitest + @testing-library/react

**Status:** ⏸️ 대기

---

## 📋 검증 기준

### ✅ 완료 조건

1. **plugin-core 테스트**
   - 8개 이상 테스트 케이스 통과
   - 커버리지 80% 이상

2. **mail-plugin 연동**
   - 실제 서비스 stub 제거
   - API 연동 확인

3. **플러그인-UI 브릿지**
   - 플러그인이 네비게이션에 항목 추가 가능
   - 플러그인이 페이지 라우트 등록 가능

4. **이벤트 시스템**
   - on/off/emit 동작 확인
   - 플러그인 간 이벤트 전달 검증

5. **UI 테스트**
   - 핵심 컴포넌트 렌더링 테스트 통과
   - pnpm test 전체 통과

---

## 📅 타임라인

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 4.1 | plugin-core 단위 테스트 | 0.5일 | ⏸️ 대기 |
| 4.2 | mail-plugin 서비스 연동 | 0.5일 | ⏸️ 대기 |
| 4.3 | 플러그인-UI 브릿지 레이어 | 1일 | ⏸️ 대기 |
| 4.4 | 플러그인 이벤트 시스템 | 0.5일 | ⏸️ 대기 |
| 4.5 | UI 에러/로딩 상태 표준화 | 0.5일 | ⏸️ 대기 |
| 4.6 | UI 컴포넌트 테스트 | 0.5일 | ⏸️ 대기 |

**총 예상 기간: 3.5일**

---

## ⚠️ 리스크

1. **Next.js 16 호환성** — 플러그인 동적 라우트 주입과 App Router 충돌 가능
2. **번들 크기** — 플러그인 동적 import 시 번들 분리 전략 필요
3. **TypeScript 타입 안전성** — 플러그인 간 타입 공유 체계 필요
4. **보안** — 플러그인이 라우트/UI를 직접 등록할 때 권한 검증 필수
5. **React 19 호환성** — @testing-library/react 버전 호환 확인 필요

---

## 🎯 성공 기준

1. ✅ plugin-core 테스트 8개 이상 통과
2. ✅ mail-plugin 실제 서비스 연동
3. ✅ 플러그인-UI 브릿지 기본 동작
4. ✅ 이벤트 시스템 on/off/emit 동작
5. ✅ UI 컴포넌트 테스트 3개 이상 통과
6. ✅ `pnpm test` 전체 통과
7. ✅ `pnpm typecheck` 전체 통과
