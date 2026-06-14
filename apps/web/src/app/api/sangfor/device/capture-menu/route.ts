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
    const path = query
      ? `/api/device/capture-menu?${query}`
      : "/api/device/capture-menu";

    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse(
      "Sangfor device capture-menu proxy error",
      error,
      500,
    );
  }
}
