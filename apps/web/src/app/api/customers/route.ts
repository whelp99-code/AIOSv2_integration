import { getAiosV1Url } from '../../../lib/integrations/upstream-urls';
import {
  proxyUpstreamJson,
  upstreamErrorResponse,
  upstreamProxyResponse,
} from '../../../lib/integrations/upstream-proxy';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = `/api/customers${url.search}`;

    const result = await proxyUpstreamJson<unknown[]>({
      baseUrl: getAiosV1Url(),
      path,
    });

    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse('Proxy error', error, 502);
  }
}
