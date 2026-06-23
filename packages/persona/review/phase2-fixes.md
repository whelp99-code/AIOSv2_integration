# Phase 2 P0 버그 수정 내역

**수정 일자:** 2026-06-23  
**테스트 실행 일자:** 2026-06-23  
**기준 리뷰:** `packages/persona/review/phase2-code-review.md` (P0 항목 3건)

---

## 요약

| # | 파일 | 이슈 | 수정 결과 |
|---|------|------|-----------|
| 1 | `presales.ts` | `draftResponse()`가 항상 객체를 반환해 `action`이 100% `RESPONSE_DRAFTED` | 솔루션 설계(MEDIUM/HIGH) 시에만 답변 초안 생성, action을 파이프라인 단계에 맞게 결정 |
| 2 | `sales.ts` | 도메인 매칭 `includes()` substring으로 false positive | `@` 파싱 후 도메인 **정확 일치** 비교 |
| 3 | `pm.ts` | 변경 없어도 `STATUS_UPDATED` / `SCHEDULE_UPDATED` 반환 | `updates.length === 0`이면 `NO_ACTION` 반환 |

---

## 테스트 실행 결과 (Run Everything)

### 실행 명령

```bash
pnpm test        # vitest run (전체)
pnpm typecheck   # turbo typecheck (monorepo)
```

### 전체 테스트 (`pnpm test`)

| 항목 | 결과 |
|------|------|
| Test Files | **28 passed**, 2 failed (30 total) |
| Tests | **438 passed**, 10 failed (448 total) |
| Duration | ~2.5s |
| Exit code | 1 (실패 있음) |

### Typecheck (`pnpm typecheck`)

| 항목 | 결과 |
|------|------|
| Tasks | **53 successful**, 53 total |
| Exit code | 0 (통과) |

P0 수정 파일(`presales.ts`, `sales.ts`, `pm.ts`)은 typecheck 대상 패키지에 포함되며 **타입 오류 없음**.

### Phase 2 / Persona 관련 테스트 (전부 통과 ✅)

| 테스트 파일 | Tests | 결과 | 비고 |
|-------------|-------|------|------|
| `tests/unit/phase2-personas.test.ts` | 16 | ✅ pass | Phase 2 페르소나·분류 규칙 (인라인 시뮬레이션) |
| `tests/unit/persona-e2e.test.ts` | 5 | ✅ pass | 분류 → 라우팅 → 브리핑 E2E (인라인 시뮬레이션) |
| `tests/unit/mail-classifier.test.ts` | 7 | ✅ pass | MailClassifier (인라인 시뮬레이션) |
| `tests/unit/phase3-components.test.ts` | 12 | ✅ pass | Phase 3 컴포넌트 (classifier 규칙 포함) |

> **참고:** `packages/persona/src/mail/__tests__/classifier.test.ts`는 vitest `include: tests/**` 범위 밖이라 이번 `pnpm test`에 포함되지 않음. 실구현 `SalesPersona` / `PresalesPersona` / `PMPersona` 직접 import 테스트는 아직 없음 (P1 후속).

### 실패 테스트 (10건 — Phase 2 수정과 무관)

| 파일 | Failed | 원인 요약 |
|------|--------|-----------|
| `tests/phase5-smoke.test.ts` | 8 | `customers.json` ENOENT, fetch mock/route 불일치, whelp99·sangfor smoke 기대값 drift |
| `tests/integration.test.ts` | 2 | `GET /api/approvals` — `request.url` undefined; `GET /api/integrations/health` — 503 vs 200 기대 불일치 |

Phase 2 P0 수정으로 인한 회귀(regression)는 **관측되지 않음**. 실패는 Phase 5 smoke·integration 인프라 이슈로, 별도 remediation 대상.

---

## 1. `presales.ts` — action 결정 로직

### 문제

```typescript
// 수정 전
const response = this.draftResponse(mail, review, design); // 항상 TechResponse 반환

if (response) action = 'RESPONSE_DRAFTED';       // 항상 true
else if (design) action = 'SOLUTION_DESIGNED'; // unreachable
else if (review) action = 'TECH_REVIEWED';       // unreachable
```

`draftResponse()`는 조건 없이 항상 `TechResponse` 객체를 생성하므로, `TECH_REVIEWED`·`SOLUTION_DESIGNED`·`NO_ACTION` action은 runtime에서 사용되지 않았다.

### 수정

```typescript
// 수정 후
let response: TechResponse | null = null;
if (design) {
  response = this.draftResponse(mail, review, design);
}

let action: PresalesResult['action'];
if (response) {
  action = 'RESPONSE_DRAFTED';
} else if (design) {
  action = 'SOLUTION_DESIGNED';
} else {
  action = 'TECH_REVIEWED';
}
```

### 동작 변경

| 복잡도 | design | response | action |
|--------|--------|----------|--------|
| LOW | ❌ | ❌ | `TECH_REVIEWED` |
| MEDIUM / HIGH | ✅ | ✅ | `RESPONSE_DRAFTED` |

- LOW 복잡도: 기술 검토만 수행, 답변 초안은 생성하지 않음.
- MEDIUM/HIGH: 솔루션 설계 후 답변 초안까지 생성.
- `SOLUTION_DESIGNED`는 design은 있으나 response가 없는 경우(향후 response 생성을 지연하는 플로우)를 위해 분기 유지.

---

## 2. `sales.ts` — 도메인 매칭

### 문제

```typescript
// 수정 전
mail.from.toLowerCase().includes(customer.email.split('@')[1])
```

`notcustomer.com`이 `customer.com`을 포함하므로 `@notcustomer.com` 발신자가 `@customer.com` 고객으로 오매칭되었다.

### 수정

1. `extractEmailDomain()` 헬퍼 추가 — 이메일에서 `@` 뒤 도메인을 lowercase로 추출, malformed 주소는 `null` 반환.

```typescript
private extractEmailDomain(email: string): string | null {
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return parts[1];
}
```

2. 도메인 매칭을 **정확 일치**(`===`)로 변경.

```typescript
const fromDomain = this.extractEmailDomain(mail.from);
if (fromDomain) {
  for (const [, customer] of this.customers) {
    const customerDomain = this.extractEmailDomain(customer.email);
    if (customerDomain && fromDomain === customerDomain) {
      return customer;
    }
  }
}
```

### 검증 예시

| 발신자 | 기대 결과 |
|--------|-----------|
| `kim@customer.com` | ✅ 매칭 (exact email 또는 domain) |
| `fake@notcustomer.com` | ❌ 미매칭 (이전: 오매칭) |
| `invalid-email` | ❌ 미매칭 (`extractEmailDomain` → null) |

---

## 3. `pm.ts` — NO_ACTION when no updates

### 문제

`processProjectStatusMail`과 `processScheduleMail`이 `updates` 배열이 비어 있어도 항상 `STATUS_UPDATED` / `SCHEDULE_UPDATED`를 반환했다. downstream briefing·approval 로직이 실질 변경 없이 action 갱신으로 오인할 수 있었다.

### 수정

**`processProjectStatusMail`**

```typescript
action: updates.length > 0 ? 'STATUS_UPDATED' : 'NO_ACTION',
```

**`processScheduleMail`**

```typescript
action: updates.length > 0 ? 'SCHEDULE_UPDATED' : 'NO_ACTION',
```

### 동작 변경

| 시나리오 | 수정 전 action | 수정 후 action |
|----------|----------------|----------------|
| 상태/진행률 변경 감지 | `STATUS_UPDATED` | `STATUS_UPDATED` |
| 키워드만 매칭, 변경 없음 | `STATUS_UPDATED` | `NO_ACTION` |
| 마감일 추출·갱신 | `SCHEDULE_UPDATED` | `SCHEDULE_UPDATED` |
| 일정 키워드만, 날짜 없음 | `SCHEDULE_UPDATED` | `NO_ACTION` |

`processTaskMail`은 task 생성이 항상 발생하므로 변경 없음.

---

## 변경 파일 목록

```
packages/persona/src/personas/presales.ts
packages/persona/src/personas/sales.ts
packages/persona/src/personas/pm.ts
packages/persona/review/phase2-fixes.md  (신규)
```

---

## 후속 권장 (P1, 본 수정 범위 외)

- `PresalesPersona` / `SalesPersona` / `PMPersona` **실구현 단위 테스트** 추가 (현재 `phase2-personas.test.ts`는 인라인 시뮬레이션)
- `packages/persona/src/mail/__tests__/classifier.test.ts`를 vitest include에 포함하거나 `tests/unit/`으로 이동
- `extractAmount()` 공통화 및 regex 개선 (`sales.ts`, `finance.ts`)
- `classification` 파라미터 활용 또는 API에서 제거
- `tests/phase5-smoke.test.ts`, `tests/integration.test.ts` 실패 10건 remediation (customers.json, route mock, health status 기대값)

---

## 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-06-23 | P0 버그 3건 수정 (`presales.ts`, `sales.ts`, `pm.ts`) |
| 2026-06-23 | `pnpm test` + `pnpm typecheck` 실행 결과 문서화 |

---

*Applied fixes for Phase 2 P0 items from code review. Last verified: 2026-06-23.*
