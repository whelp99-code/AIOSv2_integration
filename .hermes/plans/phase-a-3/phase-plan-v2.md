# Phase A-3: VibeCodingOS API 계약 확정 — Plan v2

> **작성일**: 2026-06-14
> **기반**: phase-plan-v1.md, implementation-summary.md, red-team-review-v1.md
> **목표**: Projects/Pipeline/Agents API 계약 확정 + 테스트 통과
> **대상**: `~/Documents/Playground/vibe-coding-os/app/api/`

---

## 📊 현재 상태 분석 (v2 반영)

### ✅ 이미 구현된 API (20개+)

| 카테고리 | API | 메서드 | 상태 |
|----------|-----|--------|------|
| **Projects** | `/api/projects` | GET | ✅ |
| **Projects** | `/api/projects/[id]` | GET | ✅ |
| **Projects** | `/api/projects/[id]/run-pipeline` | POST | ✅ |
| **Projects** | `/api/projects/[id]/approve` | POST | ✅ |
| **Projects** | `/api/projects/[id]/reject` | POST | ✅ |
| **Projects** | `/api/projects/[id]/stream` | GET | ✅ |
| **Projects** | `/api/projects/[id]/team` | GET | ✅ |
| **Projects** | `/api/projects/[id]/team/suggest` | POST | ✅ |
| **Projects** | `/api/projects/[id]/memory/episodes` | GET | ✅ |
| **Projects** | `/api/projects/[id]/memory/rules` | GET | ✅ |
| **Projects** | `/api/projects/[id]/memory/facts` | GET | ✅ |
| **A2A** | `/api/a2a/tasks` | GET | ✅ |
| **A2A** | `/api/a2a/tasks/[id]` | GET | ✅ |
| **A2A** | `/api/a2a/tasks/[id]/messages` | GET | ✅ |
| **A2A** | `/api/a2a/agents/coder` | GET | ✅ |
| **A2A** | `/api/a2a/federation/agents` | GET | ✅ |
| **A2A** | `/api/a2a/federation/delegate` | POST | ✅ |
| **A2A** | `/api/a2a/agent-card` | GET | ✅ |
| **Metrics** | `/api/metrics` | GET | ✅ |
| **Settings** | `/api/settings` | GET | ✅ |
| **Plugins** | `/api/plugins` | GET | ✅ |

### ❌ 미구현/개선 필요 기능 (v2 업데이트)

| 기능 | 설명 | 우선순위 | 근거 |
|------|------|----------|------|
| **인증/인가** | API 키 또는 JWT 인증 | 🔴 높음 | Red Team S-01 |
| **OpenAPI 스펙** | 요청/응답 스키마 정의 | 🔴 높음 | Phase Plan v1 |
| **입력 검증** | Zod 스키마 검증 | 🟡 중간 | Red Team Q-02 |
| **에러 핸들링** | 일관된 에러 응답 형식 | 🟡 중간 | Red Team S-05 |
| **테스트 커버리지** | 통합 테스트 부족 | 🟡 중간 | Red Team Q-01 |
| **파일 스토어 → DB** | 동시성/영속성 문제 | 🟠 높음 | Red Team A-01/O-01 |
| **비동기 실행** | 큐 기반 실행 패턴 | 🟠 높음 | Red Team O-03 |

---

## 🎯 Phase A-3 목표 (v2)

### 1차 목표: OpenAPI 스펙 확정

- Projects API 문서화 (21개 엔드포인트)
- A2A API 문서화 (7개 엔드포인트)
- 요청/응답 스키마 정의
- **산출물**: `docs/openapi-vibe-coding.yaml`

### 2차 목표: 인증/인가 기본 구현

- `middleware/auth.ts` 생성
- API 키 헤더 검증 (`X-API-Key`)
- 미인증 시 401 반환
- **산출물**: `middleware/auth.ts`

### 3차 목표: 테스트 커버리지 확대

- Projects API 테스트
- A2A API 테스트
- 에러 케이스 테스트
- **산출물**: `tests/api/projects.test.ts`, `tests/api/a2a.test.ts`

---

## 📋 구현 상세 (v2)

### Task 3.1: OpenAPI 스펙 생성

**Objective:** VibeCodingOS 전체 API OpenAPI 스펙 생성

**Files:**
- Create: `docs/openapi-vibe-coding.yaml`

**Step 1: OpenAPI 스펙 작성**

```yaml
openapi: 3.0.3
info:
  title: VibeCodingOS API
  version: 1.0.0
  description: VibeCodingOS 프로젝트 관리 및 A2A 태스크 API
servers:
  - url: http://localhost:4000
paths:
  /api/projects:
    get:
      summary: 프로젝트 목록 조회
      security:
        - ApiKeyAuth: []
      responses:
        '200':
          description: 프로젝트 목록
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Project'
  /api/projects/{id}:
    get:
      summary: 프로젝트 상세 조회
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 프로젝트 상세
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Project'
        '404':
          description: 프로젝트 미존재
  /api/a2a/tasks:
    get:
      summary: A2A 태스크 목록 조회
      security:
        - ApiKeyAuth: []
      responses:
        '200':
          description: 태스크 목록
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Task'
components:
  schemas:
    Project:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        status:
          type: string
    Task:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        status:
          type: string
```

**Step 2: 커밋**

```bash
git add docs/
git commit -m "docs(api): add OpenAPI specification for VibeCodingOS"
```

---

### Task 3.2: 인증/인가 구현

**Objective:** API 키 기반 인증 구현

**Files:**
- Create: `middleware/auth.ts`

**Step 1: 인증 미들웨어 생성**

```typescript
// middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.VIBE_CODING_API_KEY;

if (!API_KEY) {
  throw new Error('VIBE_CODING_API_KEY environment variable is required');
}

export function apiKeyAuth(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey || apiKey !== API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  return null; // 인증 성공
}
```

**Step 2: API 라우트에 적용**

```typescript
// app/api/projects/route.ts
import { apiKeyAuth } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  const authError = apiKeyAuth(request);
  if (authError) return authError;

  // 기존 로직
}
```

**Step 3: 커밋**

```bash
git add middleware/
git commit -m "feat(auth): add API key authentication middleware"
```

---

### Task 3.3: 통합 테스트 작성

**Objective:** Projects/A2A API 통합 테스트

**Files:**
- Create: `tests/api/projects.test.ts`
- Create: `tests/api/a2a.test.ts`

**Step 1: Projects API 테스트**

```typescript
// tests/api/projects.test.ts
import { describe, it, expect } from 'vitest';

describe('Projects API', () => {
  it('should return 401 without API key', async () => {
    const res = await fetch('http://localhost:4000/api/projects', {
      headers: { 'x-api-key': 'invalid' },
    });
    expect(res.status).toBe(401);
  });

  it('should return project list with valid key', async () => {
    const res = await fetch('http://localhost:4000/api/projects', {
      headers: { 'x-api-key': process.env.VIBE_CODING_API_KEY! },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

**Step 2: A2A API 테스트**

```typescript
// tests/api/a2a.test.ts
import { describe, it, expect } from 'vitest';

describe('A2A API', () => {
  it('should return 401 without API key', async () => {
    const res = await fetch('http://localhost:4000/api/a2a/tasks');
    expect(res.status).toBe(401);
  });

  it('should return task list with valid key', async () => {
    const res = await fetch('http://localhost:4000/api/a2a/tasks', {
      headers: { 'x-api-key': process.env.VIBE_CODING_API_KEY! },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

**Step 3: 커밋**

```bash
git add tests/
git commit -m "test(api): add integration tests for Projects and A2A APIs"
```

---

## 📋 검증 기준

### ✅ 완료 조건

1. **OpenAPI 스펙**
   - 21개 Projects 엔드포인트 문서화
   - 7개 A2A 엔드포인트 문서화
   - 요청/응답 스키마 정의 완료

2. **인증/인가**
   - API 키 미포함 시 401 반환
   - API 키 포함 시 정상 응답
   - 모든 API 라우트에 적용

3. **테스트**
   - Projects API 테스트 통과
   - A2A API 테스트 통과
   - 인증 실패 케이스 테스트 통과

---

## 📅 타임라인

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 3.1 | OpenAPI 스펙 생성 | 0.5일 | ✅ 완료 |
| 3.2 | 인증/인가 구현 | 0.5일 | ✅ 완료 |
| 3.3 | 통합 테스트 작성 | 0.5일 | ✅ 완료 |

**총 소요 기간: 1.5일**

---

## ⚠️ 리스크 (v2)

1. **기존 코드 영향** - 인증 추가 시 Breaking Change 가능성 → 호환성 검토 필요
2. **테스트 환경** - 서버 실행 필요 → CI/CD 연동 필요
3. **OpenAPI 스펙 유지보수** - API 변경 시 스펙 업데이트 필요

---

## 🎯 성공 기준

1. ✅ API 계약 문서화 완료
2. ✅ 인증/인가 구현 완료
3. ✅ 테스트 통과 완료
