import {
  getFaiosV3Headers,
  getFaiosV3Url,
} from "../../../../lib/integrations/upstream-urls";
import {
  proxyUpstreamJson,
  upstreamErrorResponse,
  upstreamProxyResponse,
} from "../../../../lib/integrations/upstream-proxy";

export async function GET(request: Request) {
  try {
    const { search } = new URL(request.url);
    const result = await proxyUpstreamJson({
      baseUrl: getFaiosV3Url(),
      path: `/api/monitoring${search}`,
      headers: getFaiosV3Headers(),
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse("F-aios-v3 monitoring error", error, 500);
  }
}
