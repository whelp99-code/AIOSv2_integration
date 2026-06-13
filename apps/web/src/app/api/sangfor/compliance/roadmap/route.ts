import { type NextRequest } from "next/server";
import { getSangforMcpUrl } from "../../../../../lib/integrations/upstream-urls";
import {
  proxyUpstreamJson,
  upstreamErrorResponse,
  upstreamProxyResponse,
} from "../../../../../lib/integrations/upstream-proxy";

export async function POST(request: NextRequest) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path: "/api/compliance/roadmap",
      method: "POST",
      body,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse(
      "Sangfor compliance roadmap proxy error",
      error,
      500,
    );
  }
}
