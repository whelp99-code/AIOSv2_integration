# Phase 2 검증 보고서 — Core Personas

**검증 일자:** 2026-06-23  
**범위:** Sales · Finance · Presales · PM 페르소나 + MailClassifier 강화 규칙  
**기준 Phase 0 문서:** `docs/43-phase0-verification.md`

---

## Phase 커밋

| 구분 | 해시 | 메시지 |
|------|------|--------|
| **Phase 2 구현** | `1d9a1d3` | feat: Phase 2 complete - Sales, Finance, Presales, PM personas |
| **P0 버그 수정** | `88ae7e6` | fix: P0 bugs - presales action logic, sales domain matching, pm NO_ACTION handling |
| 코드 리뷰 | `88ae7e6` | `packages/persona/review/phase2-code-review.md` 추가 |
| 수정 기록 | `88ae7e6` | `packages/persona/review/phase2-fixes.md` 추가 |

---

## 1. 검증 항목

| ID | 항목 | 대상 파일 | 통과 기준 |
|----|------|-----------|-----------|
| P2-01 | Sales 고객 매칭 (email/domain) | `sales.ts` | exact email + domain `===` |
| P2-02 | Sales 기회·제안서 생성 | `sales.ts` | customer → opportunity → proposal |
| P2-03 | Finance 청구서 등록 | `finance.ts` | invoice keywords → Invoice |
| P2-04 | Finance 비용·VAT | `finance.ts` | expense keywords, 10% VAT |
| P2-05 | Presales 기술 검토 | `presales.ts` | inquiryType, complexity, findings |
| P2-06 | Presales action 단계 | `presales.ts` | TECH_REVIEWED / RESPONSE_DRAFTED |
| P2-07 | PM 프로젝트 상태·진행률 | `pm.ts` | status/progress updates |
| P2-08 | PM 일정·작업 | `pm.ts` | schedule/task 분기 |
| P2-09 | PM NO_ACTION | `pm.ts` | updates 없을 때 NO_ACTION |
| P2-10 | 분류 규칙 강화 | `classifier.ts` | sales-opportunity, finance-expense 등 |
| P2-11 | Phase 2 테스트 | `phase2-personas.test.ts` | 16 cases |

---

## 2. 테스트 결과

### Phase 2 관련

| 테스트 파일 | 케이스 | 결과 | 비고 |
|-------------|--------|------|------|
| `tests/unit/phase2-personas.test.ts` | 16 | ✅ pass | 인라인 시뮬레이션 |
| `packages/persona/src/mail/__tests__/classifier.test.ts` | 9 | ✅ pass | SALES/FINANCE/PRESALES/PM 분류 |
| `tests/unit/mail-classifier.test.ts` | 7 | ✅ pass | 기본 분류 규칙 |

### Run Everything (2026-06-23)

```
pnpm test      → 31 files, 457/457 passed
pnpm typecheck → 53/53 tasks passed
```

---

## 3. 발견된 문제와 수정 내역

### 발견된 문제

| 심각도 | ID | 문제 | 파일 | 상태 |
|--------|-----|------|------|------|
| **P0** | P2-B01 | `action` 항상 `RESPONSE_DRAFTED` (dead branches) | `presales.ts` | ✅ `88ae7e6` |
| **P0** | P2-B02 | 도메인 `includes()` substring false positive | `sales.ts` | ✅ `88ae7e6` |
| **P0** | P2-B03 | 변경 없을 때 `STATUS_UPDATED`/`SCHEDULE_UPDATED` | `pm.ts` | ✅ `88ae7e6` |
| P1 | P2-B04 | `classification` 파라미터 미사용 (4 personas) | all | ⏳ 잔존 |
| P1 | P2-B05 | `extractAmount()` 중복·regex 한계 | sales, finance | ⏳ 잔존 |
| P1 | P2-B06 | `VAT_CALCULATED`, `PROJECT_CREATED` dead action | finance, pm | ⏳ 잔존 |
| P1 | P2-B07 | 실구현 클래스 import 단위 테스트 없음 | tests | ⏳ 잔존 |

### 수정 내역 (`88ae7e6`)

**presales.ts — action 결정**
```typescript
let response: TechResponse | null = null;
if (design) response = this.draftResponse(mail, review, design);

if (response) action = 'RESPONSE_DRAFTED';
else if (design) action = 'SOLUTION_DESIGNED';
else action = 'TECH_REVIEWED';
```

**sales.ts — 도메인 매칭**
- `extractEmailDomain()` 헬퍼 추가
- `fromDomain === customerDomain` 정확 일치

**pm.ts — NO_ACTION**
```typescript
action: updates.length > 0 ? 'STATUS_UPDATED' : 'NO_ACTION'
action: updates.length > 0 ? 'SCHEDULE_UPDATED' : 'NO_ACTION'
```

상세: `packages/persona/review/phase2-fixes.md`

---

## 4. 코드 통계

### Phase 2 소스 (`1d9a1d3` + `88ae7e6`)

| 파일 | LOC |
|------|-----|
| `packages/persona/src/personas/sales.ts` | 239 |
| `packages/persona/src/personas/finance.ts` | 237 |
| `packages/persona/src/personas/presales.ts` | 283 |
| `packages/persona/src/personas/pm.ts` | 348 |
| `packages/persona/src/mail/classifier.ts` (Phase 2 규칙)* | +92 (commit diff) |

| 항목 | 값 |
|------|-----|
| **페르소나 소스 파일 수** | 4 |
| **페르소나 LOC 합계** | 1,107 |
| **테스트 파일** | `tests/unit/phase2-personas.test.ts` (457 LOC, 16 cases) |
| **리뷰 문서** | `phase2-code-review.md` (408 LOC), `phase2-fixes.md` (227 LOC) |

\* classifier Phase 2 규칙은 `1d9a1d3`에서 +92 LOC

### 품질 등급 (P0 수정 후)

| 파일 | 코드 | 타입 | 에러 처리 | 테스트 |
|------|------|------|-----------|--------|
| sales | B | B+ | D | C* |
| finance | C+ | B | D | F |
| presales | B- | B+ | D | F |
| pm | B- | B+ | D | F |

\* 시뮬레이션 테스트만 존재

---

## 5. 판정

**Phase 2: 조건부 통과 ✅**

- P0 버그 3건 `88ae7e6`에서 수정 완료.
- 4 페르소나 골격·키워드 휴리스틱 동작 확인.
- 실구현 unit test·공통 유틸 추출은 P1 후속.

---

*Verified: 2026-06-23 | Implement: `1d9a1d3` | P0 fix: `88ae7e6`*
