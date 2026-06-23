# Phase 8 Wave E 코드 검증 리뷰

**리뷰 일자:** 2026-06-23  
**리뷰 대상 (GJC 개발):**
- `packages/persona/src/mail/wave-e-store.ts`
- `packages/persona/src/mail/portal-engine.ts`
- `packages/persona/src/mail/__tests__/phase8-wave-e.test.ts`

**참조 스펙:** `docs/54-llm-classifier-model-integration-replan.md` Phase 8

---

## Executive Summary

Phase 8 Wave E는 **포털 레지스트리·설정 UX·커넥터 헬스·운영 백로그**를 담당하는 in-memory 스토어(`WaveEStore`)와 오케스트레이션 레이어(`PortalEngine`)로 구성된다. Wave A~D와 동일한 패턴(레코드 타입 + genId + summary/clear)을 잘 따르고 있으며, **18개 단위 테스트가 모두 통과**한다.

검증 과정에서 **타입 오류 1건**, **레이아웃 재구성 시 stale slot 잔존**, **중복 등록 시 upsert 미지원**, **config 프로필 미존재 시 예외 throw** 등 실질적 이슈를 발견하여 **직접 수정**했다. 수정 후 **22개 테스트 통과**.

| 파일 | 코드 품질 | 타입 안정성 | 에러 처리 | 테스트 |
|------|-----------|-------------|-----------|--------|
| `wave-e-store.ts` | B+ → A- | B → A- | C+ → B | B+ |
| `portal-engine.ts` | B → A- | A- | C → B+ | B+ |
| `phase8-wave-e.test.ts` | B+ | A | — | B+ → A- |

**종합 등급: B+ → A-** — MVP in-memory 구현으로서 Phase 8 요구사항을 충족하며, 이번 리뷰에서 발견된 결함은 수정 완료.

---

## 1. `wave-e-store.ts`

### 1.1 코드 품질

**강점**
- 12개 Wave E 모델 타입이 명확히 export되어 있음.
- `registerModule`, `setLayoutSlot`, `snapshotConfig`/`rollbackConfig` 등 CRUD 패턴이 Wave C/D와 일관됨.
- `searchMemory`, `getBacklogTasks`, `getOpenReviewThreads` 등 조회 API가 실용적.

**약점 (수정 전)**
- `registerModule` 재등록 시 `displayName` 미갱신.
- `registerBlock`/`registerConnector` 중복 key 허용 → health 업데이트·페이지 compose 시 첫 레코드만 매칭.
- `clear()`에서 `configSnapshots` clear 로직이 `keyof WaveEStore`와 private 필드 불일치로 **TypeScript 컴파일 오류** 발생.

### 1.2 타입 안정성

- 대부분의 레코드 인터페이스가 literal union(`ReviewStatus`, `PortalTaskStatus`, `healthStatus` 등)으로 잘 정의됨.
- **수정 전 버그:** `clear()` 258행 `key === 'configSnapshots'` — `configSnapshots`는 private이라 `keyof WaveEStore`에 포함되지 않아 TS2367 오류.

### 1.3 에러 처리

- `setConfigValue`는 프로필 미존재 시 `throw` — store 레벨에서는 적절.
- `updateConnectorHealth`, `addReviewMessage`, `rollbackConfig` 등은 null/false 반환으로 실패 전달 — 양호.
- `rollbackConfig`는 snapshot 없을 때 `false` 반환 — 테스트로 검증됨.

### 1.4 적용한 수정

| 이슈 | 수정 내용 |
|------|-----------|
| `clear()` TS 오류 + snapshot 미초기화 | 루프 후 `this.configSnapshots.clear()` 직접 호출 |
| module/block/connector 중복 등록 | key 기준 upsert (moduleKey, blockKey+moduleKey, connectorKey) |
| blockKey 조회 모호성 | `getBlockByKey()` 추가 — **최신 등록 block** 우선 반환 |
| stale layout slot | `removeLayoutSlotsNotIn(pageKey, slotKeys)` 추가 |

---

## 2. `portal-engine.ts`

### 2.1 코드 품질

**강점**
- Store에 대한 thin orchestration layer — 책임 분리가 명확.
- `readPage`, `getConnectorHealthSummary`, `getBacklog` 등 read path API가 테스트 가능한 형태.
- WaveEStore 타입을 `ReturnType<WaveEStore['method']>`로 재사용 — DRY.

**약점 (수정 전)**
- `composePage`가 slot마다 `setLayoutSlot`을 **두 번** 호출 (먼저 undefined, 이후 block id) — 불필요한 write 2배.
- `composePage` 재호출 시 이전 slot이 제거되지 않음 — **stale slot 버그**.
- `ConfigChange.reason` 필드가 **어디에도 사용되지 않음** (audit trail 미구현).
- `PortalPageConfig.title` 미사용 — 향후 메타데이터 저장 시 활용 필요.

### 2.2 타입 안정성

- public API 시그니처가 명확하고 store 타입에 의존 — 양호.
- `applyConfigChange` 반환 `{ success: boolean; previousValue: unknown }` — 호출자가 결과 분기 가능.

### 2.3 에러 처리

**수정 전:** 존재하지 않는 config profile에 `applyConfigChange` 호출 시 `setConfigValue`가 throw → `{ success: boolean }` 계약과 불일치.

**수정 후:** profile 존재 여부 선검사 → `{ success: false, previousValue: null }` 반환.

### 2.4 적용한 수정

```typescript
// composePage — 단일 setLayoutSlot + stale slot 제거
this.store.removeLayoutSlotsNotIn(config.pageKey, config.slots.map(s => s.slotKey));
for (const slot of config.slots) {
  const block = this.store.getBlockByKey(slot.blockKey);
  this.store.setLayoutSlot(config.pageKey, slot.slotKey, slot.sortOrder, block?.id);
}

// applyConfigChange — profile 미존재 graceful failure
if (!this.store.configProfiles.some(p => p.key === change.profileKey)) {
  return { success: false, previousValue: null };
}
```

---

## 3. `phase8-wave-e.test.ts`

### 3.1 커버리지 평가

**포함된 시나리오 (18 → 22 tests)**
- WaveEStore: module/block/node, layout, query, connector health, canvas, memory search, review thread, portal task backlog, config snapshot rollback
- PortalEngine: module 등록, page compose/read, config rollback, connector summary, backlog, review threads, empty slot read path, summary

**리뷰 중 추가한 테스트**
- `clear()` + config snapshot 초기화
- module/block/connector upsert
- `composePage` stale slot 제거
- `applyConfigChange` missing profile → `success: false`

### 3.2 미커버 영역 (향후 권장)

| 영역 | 설명 |
|------|------|
| `registerQuery` / `createCanvas` | store 단위 테스트만 존재, engine 경유 미검증 |
| `updatePortalTaskStatus` | engine wrapper 없음 — store 테스트로만 커버 |
| `resolveReviewThread` | engine wrapper 없음 |
| blockKey 충돌 (다른 module 동일 key) | `getBlockByKey` 최신 우선 정책 문서화 필요, 테스트 없음 |
| `genId` 모듈 전역 카운터 | `clear()` 후 ID 리셋 없음 — Wave D와 동일 패턴, 테스트 격리에 영향 가능 |

---

## 4. 테스트 실행 결과

```text
✓ packages/persona/src/mail/__tests__/phase8-wave-e.test.ts (22 tests)
  Duration ~6ms
```

루트 vitest include 패턴(`packages/**/__tests__/**`)으로 CI에서 실행 가능.  
`pnpm test`를 `packages/persona` 디렉터리에서 단독 실행하면 include 불일치로 test file not found — **모노레포 루트에서 실행 권장**.

---

## 5. 잔여 권장사항 (미수정 — 범위 외)

1. **`ConfigChange.reason` audit log** — snapshot/rollback과 연계한 변경 이력 저장.
2. **`PortalPageConfig.title` 활용** — page 메타데이터 레지스트리 또는 layout slot 확장.
3. **package export** — `src/index.ts`에 `WaveEStore`, `PortalEngine` re-export 여부 확인 (현재 mail 하위 only).
4. **Prisma 영속화** — Phase 8 스펙상 in-memory MVP이므로 추후 migration 시 store interface 추상화 검토.

---

## 6. 변경 파일 요약

| 파일 | 변경 유형 |
|------|-----------|
| `wave-e-store.ts` | bugfix — clear, upsert, getBlockByKey, removeLayoutSlotsNotIn |
| `portal-engine.ts` | bugfix — composePage, applyConfigChange |
| `phase8-wave-e.test.ts` | test 추가 — 4 cases |
| `review/phase8-wave-e-review.md` | 신규 — 본 문서 |

---

## 7. 결론

GJC가 작성한 Phase 8 Wave E 코드는 **아키텍처·테스트 골격이 견고**하며 Phase 8 MVP 목적에 부합한다. 다만 production-ready 하기 전에 발견·수정한 **stale slot**, **config profile 예외**, **clear/type 오류**, **중복 등록** 이슈는 반드시 포함되어야 한다. 현재 수정본 기준 **22/22 테스트 통과**, Wave E 핵심 플로우 검증 완료.
