import { getAiosV1Url } from './upstream-urls';
import { proxyUpstreamJson, type ProxyUpstreamResult } from './upstream-proxy';

export interface ProxyAiosV1Options {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: URLSearchParams | string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function buildPath(path: string, query?: URLSearchParams | string): string {
  if (!query) return path;
  const queryString = typeof query === 'string' ? query : query.toString();
  if (!queryString) return path;
  return `${path}?${queryString}`;
}

export async function proxyAiosV1Json<T = unknown>(
  options: ProxyAiosV1Options,
): Promise<ProxyUpstreamResult<T>> {
  return proxyUpstreamJson<T>({
    baseUrl: getAiosV1Url(),
    path: buildPath(options.path, options.query),
    method: options.method,
    body: options.body,
    timeoutMs: options.timeoutMs,
    fetchImpl: options.fetchImpl,
  });
}
