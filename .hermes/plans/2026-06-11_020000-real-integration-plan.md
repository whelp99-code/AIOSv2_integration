# AIOSv2 Integration - 진짜 통합 구현 계획

> **Note (2026-06-13):** The timeline table at the bottom of this plan (Phase 1–4 “미시작”) is **outdated**. cursor-opencode Phases 3–5 completed much of the proxy/dashboard work. Current per-product status: [`docs/reports/product-integration-blueprint-status.md`](../docs/reports/product-integration-blueprint-status.md).

> **For Hermes:** 이 계획은 AIOSv2 Integration을 진짜 통합 플랫폼으로 만드는 구현 계획입니다.

**Goal:** 기존 AIOS v1의 30개 API를 AIOSv2에서 프록시하여 실제 동작하는 통합 플랫폼 구축

**Architecture:** AIOSv2는 API Gateway 역할을 하여, 기존 AIOS v1의 기능을 프록시하고 통합 UI 제공

**Tech Stack:** Next.js 14, Prisma, NextAuth.js, TypeScript

---

## 📊 현재 상태 분석

### 실제 구현된 것
| 항목 | 파일 수 | 상태 |
|------|---------|------|
| 도메인 모델 | 13개 | ✅ 완성 |
| 비즈니스 로직 | 16개 | ⚠️ 테스트만 가능 |
| UI 컴포넌트 | 8개 | ✅ 기본 동작 |
| API 엔드포인트 | 6개 | ❌ 가짜 데이터 |

### 미구현된 것
| 항목 | 필요 파일 수 | 우선순위 |
|------|--------------|----------|
| API 프록시 | 30개 | 🔴 높음 |
| 공유 인증 | 2개 | 🔴 높음 |
| 통합 대시보드 | 5개 | 🟡 중간 |
| DB 연결 | 3개 | 🟡 중간 |

---

## 🎯 통합 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                    AIOSv2 (포트 3100)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   대시보드   │  │   칸반보드   │  │   설정      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
│         │                │                │         │
│  ┌──────▼────────────────▼────────────────▼──────┐  │
│  │              API Gateway (프록시)              │  │
│  └──────┬────────────────┬────────────────┬──────┘  │
└─────────┼────────────────┼────────────────┼─────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  AIOS v1    │  │  F-aios-v3  │  │  Sangfor    │
│  (포트 3101)│  │  (포트 3200)│  │  (포트 3500)│
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 📋 Phase 1: API 프록시 구현 (1-2일)

### Task 1.1: 프록시 유틸리티 생성

**Objective:** AIOS v1로 API 요청을 보내는 유틸리티 함수 생성

**Files:**
- Create: `packages/infrastructure/src/proxy/aios-v1-proxy.ts`

**Step 1: 프록시 클라이언트 구현**

```typescript
// packages/infrastructure/src/proxy/aios-v1-proxy.ts

const AIOS_V1_BASE_URL = process.env.AIOS_V1_URL || 'http://localhost:3101';

interface ProxyOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function proxyToAiosV1<T>(
  endpoint: string,
  options: ProxyOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const response = await fetch(`${AIOS_V1_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`AIOS v1 API error: ${response.status}`);
  }

  return response.json();
}

// Mail Intelligence APIs
export const mailApi = {
  import: (count: number) => 
    proxyToAiosV1('/api/mail-import', { method: 'POST', body: { count } }),
  
  getCandidates: (limit?: number) => 
    proxyToAiosV1(`/api/mail-candidates?limit=${limit || 50}`),
  
  approveCandidate: (id: string) => 
    proxyToAiosV1('/api/mail-candidates', { method: 'POST', body: { action: 'approve', ids: [id] } }),
  
  getThreads: () => 
    proxyToAiosV1('/api/mail-insight-threads'),
};

// Customer APIs
export const customerApi = {
  list: (search?: string) => 
    proxyToAiosV1(`/api/customers${search ? `?search=${search}` : ''}`),
  
  get: (id: string) => 
    proxyToAiosV1(`/api/customers/${id}`),
  
  create: (data: unknown) => 
    proxyToAiosV1('/api/customers', { method: 'POST', body: data }),
  
  update: (id: string, data: unknown) => 
    proxyToAiosV1(`/api/customers/${id}`, { method: 'PUT', body: data }),
  
  delete: (id: string) => 
    proxyToAiosV1(`/api/customers/${id}`, { method: 'DELETE' }),
};

// Partner APIs
export const partnerApi = {
  list: () => proxyToAiosV1('/api/partners'),
  get: (id: string) => proxyToAiosV1(`/api/partners/${id}`),
  create: (data: unknown) => proxyToAiosV1('/api/partners', { method: 'POST', body: data }),
};

// Workflow APIs
export const workflowApi = {
  list: () => proxyToAiosV1('/api/workflows'),
  execute: (id: string, data: unknown) => 
    proxyToAiosV1(`/api/workflows/${id}/execute`, { method: 'POST', body: data }),
};

// Knowledge APIs
export const knowledgeApi = {
  search: (query: string) => 
    proxyToAiosV1(`/api/knowledge/search?q=${encodeURIComponent(query)}`),
  
  getDocuments: () => 
    proxyToAiosV1('/api/knowledge/documents'),
};

// GitHub APIs
export const githubApi = {
  getRepos: () => proxyToAiosV1('/api/github'),
  getIssues: (owner: string, repo: string) => 
    proxyToAiosV1(`/api/github?owner=${owner}&repo=${repo}`),
};

// Automation APIs
export const automationApi = {
  getWorkflows: () => proxyToAiosV1('/api/automation/workflows'),
  executeWorkflow: (id: string) => 
    proxyToAiosV1(`/api/automation/workflows/${id}/execute`, { method: 'POST' }),
};

// Approval APIs
export const approvalApi = {
  list: () => proxyToAiosV1('/api/approvals'),
  approve: (id: string) => 
    proxyToAiosV1(`/api/approvals/${id}/approve`, { method: 'POST' }),
  reject: (id: string, reason: string) => 
    proxyToAiosV1(`/api/approvals/${id}/reject`, { method: 'POST', body: { reason } }),
};

// Health Check
export const healthApi = {
  check: () => proxyToAiosV1('/api/health'),
};
```

**Step 2: 테스트 작성**

```typescript
// tests/proxy/aios-v1-proxy.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mailApi, customerApi } from '../../packages/infrastructure/src/proxy/aios-v1-proxy';

describe('AIOS v1 Proxy', () => {
  it('should call mail import API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    global.fetch = mockFetch;

    const result = await mailApi.import(100);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3101/api/mail-import',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should call customer list API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ customers: [] }),
    });
    global.fetch = mockFetch;

    const result = await customerApi.list();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3101/api/customers',
      expect.any(Object)
    );
  });
});
```

**Step 3: 실행 및 확인**

Run: `pnpm test tests/proxy/aios-v1-proxy.test.ts`
Expected: PASS

---

### Task 1.2: 환경 변수 설정

**Objective:** AIOS v1 URL을 환경 변수로 설정

**Files:**
- Modify: `.env.local`
- Modify: `.env.example`

**Step 1: 환경 변수 추가**

```bash
# .env.local
AIOS_V1_URL=http://localhost:3101
AIOS_V3_URL=http://localhost:3200
SANGFOR_URL=http://localhost:3500
```

**Step 2: .env.example 업데이트**

```bash
# .env.example
AIOS_V1_URL=http://localhost:3101
AIOS_V3_URL=http://localhost:3200
SANGFOR_URL=http://localhost:3500
```

**Step 3: 커밋**

```bash
git add .env.local .env.example
git commit -m "chore: add proxy environment variables"
```

---

### Task 1.3: /api/mail-import 프록시 구현

**Objective:** 메일 가져오기 API를 AIOS v1로 프록시

**Files:**
- Modify: `apps/web/src/app/api/mail-import/route.ts` (새로 생성)

**Step 1: API 라우트 생성**

```typescript
// apps/web/src/app/api/mail-import/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mailApi } from '@aios/infrastructure';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { count = 100 } = body;

    // AIOS v1로 프록시
    const result = await mailApi.import(count);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Mail import error:', error);
    return NextResponse.json(
      { error: 'Failed to import mail' },
      { status: 500 }
    );
  }
}
```

**Step 2: 테스트**

```bash
# 서버 실행 중
curl -X POST http://localhost:3100/api/mail-import \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'
```

Expected: AIOS v1에서 실제 메일 데이터 반환

**Step 3: 커밋**

```bash
git add apps/web/src/app/api/mail-import/route.ts
git commit -m "feat(api): add mail-import proxy to AIOS v1"
```

---

### Task 1.4: /api/customers 프록시 구현

**Objective:** 고객 관리 API를 AIOS v1로 프록시

**Files:**
- Create: `apps/web/src/app/api/customers/route.ts`
- Create: `apps/web/src/app/api/customers/[id]/route.ts`

**Step 1: 목록 API**

```typescript
// apps/web/src/app/api/customers/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { customerApi } from '@aios/infrastructure';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;

    const customers = await customerApi.list(search);
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const customer = await customerApi.create(body);
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

**Step 2: 상세 API**

```typescript
// apps/web/src/app/api/customers/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { customerApi } from '@aios/infrastructure';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await customerApi.get(params.id);
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const customer = await customerApi.update(params.id, body);
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await customerApi.delete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

**Step 3: 테스트**

```bash
curl http://localhost:3100/api/customers
curl http://localhost:3100/api/customers/123
```

**Step 4: 커밋**

```bash
git add apps/web/src/app/api/customers/
git commit -m "feat(api): add customers proxy to AIOS v1"
```

---

### Task 1.5: 나머지 API 프록시 구현

**Objective:** 파트너, 워크플로우, 지식베이스 API 프록시

**Files:**
- Create: `apps/web/src/app/api/partners/route.ts`
- Create: `apps/web/src/app/api/workflows/route.ts`
- Create: `apps/web/src/app/api/knowledge/route.ts`
- Create: `apps/web/src/app/api/approvals/route.ts`

**Step 1-4: 각 API 구현 후 커밋**

반복 패턴:
1. 빈 라우트 생성
2. 프록시 함수 호출
3. 테스트
4. 커밋

---

## 📋 Phase 2: 공유 인증 (1일)

### Task 2.1: 세션 공유 설정

**Objective:** AIOS v1과 AIOS v2가 같은 세션을 사용하도록 설정

**Files:**
- Modify: `apps/web/src/lib/auth/index.ts`

**Step 1: NextAuth 설정 수정**

```typescript
// apps/web/src/lib/auth/index.ts
import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // 세션에 사용자 ID 추가
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
```

**Step 2: 커밋**

```bash
git add apps/web/src/lib/auth/index.ts
git commit -m "feat(auth): update session callbacks for shared auth"
```

---

## 📋 Phase 3: 통합 대시보드 (2-3일)

### Task 3.1: 대시보드에 메일 통계 추가

**Objective:** AIOS v1 메일 데이터를 대시보드에 표시

**Files:**
- Modify: `apps/web/src/components/dashboard/dashboard.tsx`

**Step 1: 메일 통계 컴포넌트 추가**

```typescript
// 대시보드에 추가할 컴포넌트
function MailStats() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('/api/mail-import', { method: 'POST', body: JSON.stringify({ count: 0 }) })
      .then(res => res.json())
      .then(setStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium">메일 인텔리전스</h3>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-bold">{stats.total || 0}</p>
          <p className="text-sm text-gray-500">전체 메일</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{stats.processed || 0}</p>
          <p className="text-sm text-gray-500">처리 완료</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{stats.pending || 0}</p>
          <p className="text-sm text-gray-500">대기 중</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 대시보드에 통합**

```typescript
// dashboard.tsx 수정
export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* 기존 통계 */}
      <StatsGrid />
      
      {/* 새로 추가 */}
      <MailStats />
      <CustomerStats />
      <WorkflowStats />
      
      {/* 기존 활동 */}
      <RecentActivity />
    </div>
  );
}
```

**Step 3: 커밋**

```bash
git add apps/web/src/components/dashboard/
git commit -m "feat(dashboard): add mail and customer stats from AIOS v1"
```

---

## 📋 Phase 4: 테스트 및 검증 (1일)

### Task 4.1: 통합 테스트

**Objective:** 모든 프록시 API가 실제로 동작하는지 확인

**Step 1: 테스트 스크립트 생성**

```bash
#!/bin/bash
# tests/integration/test-proxy.sh

echo "=== AIOS v2 프록시 테스트 ==="

# 1. 메일 가져오기
echo "1. Mail Import..."
curl -s -X POST http://localhost:3100/api/mail-import \
  -H "Content-Type: application/json" \
  -d '{"count": 10}' | jq .

# 2. 고객 목록
echo "2. Customers..."
curl -s http://localhost:3100/api/customers | jq .

# 3. 파트너 목록
echo "3. Partners..."
curl -s http://localhost:3100/api/partners | jq .

# 4. 워크플로우
echo "4. Workflows..."
curl -s http://localhost:3100/api/workflows | jq .

# 5. 지식베이스
echo "5. Knowledge..."
curl -s http://localhost:3100/api/knowledge | jq .

echo "=== 테스트 완료 ==="
```

**Step 2: 실행**

```bash
chmod +x tests/integration/test-proxy.sh
./tests/integration/test-proxy.sh
```

---

## 📅 타임라인

| Phase | 내용 | 기간 | 상태 |
|-------|------|------|------|
| Phase 1 | API 프록시 구현 | 1-2일 | 🔴 미시작 |
| Phase 2 | 공유 인증 | 1일 | 🟡 진행 중 |
| Phase 3 | 통합 대시보드 | 2-3일 | 🟡 진행 중 |
| Phase 4 | 테스트 및 검증 | 1일 | 🔴 미시작 |

**총 예상 기간: 5-7일**

---

## ⚠️ 리스크

1. **AIOS v1 서버 의존성** - AIOS v1이 중단되면 AIOS v2도 중단
2. **API 호환성** - 기존 API 응답 형식과 다를 수 있음
3. **성능** - 프록시 오버헤드 발생 가능

---

## 🎯 성공 기준

1. ✅ AIOS v1 API가 AIOS v2에서 프록시되어 동작
2. ✅ 통합 대시보드에서 실제 데이터 표시
3. ✅ 인증이 정상적으로 동작
4. ✅ 모든 API가 200 반환

---

**이 계획대로 실행하시겠습니까? 아니면 수정이 필요한 부분이 있나요?**
