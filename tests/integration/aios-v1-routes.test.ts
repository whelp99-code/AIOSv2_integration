import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('AIOS v1 Routes Integration', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_AIOS_V1_REAL_LOGIC', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('POST /api/analyze', () => {
    it('Zod 검증 실패 시 400을 반환한다', async () => {
      const { POST } = await import('@/app/api/analyze/route');
      const req = new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('유효한 요청을 처리한다', async () => {
      const { POST } = await import('@/app/api/analyze/route');
      const req = new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'p1', type: 'full' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.projectId).toBe('p1');
    });

    it('type 기본값이 full이다', async () => {
      const { POST } = await import('@/app/api/analyze/route');
      const req = new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'p1' }),
      });
      const res = await POST(req);
      const body = await res.json();
      expect(body.type).toBe('full');
    });
  });

  describe('GET /api/analyze', () => {
    it('projectId 없이 400을 반환한다', async () => {
      const { GET } = await import('@/app/api/analyze/route');
      const req = new Request('http://localhost/api/analyze');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('projectId로 not_found를 반환한다', async () => {
      const { GET } = await import('@/app/api/analyze/route');
      const req = new Request('http://localhost/api/analyze?projectId=p1');
      const res = await GET(req);
      const body = await res.json();
      expect(body.status).toBe('not_found');
    });
  });

  describe('POST /api/plan', () => {
    it('Zod 검증 실패 시 400을 반환한다 (빈 projectId)', async () => {
      const { POST } = await import('@/app/api/plan/route');
      const req = new Request('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('유효한 요청을 처리한다', async () => {
      const { POST } = await import('@/app/api/plan/route');
      const req = new Request('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'p1' }),
      });
      const res = await POST(req);
      const body = await res.json();
      expect(body.phases).toBeDefined();
      expect(body.phases).toHaveLength(3);
    });

    it('requirements를 포함할 수 있다', async () => {
      const { POST } = await import('@/app/api/plan/route');
      const req = new Request('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'p1', requirements: ['r1'] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/plan', () => {
    it('projectId 없이 400을 반환한다', async () => {
      const { GET } = await import('@/app/api/plan/route');
      const req = new Request('http://localhost/api/plan');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('projectId로 not_found를 반환한다', async () => {
      const { GET } = await import('@/app/api/plan/route');
      const req = new Request('http://localhost/api/plan?projectId=p1');
      const res = await GET(req);
      const body = await res.json();
      expect(body.status).toBe('not_found');
    });
  });

  describe('POST /api/risk', () => {
    it('Zod 검증 실패 시 400을 반환한다', async () => {
      const { POST } = await import('@/app/api/risk/route');
      const req = new Request('http://localhost/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('유효한 요청을 처리한다', async () => {
      const { POST } = await import('@/app/api/risk/route');
      const req = new Request('http://localhost/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'p1', scope: 'full' }),
      });
      const res = await POST(req);
      const body = await res.json();
      expect(body.risks).toBeDefined();
      expect(body.risks).toHaveLength(2);
    });

    it('scope 기본값이 full이다', async () => {
      const { POST } = await import('@/app/api/risk/route');
      const req = new Request('http://localhost/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'p1' }),
      });
      const res = await POST(req);
      const body = await res.json();
      expect(body.scope).toBe('full');
    });
  });

  describe('GET /api/risk', () => {
    it('projectId 없이 400을 반환한다', async () => {
      const { GET } = await import('@/app/api/risk/route');
      const req = new Request('http://localhost/api/risk');
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it('projectId로 not_found를 반환한다', async () => {
      const { GET } = await import('@/app/api/risk/route');
      const req = new Request('http://localhost/api/risk?projectId=p1');
      const res = await GET(req);
      const body = await res.json();
      expect(body.status).toBe('not_found');
    });
  });

  describe('POST /api/commands', () => {
    it('Zod 검증 실패 시 400을 반환한다', async () => {
      const { POST } = await import('@/app/api/commands/route');
      const req = new Request('http://localhost/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('유효한 요청을 처리한다', async () => {
      const { POST } = await import('@/app/api/commands/route');
      const req = new Request('http://localhost/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'analyze' }),
      });
      const res = await POST(req);
      const body = await res.json();
      expect(body.status).toBe('queued');
    });

    it('params를 포함할 수 있다', async () => {
      const { POST } = await import('@/app/api/commands/route');
      const req = new Request('http://localhost/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'analyze', params: { projectId: 'p1' } }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/commands', () => {
    it('명령어 목록을 반환한다', async () => {
      const { GET } = await import('@/app/api/commands/route');
      const req = new Request('http://localhost/api/commands');
      const res = await GET(req);
      const body = await res.json();
      expect(body.commands).toBeDefined();
      expect(body.commands).toHaveLength(6);
    });

    it('analyze 명령어가 포함되어 있다', async () => {
      const { GET } = await import('@/app/api/commands/route');
      const req = new Request('http://localhost/api/commands');
      const res = await GET(req);
      const body = await res.json();
      const ids = body.commands.map((c: any) => c.id);
      expect(ids).toContain('analyze');
    });

    it('plan 명령어가 포함되어 있다', async () => {
      const { GET } = await import('@/app/api/commands/route');
      const req = new Request('http://localhost/api/commands');
      const res = await GET(req);
      const body = await res.json();
      const ids = body.commands.map((c: any) => c.id);
      expect(ids).toContain('plan');
    });
  });
});
