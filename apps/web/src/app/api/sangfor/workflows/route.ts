import { getSangforMcpUrl } from '../../../../lib/integrations/upstream-urls';
import { proxyUpstreamJson, upstreamErrorResponse, upstreamProxyResponse } from '../../../../lib/integrations/upstream-proxy';
import { createGatedHandler } from '../../../../lib/integrations/approval-middleware';

export async function GET() {
  try {
    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path: '/api/workflows',
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse('Sangfor workflows proxy error', error, 500);
  }
}

export const POST = createGatedHandler(
  'deploy',
  'sangfor-workflow-execute',
  'Sangfor 워크플로우 실행',
  async (request) => {
    try {
      const body = await request.json();
      const { workflowId, approvalId: _approvalId, ...rest } = body as Record<string, unknown>;

      const path = workflowId
        ? `/api/workflows/${workflowId}/execute`
        : '/api/workflows';

      const result = await proxyUpstreamJson({
        baseUrl: getSangforMcpUrl(),
        path,
        method: 'POST',
        body: rest,
      });

      if (!result.ok) {
        return upstreamProxyResponse(result);
      }

      return upstreamProxyResponse(result);
    } catch (error) {
      return upstreamErrorResponse('Sangfor workflows execute error', error, 500);
    }
  },
);
