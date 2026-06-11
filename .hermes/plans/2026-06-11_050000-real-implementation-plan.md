# AIOSv2 실제 구현 완료 계획서

> **작성일**: 2026-06-11
> **목적**: 블루프린트 기반 실제 기능 구현 완료
> **핵심 원칙**: 가짜 데이터 제거, 실제 API 연결, 검증 가능한 구현

---

## 📋 현재 상태 분석

### ✅ 완성된 것
| 항목 | 상태 | 설명 |
|------|------|------|
| 모놀리스 모노레포 구조 | ✅ | Turborepo + pnpm |
| 도메인 모델 | ✅ | 13개 파일 |
| 비즈니스 로직 | ✅ | 16개 파일 |
| 인증 시스템 | ✅ | NextAuth.js |
| 대시보드 UI | ✅ | Mail Intelligence 프록시 |
| DB 스키마 | ✅ | Prisma |

### ❌ 미구현된 것 (빈 껍데기)
| API | 현재 상태 | 목표 |
|-----|-----------|------|
| /api/analyze | 가짜 데이터 반환 | AIOS v1 분석 API 연결 |
| /api/commands | 하드코딩 목록 | AIOS v1 명령어 API 연결 |
| /api/plan | 가짜 계획 반환 | AIOS v1 계획 API 연결 |
| /api/risk | 가짜 리스크 반환 | AIOS v1 리스크 API 연결 |
| /api/github | 모의 GitHub 데이터 | Octokit 실제 연결 |

---

## 🎯 구현 목표

### 1차 목표: AIOS v1 API 연결 (1-2일)
- 30개 API를 AIOSv2에서 프록시
- 실제 데이터 반환

### 2차 목표: F-aios-v3 연결 (1-2일)
- AI 엔진 통합
- 워크플로우 실행

### 3차 목표: 통합 대시보드 (1-2일)
- 모든 기능을 하나의 UI에서 관리
- 실시간 데이터 표시

---

## 📋 Phase 1: AIOS v1 API 프록시 구현

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

**Step 2: 환경 변수 설정**

```bash
# .env.local
AIOS_V1_URL=http://localhost:3101
MAIL_INTELLIGENCE_URL=http://localhost:10200
```

**Step 3: 커밋**

```bash
git add packages/infrastructure/src/proxy/aios-v1-proxy.ts
git commit -m "feat(proxy): add AIOS v1 proxy utility"
```

---

### Task 1.2: /api/mail-import 프록시 구현

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

### Task 1.3: /api/customers 프록시 구현

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

### Task 1.4: 나머지 API 프록시 구현

**Objective:** 파트너, 워크플로우, 지식베이스, 자동화, 승인 API 프록시

**Files:**
- Create: `apps/web/src/app/api/partners/route.ts`
- Create: `apps/web/src/app/api/workflows/route.ts`
- Create: `apps/web/src/app/api/knowledge/route.ts`
- Create: `apps/web/src/app/api/automation/route.ts`
- Create: `apps/web/src/app/api/approvals/route.ts`
- Create: `apps/web/src/app/api/github/route.ts`

**Step 1-6: 각 API 구현 후 커밋**

반복 패턴:
1. 빈 라우트 생성
2. 프록시 함수 호출
3. 테스트
4. 커밋

---

## 📋 Phase 2: F-aios-v3 연결

### Task 2.1: F-aios-v3 프록시 유틸리티

**Objective:** F-aios-v3 API를 프록시하는 유틸리티 생성

**Files:**
- Create: `packages/infrastructure/src/proxy/aios-v3-proxy.ts`

**Step 1: 프록시 클라이언트 구현**

```typescript
// packages/infrastructure/src/proxy/aios-v3-proxy.ts

const AIOS_V3_BASE_URL = process.env.AIOS_V3_URL || 'http://localhost:3200';

export async function proxyToAiosV3<T>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', body } = options;
  
  const response = await fetch(`${AIOS_V3_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`AIOS v3 API error: ${response.status}`);
  }

  return response.json();
}

// Workflow APIs
export const workflowEngineApi = {
  list: () => proxyToAiosV3('/api/workflows'),
  execute: (id: string, data: unknown) => 
    proxyToAiosV3(`/api/workflows/${id}/execute`, { method: 'POST', body: data }),
  getStatus: (id: string) => proxyToAiosV3(`/api/workflows/${id}/status`),
};

// Knowledge Graph APIs
export const knowledgeGraphApi = {
  search: (query: string) => 
    proxyToAiosV3(`/api/knowledge/search?q=${encodeURIComponent(query)}`),
  getDocuments: () => proxyToAiosV3('/api/knowledge/documents'),
  addDocument: (doc: unknown) => 
    proxyToAiosV3('/api/knowledge/documents', { method: 'POST', body: doc }),
};

// Monitoring APIs
export const monitoringApi = {
  getMetrics: () => proxyToAiosV3('/api/monitoring/metrics'),
  getAlerts: () => proxyToAiosV3('/api/monitoring/alerts'),
};
```

**Step 2: 커밋**

```bash
git add packages/infrastructure/src/proxy/aios-v3-proxy.ts
git commit -m "feat(proxy): add AIOS v3 proxy utility"
```

---

### Task 2.2: 워크플로우 API 연결

**Objective:** F-aios-v3 워크플로우 엔진을 AIOSv2에서 사용

**Files:**
- Create: `apps/web/src/app/api/workflows/route.ts`

**Step 1: API 라우트 생성**

```typescript
// apps/web/src/app/api/workflows/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { workflowEngineApi } from '@aios/infrastructure';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workflows = await workflowEngineApi.list();
    return NextResponse.json(workflows);
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
    const { workflowId, data } = body;

    const result = await workflowEngineApi.execute(workflowId, data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

**Step 2: 커밋**

```bash
git add apps/web/src/app/api/workflows/route.ts
git commit -m "feat(api): add workflows proxy to AIOS v3"
```

---

## 📋 Phase 3: 통합 대시보드

### Task 3.1: 대시보드에 모든 기능 추가

**Objective:** AIOS v1과 F-aios-v3의 모든 기능을 대시보드에 표시

**Files:**
- Modify: `apps/web/src/components/dashboard/dashboard.tsx`

**Step 1: 통합 대시보드 컴포넌트 구현**

```typescript
// dashboard.tsx에 추가할 컴포넌트

function CustomerStats() {
  const [customers, setCustomers] = useState([]);
  
  useEffect(() => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(setCustomers);
  }, []);

  return (
    <div>
      <h3>고객 관리</h3>
      <p>총 {customers.length}명</p>
    </div>
  );
}

function WorkflowStats() {
  const [workflows, setWorkflows] = useState([]);
  
  useEffect(() => {
    fetch('/api/workflows')
      .then(res => res.json())
      .then(setWorkflows);
  }, []);

  return (
    <div>
      <h3>워크플로우</h3>
      <p>총 {workflows.length}개</p>
    </div>
  );
}

function KnowledgeStats() {
  const [docs, setDocs] = useState([]);
  
  useEffect(() => {
    fetch('/api/knowledge')
      .then(res => res.json())
      .then(setDocs);
  }, []);

  return (
    <div>
      <h3>지식베이스</h3>
      <p>총 {docs.length}개 문서</p>
    </div>
  );
}
```

**Step 2: 대시보드에 통합**

```typescript
export function Dashboard() {
  return (
    <div>
      {/* 기존 메일 통계 */}
      <MailStats />
      
      {/* 새로 추가 */}
      <CustomerStats />
      <WorkflowStats />
      <KnowledgeStats />
      
      {/* 기존 활동 */}
      <RecentActivity />
    </div>
  );
}
```

**Step 3: 커밋**

```bash
git add apps/web/src/components/dashboard/
git commit -m "feat(dashboard): add all features to unified dashboard"
```

---

## 📋 Phase 4: 테스트 및 검증

### Task 4.1: 통합 테스트

**Objective:** 모든 프록시 API가 실제로 동작하는지 확인

**Step 1: 테스트 스크립트 생성**

```bash
#!/bin/bash
# tests/integration/test-all-proxy.sh

echo "=== AIOSv2 통합 테스트 ==="

# 1. Mail Intelligence
echo "1. Mail Import..."
curl -s -X POST http://localhost:3100/api/mail-import \
  -H "Content-Type: application/json" \
  -d '{"count": 10}' | jq .

# 2. Customers
echo "2. Customers..."
curl -s http://localhost:3100/api/customers | jq .

# 3. Partners
echo "3. Partners..."
curl -s http://localhost:3100/api/partners | jq .

# 4. Workflows
echo "4. Workflows..."
curl -s http://localhost:3100/api/workflows | jq .

# 5. Knowledge
echo "5. Knowledge..."
curl -s http://localhost:3100/api/knowledge | jq .

# 6. GitHub
echo "6. GitHub..."
curl -s http://localhost:3100/api/github | jq .

echo "=== 테스트 완료 ==="
```

**Step 2: 실행**

```bash
chmod +x tests/integration/test-all-proxy.sh
./tests/integration/test-all-proxy.sh
```

---

## 📅 타임라인

| Phase | 내용 | 기간 | 상태 |
|-------|------|------|------|
| Phase 1 | AIOS v1 API 프록시 | 1-2일 | 🔴 미시작 |
| Phase 2 | F-aios-v3 연결 | 1-2일 | 🔴 미시작 |
| Phase 3 | 통합 대시보드 | 1-2일 | 🔴 미시작 |
| Phase 4 | 테스트 검증 | 1일 | 🔴 미시작 |

**총 예상 기간: 4-7일**

---

## ⚠️ 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| AIOS v1 서버 중단 | 헬스 체크 + 자동 재시작 |
| API 호환성 문제 | 에러 핸들링 + 로깅 |
| 성능 저하 | 캐싱 + 비동기 처리 |
| 보안 취약점 | 인증 강화 + 입력 검증 |

---

## 🎯 성공 기준

1. ✅ AIOS v1 API가 AIOS v2에서 프록시되어 동작
2. ✅ F-aios-v3 API가 AIOS v2에서 프록시되어 동작
3. ✅ 통합 대시보드에서 실제 데이터 표시
4. ✅ 모든 API가 200 반환
5. ✅ 테스트 커버리지 80% 이상

---

**이 계획대로 실행하시겠습니까?**
