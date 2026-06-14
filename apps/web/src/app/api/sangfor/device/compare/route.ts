import { type NextRequest } from "next/server";
import { getSangforMcpUrl } from "../../../../../lib/integrations/upstream-urls";
import {
  proxyUpstreamJson,
  upstreamErrorResponse,
  upstreamProxyResponse,
} from "../../../../../lib/integrations/upstream-proxy";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const path = query ? `/api/device/compare?${query}` : "/api/device/compare";

    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse(
      "Sangfor device compare proxy error",
      error,
      500,
    );
  }
}
