import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let AiosV1ActionService: typeof import('@/lib/services/aios-v1-action-service').AiosV1ActionService;
let resetAiosV1ActionService: typeof import('@/lib/services/aios-v1-action-service').resetAiosV1ActionService;

beforeEach(async () => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'false';
  const mod = await import('@/lib/services/aios-v1-action-service');
  AiosV1ActionService = mod.AiosV1ActionService;
  resetAiosV1ActionService = mod.resetAiosV1ActionService;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC;
  resetAiosV1ActionService();
  vi.restoreAllMocks();
});

describe('AiosV1ActionService', () => {
  it('인스턴스를 생성할 수 있다', () => {
    const service = new AiosV1ActionService();
    expect(service).toBeDefined();
  });

  it('feature flag=false이면 fallback을 반환한다', async () => {
    const service = new AiosV1ActionService();
    const fallback = vi.fn().mockReturnValue({ status: 200 });
    const result = await service.execute({
      path: '/api/test',
      fallback,
    });
    expect(fallback).toHaveBeenCalled();
    expect(result).toEqual({ status: 200 });
  });

  it('Zod 검증 실패 시 400을 반환한다', async () => {
    const service = new AiosV1ActionService();
    const schema = z.object({ name: z.string().min(1) });
    const result = await service.execute({
      path: '/api/test',
      body: { name: '' },
      schema,
      fallback: vi.fn(),
    });
    expect(result.status).toBe(400);
  });

  it('Zod 검증 성공 시 fallback을 호출한다 (flag=false)', async () => {
    const service = new AiosV1ActionService();
    const schema = z.object({ name: z.string().min(1) });
    const fallback = vi.fn().mockReturnValue({ status: 200 });
    const result = await service.execute({
      path: '/api/test',
      body: { name: 'valid' },
      schema,
      fallback,
    });
    expect(fallback).toHaveBeenCalled();
  });

  it('멱등성 키가 있으면 동일 요청에 캐시된 응답을 반환한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'true';
    const service = new AiosV1ActionService();
    let callCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const ctx = { idempotencyKey: 'key-1', userId: 'u1' };

    await service.execute({
      path: '/api/test',
      method: 'POST',
      body: {},
      fallback: vi.fn(),
      actionContext: ctx,
    });

    await service.execute({
      path: '/api/test',
      method: 'POST',
      body: {},
      fallback: vi.fn(),
      actionContext: ctx,
    });

    // 캐시가 동작하므로 fetch는 1번만 호출
    expect(callCount).toBe(1);
  });

  it('다른 멱등성 키는 별도 요청으로 처리한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'true';
    const service = new AiosV1ActionService();
    let callCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await service.execute({
      path: '/api/test',
      method: 'POST',
      body: {},
      fallback: vi.fn(),
      actionContext: { idempotencyKey: 'key-1', userId: 'u1' },
    });

    await service.execute({
      path: '/api/test',
      method: 'POST',
      body: {},
      fallback: vi.fn(),
      actionContext: { idempotencyKey: 'key-2', userId: 'u1' },
    });

    expect(callCount).toBe(2);
  });

  it('멱등성 키 없으면 매번 fallback을 호출한다', async () => {
    const service = new AiosV1ActionService();
    const fallback = vi.fn().mockReturnValue({ status: 200 });

    await service.execute({ path: '/api/test', fallback });
    await service.execute({ path: '/api/test', fallback });

    expect(fallback).toHaveBeenCalledTimes(2);
  });

  it('스키마 없이도 동작한다', async () => {
    const service = new AiosV1ActionService();
    const fallback = vi.fn().mockReturnValue({ status: 200 });
    const result = await service.execute({
      path: '/api/test',
      body: { any: 'data' },
      fallback,
    });
    expect(fallback).toHaveBeenCalled();
  });

  it('feature flag=true이고 업스트림 성공 시 업스트림 응답을 반환한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'true';
    const service = new AiosV1ActionService();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const fallback = vi.fn();
    const result = await service.execute({
      path: '/api/test',
      method: 'POST',
      body: {},
      fallback,
    });

    expect(fallback).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
  });

  it('feature flag=true이고 업스트림 실패 시 fallback을 반환한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'true';
    const service = new AiosV1ActionService();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'fail' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const fallback = vi.fn().mockReturnValue({ status: 200 });
    const result = await service.execute({
      path: '/api/test',
      method: 'POST',
      body: {},
      fallback,
    });

    expect(fallback).toHaveBeenCalled();
  });

  it('feature flag=true이고 fetch 에러 시 fallback을 반환한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'true';
    const service = new AiosV1ActionService();

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'));

    const fallback = vi.fn().mockReturnValue({ status: 200 });
    const result = await service.execute({
      path: '/api/test',
      method: 'POST',
      body: {},
      fallback,
    });

    expect(fallback).toHaveBeenCalled();
  });

  it('GET 메서드를 지원한다', async () => {
    const service = new AiosV1ActionService();
    const fallback = vi.fn().mockReturnValue({ status: 200 });
    const result = await service.execute({
      path: '/api/test',
      method: 'GET',
      fallback,
    });
    expect(fallback).toHaveBeenCalled();
  });

  it('query 파라미터를 전달할 수 있다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'true';
    const service = new AiosV1ActionService();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const query = new URLSearchParams({ projectId: 'p1' });
    await service.execute({
      path: '/api/test',
      method: 'GET',
      query,
      fallback: vi.fn(),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('projectId=p1'),
      expect.any(Object),
    );
  });
});
