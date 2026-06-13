import { getSangforMcpUrl } from '../../../../lib/integrations/upstream-urls';
import { proxyUpstreamJson, upstreamErrorResponse, upstreamProxyResponse } from '../../../../lib/integrations/upstream-proxy';

export async function GET() {
  try {
    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path: '/api/system/health',
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse('Sangfor health proxy error', error, 503);
  }
}
