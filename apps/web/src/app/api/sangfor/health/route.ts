import { getSangforMcpUrl } from '../../../../lib/integrations/upstream-urls';
import { proxyUpstreamJson, upstreamErrorResponse, upstreamProxyResponse } from '../../../../lib/integrations/upstream-proxy';

export async function GET() {
  try {
    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path: '/api/system/health',
      timeoutMs: 5000,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse('Sangfor health proxy error', error, 503);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path: '/api/system/health',
      method: 'POST',
      body,
      timeoutMs: 5000,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse('Sangfor health proxy error', error, 503);
  }
}
