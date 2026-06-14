# Phase A-2: Sangfor MCP Operator Console API 계약 확정

> **작성일**: 2026-06-14
> **목표**: REST API 스펙 확정 + 실장비 헬스체크 (모킹)
> **대상**: `~/Documents/Playground/sangfor-mcp-workflow/apps/operator-console/`

---

## 📊 현재 상태 분석

### ✅ 이미 구현된 API (25개+)

| 카테고리 | API | 메서드 | 상태 |
|----------|-----|--------|------|
| **Dashboard** | `/api/dashboard/stats` | GET | ✅ |
| **Workflow** | `/api/workflows` | GET | ✅ |
| **Workflow** | `/api/workflows/:id` | GET | ✅ |
| **Workflow** | `/api/workflows/generate` | POST | ✅ |
| **Workflow** | `/api/workflows/from-template` | POST | ✅ |
| **Workflow** | `/api/workflows/:id/approve` | POST | ✅ |
| **Workflow** | `/api/workflows/:id/reject` | POST | ✅ |
| **Workflow** | `/api/workflows/:id/execute` | POST | ✅ |
| **Workflow** | `/api/workflows/:id/logs` | GET | ✅ |
| **Template** | `/api/templates` | GET | ✅ |
| **Template** | `/api/templates/search` | GET | ✅ |
| **Compliance** | `/api/compliance/track` | POST | ✅ |
| **Compliance** | `/api/compliance/trend` | GET | ✅ |
| **Compliance** | `/api/compliance/roadmap` | POST | ✅ |
| **Compliance** | `/api/compliance/proposal` | POST | ✅ |
| **Manual QA** | `/api/manual/ask` | POST | ✅ |
| **Manual QA** | `/api/manual/menu-path` | POST | ✅ |
| **Device Menu** | `/api/device/capture-menu` | POST | ✅ |
| **Device Menu** | `/api/device/compare` | POST | ✅ |
| **Setting Guide** | `/api/guide/generate` | POST | ✅ |
| **Vendor** | `/api/vendors/compare` | POST | ✅ |
| **Vendor** | `/api/vendors/report` | POST | ✅ |
| **Learning** | `/api/learning/run` | POST | ✅ |
| **Learning** | `/api/learning/schedules` | GET | ✅ |
| **Learning** | `/api/learning/schedules` | POST | ✅ |
| **Learning** | `/api/learning/schedules/:id/run` | POST | ✅ |
| **Device Access** | `/api/access/request` | POST | ✅ |

### ❌ 미구현된 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **Health Check API** | 실장비 상태 확인 (모킹) | 🔴 높음 |
| **인증/인가** | API 키 또는 JWT 인증 | 🔴 높음 |
| **Rate Limiting** | API 호출 제한 | 🟡 중간 |
| **에러 핸들링 표준화** | 일관된 에러 응답 형식 | 🟡 중간 |
| **입력 검증** | Zod 스키마 검증 | 🟡 중간 |
| **로깅 표준화** | 구조화된 로그 | 🟢 낮음 |

---

## 🎯 Phase A-2 목표

### 1차 목표: Health Check API 구현 (모킹)

**실장비 헬스체크 엔드포인트 추가:**

```typescript
// GET /api/health/devices
// GET /api/health/devices/:id
// POST /api/health/check
```

**모킹 데이터:**
- EPP: 10.80.1.106 (정상)
- IAG: 10.80.1.108 (정상)
- CC: 10.80.1.107 (경고)

### 2차 목표: API 계약 문서화

**OpenAPI/Swagger 스펙 생성:**
- 모든 API 엔드포인트 문서화
- 요청/응답 스키마 정의
- 에러 코드 표준화

### 3차 목표: 인증/인가 기본 구현

**API 키 기반 인증:**
- `X-API-Key` 헤더 검증
- 환경변수로 API 키 설정
- 미인증 시 401 반환

---

## 📋 구현 상세

### Task 2.1: Health Check API 구현

**Objective:** 실장비 상태 확인 엔드포인트 추가 (모킹)

**Files:**
- Modify: `apps/operator-console/src/server.ts`

**Step 1: Health Check 엔드포인트 추가**

```typescript
// ─── Health Check API ──────────────────────────────────────────────────────

// 장비 목록 조회
app.get('/api/health/devices', (req, res) => {
  const devices = [
    { id: 'epp-1', name: 'EPP', ip: '10.80.1.106', status: 'healthy', lastCheck: new Date().toISOString() },
    { id: 'iag-1', name: 'IAG', ip: '10.80.1.108', status: 'healthy', lastCheck: new Date().toISOString() },
    { id: 'cc-1', name: 'CC', ip: '10.80.1.107', status: 'warning', lastCheck: new Date().toISOString() },
  ];
  res.json(devices);
});

// 장비 상세 조회
app.get('/api/health/devices/:id', (req, res) => {
  const devices = {
    'epp-1': { id: 'epp-1', name: 'EPP', ip: '10.80.1.106', status: 'healthy', cpu: 45, memory: 62, disk: 78 },
    'iag-1': { id: 'iag-1', name: 'IAG', ip: '10.80.1.108', status: 'healthy', cpu: 32, memory: 55, disk: 65 },
    'cc-1': { id: 'cc-1', name: 'CC', ip: '10.80.1.107', status: 'warning', cpu: 89, memory: 92, disk: 45 },
  };
  
  const device = devices[req.params.id];
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json(device);
});

// 장비 상태 확인 실행
app.post('/api/health/check', async (req, res) => {
  const { deviceIds } = req.body;
  
  const results = deviceIds.map(id => ({
    deviceId: id,
    status: 'checked',
    timestamp: new Date().toISOString(),
    responseTime: Math.floor(Math.random() * 100) + 50,
  }));
  
  res.json({ results });
});
```

**Step 2: 테스트**

```bash
curl http://localhost:3500/api/health/devices
curl http://localhost:3500/api/health/devices/epp-1
curl -X POST http://localhost:3500/api/health/check -H "Content-Type: application/json" -d '{"deviceIds": ["epp-1", "iag-1"]}'
```

**Step 3: 커밋**

```bash
git add apps/operator-console/src/server.ts
git commit -m "feat(health): add device health check API endpoints"
```

---

### Task 2.2: API 계약 문서화

**Objective:** OpenAPI/Swagger 스펙 생성

**Files:**
- Create: `apps/operator-console/docs/openapi.yaml`

**Step 1: OpenAPI 스펙 생성**

```yaml
openapi: 3.0.0
info:
  title: Sangfor MCP Operator Console API
  version: 1.0.0
  description: Sangfor MCP 워크플로우 자동화 API
servers:
  - url: http://localhost:3500
paths:
  /api/health/devices:
    get:
      summary: 장비 목록 조회
      responses:
        '200':
          description: 장비 목록
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Device'
  /api/health/devices/{id}:
    get:
      summary: 장비 상세 조회
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 장비 상세
        '404':
          description: 장비 미존재
  /api/health/check:
    post:
      summary: 장비 상태 확인 실행
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                deviceIds:
                  type: array
                  items:
                    type: string
      responses:
        '200':
          description: 확인 결과
components:
  schemas:
    Device:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        ip:
          type: string
        status:
          type: string
          enum: [healthy, warning, critical]
        lastCheck:
          type: string
          format: date-time
```

**Step 2: Swagger UI 설정**

```typescript
// apps/operator-console/src/server.ts
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load('./docs/openapi.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

**Step 3: 커밋**

```bash
git add apps/operator-console/docs/ apps/operator-console/src/server.ts
git commit -m "docs(api): add OpenAPI specification"
```

---

### Task 2.3: 인증/인가 기본 구현

**Objective:** API 키 기반 인증 구현

**Files:**
- Modify: `apps/operator-console/src/server.ts`
- Create: `apps/operator-console/src/middleware/auth.ts`

**Step 1: 인증 미들웨어 생성**

```typescript
// apps/operator-console/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

const API_KEY = process.env.SANGFOR_API_KEY || 'default-api-key';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}
```

**Step 2: 미들웨어 적용**

```typescript
// apps/operator-console/src/server.ts
import { apiKeyAuth } from './middleware/auth';

// 인증이 필요한 API에 적용
app.use('/api/health', apiKeyAuth);
app.use('/api/workflows', apiKeyAuth);
app.use('/api/compliance', apiKeyAuth);
```

**Step 3: 커밋**

```bash
git add apps/operator-console/src/middleware/ apps/operator-console/src/server.ts
git commit -m "feat(auth): add API key authentication middleware"
```

---

## 📋 검증 기준

### ✅ 완료 조건

1. **Health Check API 동작**
   - `GET /api/health/devices` → 200 + 장비 목록
   - `GET /api/health/devices/:id` → 200 + 장비 상세
   - `POST /api/health/check` → 200 + 확인 결과

2. **API 계약 문서화**
   - OpenAPI 스펙 생성
   - Swagger UI 접근 가능 (`/api-docs`)

3. **인증/인가 구현**
   - API 키 미포함 시 401 반환
   - API 키 포함 시 정상 응답

4. **테스트 통과**
   - 모든 API 엔드포인트 테스트
   - 에러 케이스 테스트

---

## 📅 타임라인

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 2.1 | Health Check API 구현 | 0.5일 | ⏸️ 대기 |
| 2.2 | API 계약 문서화 | 0.5일 | ⏸️ 대기 |
| 2.3 | 인증/인가 구현 | 0.5일 | ⏸️ 대기 |

**총 예상 기간: 1.5일**

---

## ⚠️ 리스크

1. **실장비 연결 불가** - 모킹 데이터로 대체
2. **기존 API 호환성** - Breaking Change 주의
3. **보안** - API 키 관리 주의

---

## 🎯 성공 기준

1. ✅ Health Check API 정상 동작
2. ✅ API 계약 문서화 완료
3. ✅ 인증/인가 기본 구현
4. ✅ 모든 테스트 통과
