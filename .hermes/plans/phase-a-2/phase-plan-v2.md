# Phase A-2: Sangfor MCP Operator Console API 계약 확정 (v2)

> **작성일**: 2026-06-14
> **수정일**: 2026-06-14 (Red Team 피드백 반영)
> **목표**: REST API 스펙 확정 + 실장비 헬스체크 (모킹)
> **대상**: `~/Documents/Playground/sangfor-mcp-workflow/apps/operator-console/`

---

## 📊 Red Team 검토 결과 반영

### ✅ 반영된 개선사항

| 이슈 | 수정 내용 |
|------|----------|
| 하드코딩된 기본 API 키 | 환경변수 미설정 시 서버 기동 거부 (fail-fast) |
| 입력 검증 부재 | Zod 스키마 검증 추가 |
| 기존 health-checker 패키지 무시 | `packages/health-checker` 래핑 |
| URL 네임스페이스 충돌 | `/api/devices/health` 사용 |
| server.ts 모놀리식 심화 | 라우트 파일 분리 |
| OpenAPI 스펙 불완전 | Health Check API만 문서화 (범위 축소) |
| 인증 적용 범위 불명확 | 공개/보호 엔드포인트 분류 명시 |
| 테스트 계획 전무 | supertest 기반 통합 테스트 추가 |
| 모킹 데이터 하드코딩 | `mocks/devices.json` 분리 |
| 에러 응답 형식 비일관 | 표준 에러 응답 인터페이스 정의 |

---

## 🎯 Phase A-2 목표 (v2)

### 1차 목표: Health Check API 구현 (모킹)

**실장비 헬스체크 엔드포인트 추가:**

```typescript
// GET /api/devices/health
// GET /api/devices/health/:id
// POST /api/devices/health/check
```

**모킹 데이터:**
- EPP: 10.80.1.106 (정상)
- IAG: 10.80.1.108 (정상)
- CC: 10.80.1.107 (경고)

### 2차 목표: API 계약 문서화

**OpenAPI/Swagger 스펙 생성:**
- Health Check API만 문서화 (범위 축소)
- 요청/응답 스키마 정의
- 에러 코드 표준화

### 3차 목표: 인증/인가 기본 구현

**API 키 기반 인증:**
- `X-API-Key` 헤더 검증
- 환경변수로 API 키 설정 (필수)
- 미인증 시 401 반환

---

## 📋 구현 상세 (v2)

### Task 2.1: 라우트 파일 분리 및 Health Check API 구현

**Objective:** server.ts에서 라우트 분리 + Health Check API 구현

**Files:**
- Create: `apps/operator-console/src/routes/health.routes.ts`
- Create: `apps/operator-console/src/routes/index.ts`
- Modify: `apps/operator-console/src/server.ts`

**Step 1: Health Check 라우트 파일 생성**

```typescript
// apps/operator-console/src/routes/health.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { HealthChecker } from '@sangfor/health-checker';

const router = Router();
const healthChecker = new HealthChecker();

// 장비 목록 조회
router.get('/devices', async (req, res) => {
  try {
    const devices = await healthChecker.getDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

// 장비 상세 조회
router.get('/devices/:id', async (req, res) => {
  try {
    const device = await healthChecker.getDevice(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get device' });
  }
});

// 장비 상태 확인 실행
const CheckSchema = z.object({
  deviceIds: z.array(z.string()).min(1).max(10),
});

router.post('/devices/check', async (req, res) => {
  try {
    const { deviceIds } = CheckSchema.parse(req.body);
    const results = await healthChecker.checkDevices(deviceIds);
    res.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to check devices' });
  }
});

export default router;
```

**Step 2: 라우트 인덱스 생성**

```typescript
// apps/operator-console/src/routes/index.ts
export { default as healthRoutes } from './health.routes';
```

**Step 3: server.ts 수정**

```typescript
// apps/operator-console/src/server.ts
import { healthRoutes } from './routes';

// 라우트 마운트
app.use('/api/devices/health', healthRoutes);
```

**Step 4: 테스트**

```bash
curl http://localhost:3500/api/devices/health
curl http://localhost:3500/api/devices/health/epp-1
curl -X POST http://localhost:3500/api/devices/health/check -H "Content-Type: application/json" -d '{"deviceIds": ["epp-1", "iag-1"]}'
```

**Step 5: 커밋**

```bash
git add apps/operator-console/src/routes/ apps/operator-console/src/server.ts
git commit -m "feat(health): add device health check API with route separation"
```

---

### Task 2.2: API 계약 문서화 (Health Check만)

**Objective:** Health Check API OpenAPI 스펙 생성

**Files:**
- Create: `apps/operator-console/docs/openapi-health.yaml`

**Step 1: OpenAPI 스펙 생성**

```yaml
openapi: 3.0.0
info:
  title: Sangfor MCP Operator Console - Health Check API
  version: 1.0.0
  description: 장비 상태 확인 API
servers:
  - url: http://localhost:3500
paths:
  /api/devices/health:
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
  /api/devices/health/{id}:
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
  /api/devices/health/check:
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
                  minItems: 1
                  maxItems: 10
      responses:
        '200':
          description: 확인 결과
        '400':
          description: 잘못된 입력
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
    DeviceDetail:
      allOf:
        - $ref: '#/components/schemas/Device'
        - type: object
          properties:
            cpu:
              type: number
            memory:
              type: number
            disk:
              type: number
```

**Step 2: 커밋**

```bash
git add apps/operator-console/docs/
git commit -m "docs(api): add Health Check API OpenAPI specification"
```

---

### Task 2.3: 인증/인가 기본 구현

**Objective:** API 키 기반 인증 구현 (fail-fast)

**Files:**
- Create: `apps/operator-console/src/middleware/auth.ts`
- Modify: `apps/operator-console/src/server.ts`

**Step 1: 인증 미들웨어 생성**

```typescript
// apps/operator-console/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

const API_KEY = process.env.SANGFOR_API_KEY;

if (!API_KEY) {
  throw new Error('SANGFOR_API_KEY environment variable is required');
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // 타이밍 공격 방지
  const apiKeyBuffer = Buffer.from(apiKey);
  const validKeyBuffer = Buffer.from(API_KEY);
  
  if (apiKeyBuffer.length !== validKeyBuffer.length || 
      !timingSafeEqual(apiKeyBuffer, validKeyBuffer)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}
```

**Step 2: 미들웨어 적용**

```typescript
// apps/operator-console/src/server.ts
import { apiKeyAuth } from './middleware/auth';

// 공개 엔드포인트 (인증 불필요)
app.get('/api/system/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 보호 엔드포인트 (인증 필요)
app.use('/api/devices/health', apiKeyAuth);
app.use('/api/workflows', apiKeyAuth);
app.use('/api/compliance', apiKeyAuth);
app.use('/api/templates', apiKeyAuth);
app.use('/api/manual', apiKeyAuth);
app.use('/api/device', apiKeyAuth);
app.use('/api/guide', apiKeyAuth);
app.use('/api/vendors', apiKeyAuth);
app.use('/api/learning', apiKeyAuth);
app.use('/api/access', apiKeyAuth);
```

**Step 3: 커밋**

```bash
git add apps/operator-console/src/middleware/ apps/operator-console/src/server.ts
git commit -m "feat(auth): add API key authentication with fail-fast"
```

---

### Task 2.4: 통합 테스트 작성

**Objective:** supertest 기반 통합 테스트

**Files:**
- Create: `apps/operator-console/tests/health-api.test.ts`

**Step 1: 테스트 작성**

```typescript
// apps/operator-console/tests/health-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

describe('Health Check API', () => {
  const API_KEY = process.env.SANGFOR_API_KEY || 'test-api-key';
  
  beforeAll(() => {
    process.env.SANGFOR_API_KEY = API_KEY;
  });

  describe('GET /api/devices/health', () => {
    it('should return device list', async () => {
      const res = await request(app)
        .get('/api/devices/health')
        .set('X-API-Key', API_KEY);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should return 401 without API key', async () => {
      const res = await request(app)
        .get('/api/devices/health');
      
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/devices/health/:id', () => {
    it('should return device detail', async () => {
      const res = await request(app)
        .get('/api/devices/health/epp-1')
        .set('X-API-Key', API_KEY);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'epp-1');
      expect(res.body).toHaveProperty('cpu');
      expect(res.body).toHaveProperty('memory');
    });

    it('should return 404 for non-existent device', async () => {
      const res = await request(app)
        .get('/api/devices/health/non-existent')
        .set('X-API-Key', API_KEY);
      
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/devices/health/check', () => {
    it('should check devices', async () => {
      const res = await request(app)
        .post('/api/devices/health/check')
        .set('X-API-Key', API_KEY)
        .send({ deviceIds: ['epp-1', 'iag-1'] });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.body.results).toHaveLength(2);
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/devices/health/check')
        .set('X-API-Key', API_KEY)
        .send({ deviceIds: 'invalid' });
      
      expect(res.status).toBe(400);
    });
  });
});
```

**Step 2: 커밋**

```bash
git add apps/operator-console/tests/
git commit -m "test(health): add integration tests for health check API"
```

---

## 📋 검증 기준 (v2)

### ✅ 완료 조건

1. **Health Check API 동작**
   - `GET /api/devices/health` → 200 + 장비 목록
   - `GET /api/devices/health/:id` → 200 + 장비 상세
   - `POST /api/devices/health/check` → 200 + 확인 결과

2. **API 계약 문서화**
   - OpenAPI 스펙 생성 (Health Check만)
   - 스키마 유효성 검증

3. **인증/인가 구현**
   - API 키 미포함 시 401 반환
   - API 키 포함 시 정상 응답
   - 환경변수 미설정 시 서버 기동 거부

4. **테스트 통과**
   - supertest 기반 통합 테스트 6건 통과
   - 에러 케이스 테스트

---

## 📅 타임라인 (v2)

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 2.1 | 라우트 분리 + Health Check API | 0.5일 | ⏸️ 대기 |
| 2.2 | OpenAPI 스펙 (Health만) | 0.25일 | ⏸️ 대기 |
| 2.3 | 인증/인가 구현 | 0.5일 | ⏸️ 대기 |
| 2.4 | 통합 테스트 | 0.25일 | ⏸️ 대기 |

**총 예상 기간: 1.5일**

---

## ⚠️ 리스크 (v2)

1. **기존 health-checker 패키지 의존성** - 설치 필요
2. **환경변수 관리** - SANGFOR_API_KEY 필수
3. **Breaking Change** - 라우트 분리 시 기존 API 영향

---

## 🎯 성공 기준 (v2)

1. ✅ Health Check API 정상 동작
2. ✅ API 계약 문서화 완료
3. ✅ 인증/인가 기본 구현
4. ✅ 모든 테스트 통과
5. ✅ Red Team 승인
