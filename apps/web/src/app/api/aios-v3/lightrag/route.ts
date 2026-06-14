import { NextResponse } from "next/server";
import { getFaiosV3Url } from "../../../../lib/integrations/upstream-urls";
import {
  proxyUpstreamJson,
  upstreamErrorResponse,
  upstreamProxyResponse,
} from "../../../../lib/integrations/upstream-proxy";
import { createGatedHandler } from "../../../../lib/integrations/approval-middleware";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const path = query
      ? `/api/lightrag/search?q=${encodeURIComponent(query)}`
      : "/api/lightrag";

    const result = await proxyUpstreamJson({
      baseUrl: getFaiosV3Url(),
      path,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse("F-aios-v3 lightrag error", error, 500);
  }
}

export const POST = createGatedHandler(
  "data-mutation",
  "faios-v3-lightrag-ingest",
  "F-aios-v3 LightRAG 문서 수집",
  async (request) => {
    try {
      const rawBody = await request.json();
      const { approvalId: _approvalId, ...body } = rawBody as Record<
        string,
        unknown
      >;
      const result = await proxyUpstreamJson({
        baseUrl: getFaiosV3Url(),
        path: "/api/lightrag/ingest",
        method: "POST",
        body,
      });

      if (!result.ok) {
        return NextResponse.json(result.data, { status: result.status });
      }

      return NextResponse.json(result.data);
    } catch (error) {
      return upstreamErrorResponse(
        "F-aios-v3 lightrag ingest error",
        error,
        500,
      );
    }
  },
);
