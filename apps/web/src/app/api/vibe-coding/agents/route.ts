import { type NextRequest } from "next/server";
import { getVibeCodingOsUrl } from "../../../../lib/integrations/upstream-urls";
import {
  proxyUpstreamJson,
  upstreamErrorResponse,
  upstreamProxyResponse,
} from "../../../../lib/integrations/upstream-proxy";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const path = query ? `/api/agents?${query}` : "/api/agents";

    const result = await proxyUpstreamJson({
      baseUrl: getVibeCodingOsUrl(),
      path,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse("vibe-coding agents proxy error", error, 500);
  }
}
