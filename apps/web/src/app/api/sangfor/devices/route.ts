import { NextResponse } from 'next/server'
import { getSangforMcpUrl } from '../../../../lib/integrations/upstream-urls'
import { proxyUpstreamJson, upstreamErrorResponse, upstreamProxyResponse } from '../../../../lib/integrations/upstream-proxy'
import { createGatedHandler } from '../../../../lib/integrations/approval-middleware'

export async function GET(request: Request) {
  try {
    const { search } = new URL(request.url)
    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path: `/api/devices${search}`,
    })
    return upstreamProxyResponse(result)
  } catch (error) {
    return upstreamErrorResponse('Sangfor devices proxy error', error, 500)
  }
}

export const POST = createGatedHandler(
  'deploy',
  'sangfor-devices-action',
  'Sangfor 디바이스 관리',
  async (request) => {
    try {
      const body = await request.json()
      const { approvalId: _approvalId, ...rest } = body as Record<string, unknown>

      const result = await proxyUpstreamJson({
        baseUrl: getSangforMcpUrl(),
        path: '/api/devices',
        method: 'POST',
        body: rest,
      })

      if (!result.ok) {
        return NextResponse.json(result.data, { status: result.status })
      }

      return NextResponse.json(result.data)
    } catch (error) {
      return upstreamErrorResponse('Sangfor devices action error', error, 500)
    }
  },
)
