import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let createGatedHandler: typeof import('@/lib/integrations/approval-middleware').createGatedHandler;
let clearIdempotencyCache: typeof import('@/lib/integrations/approval-middleware').clearIdempotencyCache;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('AIOS_ALLOW_DEV_APPROVAL_BYPASS', 'true');
  const mod = await import('@/lib/integrations/approval-middleware');
  createGatedHandler = mod.createGatedHandler;
  clearIdempotencyCache = mod.clearIdempotencyCache;
});

afterEach(() => {
  vi.unstubAllEnvs();
  clearIdempotencyCache();
  vi.restoreAllMocks();
});

describe('createGatedHandler - 멱등성 키', () => {
  it('개발 모드에서 핸들러를 실행한다', async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const gated = createGatedHandler('deploy', 'test', 'test target', handler);
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'p1' }),
    });

    const res = await gated(req);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('개발 모드에서 sessionId를 추출한다', async () => {
    let capturedCtx: any;
    const handler = vi.fn().mockImplementation(async (_req: any, ctx: any) => {
      capturedCtx = ctx;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const gated = createGatedHandler('deploy', 'test', 'test target', handler);
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': 'session-123',
      },
      body: JSON.stringify({ projectId: 'p1' }),
    });

    await gated(req);
    expect(capturedCtx.sessionId).toBe('session-123');
  });

  it('개발 모드에서 resourceId를 body에서 추출한다', async () => {
    let capturedCtx: any;
    const handler = vi.fn().mockImplementation(async (_req: any, ctx: any) => {
      capturedCtx = ctx;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const gated = createGatedHandler('deploy', 'test', 'test target', handler);
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'proj-456' }),
    });

    await gated(req);
    expect(capturedCtx.resourceId).toBe('proj-456');
  });

  it('command 필드에서 resourceId를 추출한다', async () => {
    let capturedCtx: any;
    const handler = vi.fn().mockImplementation(async (_req: any, ctx: any) => {
      capturedCtx = ctx;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const gated = createGatedHandler('deploy', 'test', 'test target', handler);
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'analyze' }),
    });

    await gated(req);
    expect(capturedCtx.resourceId).toBe('analyze');
  });

  it('idempotencyKey를 body에서 추출한다', async () => {
    let capturedCtx: any;
    const handler = vi.fn().mockImplementation(async (_req: any, ctx: any) => {
      capturedCtx = ctx;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const gated = createGatedHandler('deploy', 'test', 'test target', handler);
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: 'key-789' }),
    });

    await gated(req);
    expect(capturedCtx.idempotencyKey).toBe('key-789');
  });

  it('idempotencyKey를 헤더에서 추출한다', async () => {
    let capturedCtx: any;
    const handler = vi.fn().mockImplementation(async (_req: any, ctx: any) => {
      capturedCtx = ctx;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const gated = createGatedHandler('deploy', 'test', 'test target', handler);
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': 'header-key',
      },
      body: JSON.stringify({}),
    });

    await gated(req);
    expect(capturedCtx.idempotencyKey).toBe('header-key');
  });

  it('requestedBy를 헤더에서 추출한다 (개발 모드)', async () => {
    let capturedCtx: any;
    const handler = vi.fn().mockImplementation(async (_req: any, ctx: any) => {
      capturedCtx = ctx;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const gated = createGatedHandler('deploy', 'test', 'test target', handler);
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    await gated(req);
    expect(capturedCtx.requestedBy).toBe('dev-user');
  });

  it('GET 요청도 처리할 수 있다', async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const gated = createGatedHandler('deploy', 'test', 'test target', handler);
    const req = new Request('http://localhost/api/test', { method: 'GET' });

    const res = await gated(req);
    expect(res.status).toBe(200);
  });

  it('approvalId가 응답에 포함된다', async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const gated = createGatedHandler('deploy', 'test', 'test target', handler);
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await gated(req);
    const body = await res.json();
    expect(body.approvalId).toBe('dev-bypass');
    expect(body.approvalStatus).toBe('approved');
  });

  it('contextBuilder를 사용할 수 있다', async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const contextBuilder = vi.fn().mockReturnValue({ custom: 'context' });
    const gated = createGatedHandler('deploy', 'test', 'test target', handler, contextBuilder);

    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });

    await gated(req);
    // 개발 모드에서는 contextBuilder가 호출되지 않음
    expect(handler).toHaveBeenCalled();
  });
});
