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
    const { search } = new URL(request.url);
    const result = await proxyUpstreamJson({
      baseUrl: getFaiosV3Url(),
      path: `/api/orchestrator${search}`,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse("F-aios-v3 orchestrator error", error, 500);
  }
}

export const POST = createGatedHandler(
  "deploy",
  "faios-v3-orchestrator-run",
  "F-aios-v3 오케스트레이터 실행",
  async (request) => {
    try {
      const rawBody = await request.json();
      const { approvalId: _approvalId, ...body } = rawBody as Record<
        string,
        unknown
      >;
      const result = await proxyUpstreamJson({
        baseUrl: getFaiosV3Url(),
        path: "/api/orchestrator/run",
        method: "POST",
        body,
      });

      if (!result.ok) {
        return NextResponse.json(result.data, { status: result.status });
      }

      return NextResponse.json(result.data);
    } catch (error) {
      return upstreamErrorResponse(
        "F-aios-v3 orchestrator run error",
        error,
        500,
      );
    }
  },
);
