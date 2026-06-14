# Phase Plan v2 — PHASE-B-4

> **기반**: `phase-plan-v1.md`
> **변경사유**: Step 0-1 리뷰/실제 구현 데이터 반영
> **날짜**: 2026-06-14
> **상태**: Approved

---

## 1. 목표 (업데이트)

### 1.1 UI 통합 검증
- 모든 UI 페이지 정상 렌더링 확인 (`Next.js 16`, `App Router`)
- API Routes ↔ 프론트엔드 데이터 연동 검증 (`/dashboard`, `/collaboration`, `/mail`, `/workflows`, `/kanban`, `/sangfor`, `/settings`, `/ops`)
- Portal Layout (sidebar + header) 일관성 확인
- 에러/로딩 상태 처리 표준화

### 1.2 플러그인 시스템 활성화
- `plugin-core` 단위 테스트 작성 (8 case 이상)
- `mail-plugin` 실제 서비스 연동 (stub 제거)
- 플러그인 ↔ Next.js 라우트 브릿지 구현
- 플러그인 이벤트 시스템 기본 구현 (`PluginEventBus`)

### 1.3 UI-Plugin 브릿지
- 플러그인이 UI 컴포넌트를 등록하는 메커니즘 (`registerPage`, `registerWidget`, `registerNavItem`)
- 플러그인이 API 라우트를 등록하는 메커니즘
- 플러그인 설정 UI 패널

---

## 2. 변경된 범위

| 구분 | B-4 v1 | B-4 v2 |
|------|--------|--------|
| 플러그인 테스트 | 없음 | plugin-core/mail-plugin 각 8 case 이상 |
| mail-plugin | stub | 실제 서비스 로직 연결 |
| UI 컴포넌트 테스트 | 없음 | 3 component 이상 Vitest 테스트 |
| 이벤트 시스템 | 인터페이스만 정의 | PluginEventBus 구현 |

---

## 3. 산출물 상세 스펙

### 3.1 plugin-core
- `tests/registry.test.ts`: register/unregister, dependency 검증
- `tests/loader.test.ts`: 디렉토리 스캔, 잘못된 구조 처리
- `src/event-bus.ts`: PluginEventBus (on/off/emit)
- `src/types.ts`: registerEvents 인터페이스 반영

### 3.2 mail-plugin
- `src/index.ts`: stub 제거, `/api/mail-plugin` 라우트 및 `MailPluginService` 주입

### 3.3 플러그인-UI 브릿지
- `packages/ui/src/plugin-bridge.ts`: PluginUIBridge 인터페이스
- `apps/web/src/lib/plugins/plugin-bridge.ts`: Next.js 사이드 브릿지
- layout.tsx: 사이드바 플러그인 항목 등록 지점

### 3.4 UI 표준화
- `packages/ui/src/components/loading-skeleton.tsx`
- `packages/ui/src/components/error-boundary.tsx`
- 페이지별 로딩/에러 fallback 적용

### 3.5 UI 테스트
- `apps/web/src/components/__tests__/sidebar.test.tsx`
- `apps/web/src/components/__tests__/dashboard.test.tsx`
- `apps/web/src/components/__tests__/kanban-board.test.tsx`
- Vitest + @testing-library/react 사용

---

## 4. 일정

- Step 4~7: 코드 구현
- Step 8: 테스트
- Step 9: 정리
- Step 10~11: 리뷰, 보고

---

## 5. 합의 의사결정

- 플러그인 격리 샌드박스는 B-5 이후 추후 도입
- 라우트 주입 방식은 App Router 호환 Server Component 경계 내 진행
- 이벤트 시스템은 동기 emit 우선, 비동기 지원은 추후 확장

