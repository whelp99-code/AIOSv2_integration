import { NextResponse } from 'next/server'
import { getFaiosV3Headers, getFaiosV3Url } from '../../../../lib/integrations/upstream-urls'
import { proxyUpstreamJson, upstreamErrorResponse, upstreamProxyResponse } from '../../../../lib/integrations/upstream-proxy'
import { createGatedHandler } from '../../../../lib/integrations/approval-middleware'

export async function GET() {
  try {
    const result = await proxyUpstreamJson({
      baseUrl: getFaiosV3Url(),
      path: '/api/workflows',
      headers: getFaiosV3Headers(),
    })
    return upstreamProxyResponse(result)
  } catch (error) {
    return upstreamErrorResponse('F-aios-v3 workflows error', error, 500)
  }
}

export const POST = createGatedHandler(
  'deploy',
  'faios-v3-workflow-execute',
  'F-aios-v3 워크플로우 실행',
  async (request) => {
    try {
      const body = await request.json()
      const { workflowId, input } = body

      const result = await proxyUpstreamJson({
        baseUrl: getFaiosV3Url(),
        path: `/api/workflows/${workflowId}/execute`,
        method: 'POST',
        body: { input },
        headers: getFaiosV3Headers(),
      })

      if (!result.ok) {
        return NextResponse.json(result.data, { status: result.status })
      }

      return NextResponse.json(result.data)
    } catch (error) {
      return upstreamErrorResponse('F-aios-v3 workflow execute error', error, 500)
    }
  }
)
