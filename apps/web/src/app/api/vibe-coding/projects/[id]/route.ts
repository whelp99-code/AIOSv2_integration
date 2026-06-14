import { getVibeCodingOsUrl } from "../../../../../lib/integrations/upstream-urls";
import {
  proxyUpstreamJson,
  upstreamErrorResponse,
  upstreamProxyResponse,
} from "../../../../../lib/integrations/upstream-proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const encodedId = encodeURIComponent(id);

    const result = await proxyUpstreamJson({
      baseUrl: getVibeCodingOsUrl(),
      path: `/api/projects/${encodedId}`,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse(
      "vibe-coding project detail proxy error",
      error,
      500,
    );
  }
}
