# Rollout Modes — Hybrid Mail Classifier

## Metadata

| Field       | Value                                              |
| ----------- | -------------------------------------------------- |
| Version     | v1                                                 |
| Date        | 2026-06-23                                         |
| Source      | docs/54-llm-classifier-model-integration-replan.md |
| Control     | `HYBRID_CLASSIFIER_MODE` environment variable       |
| Default     | `rules-only`                                       |

---

## 1. Mode Overview

| Mode          | LLM 호출 | 라우팅 기준    | 트래픽 범위       | 용도                     |
| ------------- | -------- | -------------- | ----------------- | ------------------------ |
| `rules-only`  | ❌ 없음  | rule result    | 100% rule         | 기본값, rollback 대상    |
| `shadow`      | ✅ 기록만 | rule result    | 100% rule + shadow | 품질 측정, 안전          |
| `canary`      | ✅ 혼합  | hybrid result  | 10% hybrid        | 제한적 프로덕션 검증     |
| `hybrid`      | ✅ 전체  | hybrid result  | 100% hybrid       | 프로덕션 정상 운영       |
| `kill-switch` | ❌ 강제  | rule result    | 100% rule         | 긴급 복귀                |

---

## 2. Per-Mode Detail

### 2.1 `rules-only`

**Behavior**
- 현재 `MailClassifier.classify()`만 사용
- LLM 호출 없음, 비용 없음
- 기존 85% baseline 정확도

**Routing**
- rule result로만 라우팅

**Use Cases**
- 프로덕션 기본값
- LLM 장애 시 자동 복귀 대상
- kill-switch 발동 시 전환 대상

**Transition**
- `shadow`로 전환: 수동 설정 변경 (`HYBRID_CLASSIFIER_MODE=shadow`)

---

### 2.2 `shadow`

**Behavior**
- rule result로 라우팅 (운영 영향 없음)
- LLM 분류 결과를 별도 shadow log에 기록
- rule vs LLM 비교 분석 가능

**Routing**
- rule result로만 라우팅
- LLM 결과는 `LlmCall` 테이블 + shadow log에 기록

**Metrics Collected**
- Rule-LLM agreement rate
- Accuracy delta (rule-only vs LLM-only)
- Disagreement case 목록
- LLM latency/cost per call
- Category-specific F1 score

**Gate to Canary**
- Accuracy ≥ 95% (LLM only 기준)
- Macro-F1 ≥ 0.93
- p95 latency ≤ 2초
- LLM call ratio ≤ 35%
- schema valid rate ≥ 99.5%

---

### 2.3 `canary`

**Behavior**
- 전체 트래픽 중 설정 비율(default 10%)만 hybrid 라우팅
- 나머지는 rule-only 라우팅
- canary/remaining 각각 별도 메트릭 수집

**Routing**
- `requestIndex % 100 < canaryPercentage` → hybrid result
- 나머지 → rule result

**Config**
```typescript
{
  canaryPercentage: 10,     // 0~100
  shadowLoggingEnabled: true // canary에서도 shadow 로그 유지
}
```

**Gate to Hybrid**
- Canary 구간에서 accuracy ≥ 95%
- High-risk false route ≤ 1%
- Error budget 충족 (에러율 < SLO)
- P95 latency ≤ 2초 유지

**Rollback Trigger**
- Canary 구간 에러율 > error budget
- High-risk false route > 1%
- P95 latency > 2초 5분 연속

---

### 2.4 `hybrid`

**Behavior**
- 전체 트래픽에 hybrid 분류 적용
- rule fast path + LLM fallback + decision merge

**Routing**
- hybrid result로 라우팅

**Gate (all must pass)**
- Accuracy ≥ 95%
- Macro-F1 ≥ 0.93
- High-risk false route ≤ 1%
- P95 latency ≤ 2초
- LLM call ratio ≤ 35%
- Rule fallback success ≥ 99%
- Schema valid rate ≥ 99.5%

**Auto-Rollback Trigger**
- accuracy < 95% → `rules-only`
- high-risk false route > 1% → `rules-only`
- p95 latency > 2초 5분 연속 → `rules-only`
- LLM 월 예산 80% 도달 → `canary` 축소
- PII redaction 실패 → `rules-only`
- schema migration error → 해당 Wave rollback

---

### 2.5 `kill-switch`

**Behavior**
- 즉시 `rules-only`로 강제 전환
- 모든 LLM 호출 차단
- shadow 로그도 중단

**Routing**
- rule result로만 라우팅

**Trigger**
- 수동: `HYBRID_CLASSIFIER_MODE=kill-switch` 설정
- 자동: security policy 위반 시 자동 발동

**Transition from Kill-Switch**
- 원인 분석 후 `rules-only` → `shadow` → 점진적 복귀
- 절대 `kill-switch` → `hybrid` 직접 전환 금지

---

## 3. Transition Diagram

```
                ┌──────────────┐
                │  kill-switch │ ◄── security breach, manual
                └──────┬───────┘
                       │ (원인 분석 후)
                       ▼
                ┌──────────────┐
         ┌─────►│  rules-only  │ ◄──── default, rollback target
         │      └──────┬───────┘
         │             │ (수동 전환)
         │             ▼
         │      ┌──────────────┐
         │      │    shadow    │ ◄──── 품질 측정 시작
         │      └──────┬───────┘
         │             │ (gate 통과)
         │             ▼
         │      ┌──────────────┐
         │      │    canary    │ ◄──── 제한적 프로덕션 검증
         │      └──────┬───────┘
         │             │ (gate 통과)
         │             ▼
         │      ┌──────────────┐
         └──────│    hybrid    │ ◄──── 정상 운영
                └──────────────┘
```

---

## 4. Rollback Procedures

### 4.1 즉시 Rollback (긴급)

```bash
# 1. kill-switch 발동
export HYBRID_CLASSIFIER_MODE=kill-switch

# 2. 또는 rules-only로 직접 전환
export HYBRID_CLASSIFIER_MODE=rules-only

# 3. 서비스 재시작 (또는 config hot-reload)
# config 기반이므로 재시작 불필요할 수 있음
```

### 4.2 점진적 Rollback

```
hybrid → canary (canaryPercentage 축소)
canary → shadow (LLM 기록만 유지)
shadow → rules-only (LLM 호출 완전 중단)
```

### 4.3 Rollback Runbook

| 상황                           | 조치                                      | 전환 대상    |
| ------------------------------ | ----------------------------------------- | ----------- |
| benchmark accuracy < 95%       | hybrid rollout 중단, shadow 유지          | shadow      |
| high-risk false route > 1%    | canary 중단, manual review 확대            | rules-only  |
| p95 latency > 2초 지속        | LLM threshold 상향, circuit breaker        | canary      |
| LLM 월 예산 80% 도달          | 외부 provider 축소, local-only 전환        | canary      |
| PII redaction 실패            | 외부 provider 차단                         | rules-only  |
| schema migration error 해당    | 해당 Wave rollback                         | rules-only  |
| approval bypass 발견           | automation wave 즉시 중단                  | rules-only  |

---

## 5. Environment Variable Reference

| 변수                       | 타입     | 기본값       | 설명                              |
| -------------------------- | -------- | ----------- | --------------------------------- |
| `HYBRID_CLASSIFIER_MODE`   | string   | `rules-only`| 현재 rollout mode                 |
| `CANARY_PERCENTAGE`        | number   | `10`        | canary mode 트래픽 비율 (0~100)   |
| `SHADOW_LOGGING_ENABLED`   | boolean  | `true`      | shadow 로그 활성화 여부           |
| `MAX_LLM_CALL_RATIO`       | number   | `0.35`      | LLM 호출 최대 비율               |
| `LLM_BUDGET_MONTHLY_USD`   | number   | `500`       | 월 LLM 예산 (USD)                |
| `CIRCUIT_BREAKER_THRESHOLD` | number   | `5`         | 연속 실패 횟수 → circuit open    |
| `CIRCUIT_BREAKER_RESET_SEC` | number   | `30`        | circuit open 유지 시간 (초)      |

---

## 6. Monitoring Dashboard Requirements

| 메트릭                     | 표시 형식    | 알림 기준               |
| -------------------------- | ----------- | ---------------------- |
| Accuracy (rolling 1h)      | % 게이지    | < 95% → 경고           |
| Macro-F1 (rolling 1h)      | 게이지      | < 0.93 → 경고          |
| High-risk false route      | % 게이지    | > 1% → 긴급            |
| P95 latency                | 밀리초      | > 2초 → 경고           |
| LLM call ratio             | % 게이지    | > 35% → 경고           |
| Rule fallback rate         | % 게이지    | > 1% → 경고            |
| Schema validation rate     | % 게이지    | < 99.5% → 경고         |
| Daily cost                 | USD         | > budget/30 → 경고     |
| Monthly cost               | USD         | > 80% budget → 긴급    |
| Provider failure rate      | % 게이지    | > 5% → 경고            |
| Circuit breaker status     | 상태 표시   | open → 긴급            |
