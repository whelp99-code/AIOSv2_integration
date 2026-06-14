# Phase A-3: VibeCodingOS API 계약 확정

> **작성일**: 2026-06-14
> **목표**: Projects/Pipeline/Agents API 계약 확정 + 테스트 통과
> **대상**: `~/Documents/Playground/vibe-coding-os/app/api/`

---

## 📊 현재 상태 분석

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

### ❌ 미구현된 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **API 계약 문서화** | OpenAPI/Swagger 스펙 | 🔴 높음 |
| **인증/인가** | API 키 또는 JWT 인증 | 🔴 높음 |
| **입력 검증** | Zod 스키마 검증 | 🟡 중간 |
| **에러 핸들링 표준화** | 일관된 에러 응답 형식 | 🟡 중간 |
| **테스트 커버리지** | 통합 테스트 부족 | 🟡 중간 |

---

## 🎯 Phase A-3 목표

### 1차 목표: API 계약 문서화

**OpenAPI/Swagger 스펙 생성:**
- Projects API 문서화
- A2A API 문서화
- 요청/응답 스키마 정의

### 2차 목표: 인증/인가 기본 구현

**API 키 기반 인증:**
- `X-API-Key` 헤더 검증
- 환경변수로 API 키 설정
- 미인증 시 401 반환

### 3차 목표: 테스트 커버리지 확대

**통합 테스트 추가:**
- Projects API 테스트
- A2A API 테스트
- 에러 케이스 테스트

---

## 📋 구현 상세

### Task 3.1: OpenAPI 스펙 생성

**Objective:** Projects/A2A API OpenAPI 스펙 생성

**Files:**
- Create: `docs/openapi-vibe-coding.yaml`

**Step 1: OpenAPI 스펙 생성**

```yaml
openapi: 3.0.0
info:
  title: VibeCodingOS API
  version: 1.0.0
  description: VibeCodingOS 프로젝트 관리 API
servers:
  - url: http://localhost:4000
paths:
  /api/projects:
    get:
      summary: 프로젝트 목록 조회
      responses:
        '200':
          description: 프로젝트 목록
  /api/projects/{id}:
    get:
      summary: 프로젝트 상세 조회
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 프로젝트 상세
        '404':
          description: 프로젝트 미존재
  /api/projects/{id}/run-pipeline:
    post:
      summary: 파이프라인 실행
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                pipeline:
                  type: string
      responses:
        '200':
          description: 파이프라인 실행 결과
  /api/a2a/tasks:
    get:
      summary: A2A 태스크 목록 조회
      responses:
        '200':
          description: 태스크 목록
  /api/a2a/agents/coder:
    get:
      summary: 코더 에이전트 정보
      responses:
        '200':
          description: 에이전트 정보
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
- Modify: `app/api/projects/route.ts`

**Step 1: 인증 미들웨어 생성**

```typescript
// middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';

const API_KEY=proces..._KEY;

if (!API_KEY) {
  throw new Error('VIBE_CODING_API_KEY environment variable is required');
}

export function apiKeyAuth(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey || apiKey !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
git add middleware/ app/api/
git commit -m "feat(auth): add API key authentication"
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
  it('should return project list', async () => {
    const res = await fetch('http://localhost:4000/api/projects');
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
  it('should return task list', async () => {
    const res = await fetch('http://localhost:4000/api/a2a/tasks');
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

1. **API 계약 문서화**
   - OpenAPI 스펙 생성
   - 요청/응답 스키마 정의

2. **인증/인가 구현**
   - API 키 미포함 시 401 반환
   - API 키 포함 시 정상 응답

3. **테스트 통과**
   - Projects API 테스트
   - A2A API 테스트

---

## 📅 타임라인

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 3.1 | OpenAPI 스펙 생성 | 0.5일 | ⏸️ 대기 |
| 3.2 | 인증/인가 구현 | 0.5일 | ⏸️ 대기 |
| 3.3 | 통합 테스트 작성 | 0.5일 | ⏸️ 대기 |

**총 예상 기간: 1.5일**

---

## ⚠️ 리스크

1. **A2A 프로토콜 복잡성** - 문서화 시간 소요
2. **기존 코드 영향** - 인증 추가 시 Breaking Change
3. **테스트 환경** - 서버 실행 필요

---

## 🎯 성공 기준

1. ✅ API 계약 문서화 완료
2. ✅ 인증/인가 구현
3. ✅ 테스트 통과
