import { NextResponse } from 'next/server';

export interface ProxyUpstreamOptions {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  headers?: HeadersInit;
}

export interface ProxyUpstreamResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

export async function proxyUpstreamJson<T = unknown>(
  options: ProxyUpstreamOptions,
): Promise<ProxyUpstreamResult<T>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${normalizeBaseUrl(options.baseUrl)}${options.path.startsWith('/') ? options.path : `/${options.path}`}`;
  const method = options.method ?? 'GET';

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  const response = await fetchImpl(url, {
    method,
    headers,
    body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(options.body ?? {}),
    signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
  });

  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    data = {} as T;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export function upstreamErrorResponse(
  label: string,
  error: unknown,
  status = 500,
): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${label}:`, message);
  return NextResponse.json(
    {
      error: label,
      details: message,
    },
    { status },
  );
}

export function upstreamProxyResponse<T>(result: ProxyUpstreamResult<T>): NextResponse {
  return NextResponse.json(result.data, { status: result.status });
}
