import { getVibeCodingOsUrl } from '../../../../lib/integrations/upstream-urls';
import { proxyUpstreamJson, upstreamErrorResponse, upstreamProxyResponse } from '../../../../lib/integrations/upstream-proxy';

export async function GET() {
  try {
    const result = await proxyUpstreamJson({
      baseUrl: getVibeCodingOsUrl(),
      path: '/api/projects',
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse('vibe-coding projects proxy error', error, 500);
  }
}
