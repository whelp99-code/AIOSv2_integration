# Phase A-2 Plan v1 요구사항 검토 보고서

> **검토일**: 2026-06-14
> **검토 대상**: `.hermes/plans/phase-a-2/phase-plan-v1.md`
> **검토 기준**: 요구사항 누락, 제외 범위 침범, 비즈니스 로직 검증, 사용자 요구사항 충족, 기술적 제약 검토

---

## 🔴 발견된 요구사항 이슈 목록

### 이슈 1: 기존 `packages/health-checker` 패키지 미참조 (중복 구현 위험)

**심각도**: 🔴 높음

`sangfor-mcp-workflow` 프로젝트에는 이미 `packages/health-checker/src/health-checker.ts`가 존재하며, `runHealthCheck()` 함수와 스냅샷 저장/로드 기능을 제공한다. 그러나 Phase A-2 플랜은 이 패키지를 전혀 언급하지 않고, `server.ts`에 직접 하드코딩된 모킹 데이터를 추가하는 방식으로 Health Check API를 구현하고 있다.

**문제점**:
- `health-checker` 패키지의 `HealthCheckConfig`, `HealthCheckResult`, `HealthCheckItemResult`, `HealthAlert` 타입이 이미 정의되어 있음
- 플랜의 모킹 데이터 구조(`{ id, name, ip, status, cpu, memory, disk }`)는 기존 패키지의 타입 구조(`HealthCheckResult`)와 불일치
- 향후 실제 장비 연동 시 두 구현이 충돌할 위험

**권장 조치**: `packages/health-checker`의 타입과 인터페이스를 Health Check API의 응답 스키마로 사용하도록 플랜 수정.

---

### 이슈 2: OpenAPI 스펙에 기존 25+개 API 미포함

**심각도**: 🔴 높음

Task 2.2의 OpenAPI 스펙 예시에는 Health Check 3개 엔드포인트만 정의되어 있다. "모든 API 엔드포인트 문서화"라는 목표와 상충.

**문제점**:
- 이미 구현된 25+개 API의 스키마 정의가 없음
- 0.5일에 모든 API를 문서화하는 것은 비현실적 (Health Check만 해도 3개 엔드포인트에 대한 스키마가 꽤 복잡)
- 타임라인이 부적절할 수 있음

**권장 조치**: Phase A-2에서는 Health Check + 핵심 Workflow API만 문서화하고, 나머지는 Phase A-3로 이관하는 것을 명시.

---

### 이슈 3: 인증 미들웨어 적용 범위 불완전

**심각도**: 🟡 중간

Task 2.3의 미들웨어 적용 예시에서 `/api/health`, `/api/workflows`, `/api/compliance`만 보호 대상으로 지정. 나머지 API 라우트(`/api/templates`, `/api/manual`, `/api/device`, `/api/guide`, `/api/vendors`, `/api/learning`, `/api/access`, `/api/events`, `/api/system/health`)는 인증 없이 노출됨.

**문제점**:
- 인증 적용 범위가 명확하지 않음 (일부만 적용? 전체 적용?)
- `/api/system/health`는 인증 없이 접근 가능해야 하는 엔드포인트이나 명시되지 않음
- `/api/events`(SSE)는 인증 헤더 처리가 일반 HTTP와 다를 수 있으나 고려 없음

**권장 조치**: 인증 적용/제외 대상 라우트를 명시적으로 나열하는 목록 추가.

---

### 이슈 4: `POST /api/health/check`의 입력 검증 부재

**심각도**: 🟡 중간

`deviceIds`가 undefined이거나 배열이 아닌 경우 `deviceIds.map()`에서 런타임 에러 발생.

**문제점**:
- `req.body.deviceIds` 타입/존재 여부 검증 없음
- 빈 배열 `[]` 처리 미정의
- 존재하지 않는 deviceId가 포함된 경우의 응답 미정의

**권장 조치**: 입력 검증 로직 추가 (Zod 또는 간단한 null check).

---

### 이슈 5: `POST /api/health/check`의 `deviceIds` 미존재 시 500 에러

**심각도**: 🟡 중간

```typescript
const { deviceIds } = req.body;
const results = deviceIds.map(...);  // TypeError if deviceIds is undefined
```

**권장 조치**: 400 에러로 명확한 에러 메시지 반환.

---

### 이슈 6: API 키 하드코딩 폴백 보안 위험

**심각도**: 🟡 중간

```typescript
const API_KEY = process.env.SANGFOR_API_KEY || 'default-api-key';
```

환경변수 미설정 시 `default-api-key`로 동작. 프로덕션 환경에서 보안 취약점.

**권장 조치**: 환경변수 미설정 시 서버 시작 실패 또는 경고 로그 출력으로 변경.

---

### 이슈 7: `swagger-ui-express` 및 `yamljs` 의존성 추가 미언급

**심각도**: 🟢 낮음

Task 2.2에서 `swagger-ui-express`와 `yamljs` 패키지를 import하지만, 설치 단계(`pnpm add`)가 플랜에 포함되어 있지 않음.

**권장 조치**: `pnpm add swagger-ui-express yamljs && pnpm add -D @types/swagger-ui-express` 명령 추가.

---

## 🟡 누락된 요구사항

### 누락 1: 에러 핸들링 표준화

플랜의 "미구현된 기능" 표에 "에러 핸들링 표준화"가 🟡 중간 우선순위로 있으나, Phase A-2 작업 범위에 포함되지 않음. 현재 server.ts의 에러 응답이 불일관:
- 일부: `{ error: 'Not found' }` (문자열)
- 일부: `{ error: String(error) }` (변환된 문자열)
- 일부: `{ error: 'Device not found' }` (다른 형식)

Phase A-2에서 인증 에러(401)를 추가하면서 에러 형식 표준화를 병행하지 않으면 기술 부채가 누적됨.

**권장**: 최소한 Phase A-2에서 추가되는 모든 에러 응답의 형식을 `{ error: { code: string, message: string } }`으로 통일.

### 누락 2: CORS 정책 검토

현재 `app.use(cors())`로 모든 origin 허용. 인증(API 키)을 도입하면서 CORS 정책도 함께 검토해야 하나 플랜에 없음.

**권장**: 리스크 섹션에 CORS 정책 검토 항목 추가.

### 누락 3: 기존 `/api/system/health` 엔드포인트와의 관계

`server.ts:538`에 이미 `GET /api/system/health` 엔드포인트가 존재. 플랜의 Health Check API(`/api/health/*`)와 명칭이 혼동될 수 있으나 이에 대한 설명이 없음.

**권장**: `/api/system/health`(서버 자체 상태)과 `/api/health/devices`(장비 상태)의 차이를 문서에 명시.

### 누락 4: `packages/health-checker`의 `HealthCheckConfig` 타입 활용

기존 패키지에 정의된 타입(`HealthCheckConfig`, `HealthCheckResult`, `HealthAlert` 등)을 Health Check API의 응답 스키마로 사용하는 방안이 플랜에 없음. 코드 중복과 타입 불일치를 초래할 수 있음.

### 누락 5: SSE(`/api/events`) 인증 처리

SSE 엔드포인트는 HTTP 헤더 기반 인증이 어려울 수 있음 (EventSource API는 커스텀 헤더 미지원). 인증 적용 대상에 포함할 것인지, 포함한다면 어떻게 처리할 것인지 미정의.

---

## 🟢 권장 추가사항

### 권장 1: Health Check API에 `packages/health-checker` 연동 가이드 추가

현재 `health-checker` 패키지의 `runHealthCheck()`는 목업 데이터를 반환한다. Phase A-2의 Health Check API도 모킹 데이터를 반환한다. 두 구현이 분리되어 발전하면 향후 통합이 어려워짐.

**제안**: Health Check API가 `packages/health-checker`의 `runHealthCheck()`를 호출하도록 설계 변경. 모킹 데이터는 `health-checker` 내부에서 반환하도록 일원화.

### 권장 2: OpenAPI 스펙에 공통 에러 응답 스키마 추가

```yaml
components:
  schemas:
    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
```

### 권장 3: 인증 미들웨어에 헬스체크 예외 처리 추가

`/api/system/health`와 `/api-docs`는 인증 없이 접근 가능해야 모니터링 도구와 문서 접근이 가능.

```typescript
// 인증 제외 라우트
app.use('/api/system/health', (req, res, next) => next());
app.use('/api-docs', (req, res, next) => next());
// 인증 적용
app.use('/api', apiKeyAuth);
```

### 권장 4: `POST /api/health/check`의 비동기 처리 고려

현재 설계는 동기 응답(`Math.random()` 기반 응답시간). 실제 장비 연동 시 다수 장비의 상태 확인은 시간이 오래 걸릴 수 있으므로 비동기 패턴(즉시 jobId 반환 + 결과 polling/SSE)을 고려해야 함.

### 권장 5: 타임라인 현실성 검토

- Task 2.1 (Health Check API): 0.5일 — 적절
- Task 2.2 (OpenAPI 전체 문서화): 0.5일 — 25+개 API 문서화에는 부족할 수 있음. Health Check만 문서화한다면 적절
- Task 2.3 (인증/인가): 0.5일 — 적절

**총 1.5일은 Health Check + 제한적 OpenAPI + 기본 인증 기준으로 적절.**

---

## 📊 검토 요약

| 검토 기준 | 판정 | 상세 |
|-----------|------|------|
| 요구사항 누락 | 🟡 부분 누락 | 기존 health-checker 패키지 미참조, 에러 형식 표준화 누락 |
| 제외 범위 침범 | ✅ 없음 | Phase A-2 범위를 벗어나는 작업 없음 |
| 비즈니스 로직 검증 | 🟡 이슈 있음 | Health Check 데이터 구조가 기존 타입과 불일치 |
| 사용자 요구사항 충족 | ✅ 충족 | Health Check, API 문서화, 인증 3가지 목표 설정 |
| 기술적 제약 검토 | 🟡 이슈 있음 | 입력 검증 부재, 보안 폴백, 의존성 추가 미언급 |

**전체 평가**: 플랜의 방향성과 목표는 적절하나, 기존 코드(`health-checker` 패키지)와의 정합성과 에러 핸들링 표준화가 보완되면 더 견고한 플랜이 됨.
