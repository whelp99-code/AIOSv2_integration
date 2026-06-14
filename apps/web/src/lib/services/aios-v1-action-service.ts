import { NextResponse } from 'next/server';
import { proxyAiosV1Json } from '../integrations/aios-v1-proxy';
import { isRealLogicEnabled } from './feature-flag';
import type { ZodSchema } from 'zod';

export interface ActionContext {
  userId?: string;
  sessionId?: string;
  resourceId?: string;
  idempotencyKey?: string;
}

export interface ActionInput<TBody> {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: TBody;
  query?: URLSearchParams;
  schema?: ZodSchema<TBody>;
  fallback: () => NextResponse | Promise<NextResponse>;
  actionContext?: ActionContext;
}

export class AiosV1ActionService {
  private idempotencyCache = new Map<string, { response: NextResponse; ts: number }>();
  private readonly IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

  private buildIdempotencyKey(ctx: ActionContext | undefined, path: string): string | null {
    if (!ctx?.idempotencyKey) return null;
    return `${ctx.userId ?? 'anon'}:${ctx.sessionId ?? 'no-session'}:${ctx.resourceId ?? 'no-resource'}:${path}:${ctx.idempotencyKey}`;
  }

  private getCached(key: string): NextResponse | null {
    const entry = this.idempotencyCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.IDEMPOTENCY_TTL_MS) {
      this.idempotencyCache.delete(key);
      return null;
    }
    return entry.response;
  }

  private setCache(key: string, response: NextResponse): void {
    this.idempotencyCache.set(key, { response, ts: Date.now() });
    if (this.idempotencyCache.size > 1000) {
      const oldestKey = this.idempotencyCache.keys().next().value;
      if (oldestKey) this.idempotencyCache.delete(oldestKey);
    }
  }

  async execute<TBody>(input: ActionInput<TBody>): Promise<NextResponse> {
    const { path, method = 'POST', body, query, schema, fallback, actionContext } = input;

    // Zod 검증
    if (schema && body !== undefined) {
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: '요청 데이터 검증 실패', details: parsed.error.flatten() },
          { status: 400 },
        );
      }
    }

    // 멱등성 키 체크
    const idempKey = this.buildIdempotencyKey(actionContext, path);
    if (idempKey) {
      const cached = this.getCached(idempKey);
      if (cached) return cached;
    }

    // Feature flag: false이면 fallback
    if (!isRealLogicEnabled()) {
      return await fallback();
    }

    // 실제 업스트림 호출
    try {
      const result = await proxyAiosV1Json({
        path,
        method,
        body,
        query,
      });

      if (result.ok) {
        const response = NextResponse.json(result.data, { status: result.status });
        if (idempKey) this.setCache(idempKey, response);
        return response;
      }

      return await fallback();
    } catch {
      return await fallback();
    }
  }
}

let _instance: AiosV1ActionService | null = null;

export function getAiosV1ActionService(): AiosV1ActionService {
  if (!_instance) _instance = new AiosV1ActionService();
  return _instance;
}

export function resetAiosV1ActionService(): void {
  _instance = null;
}
