import { NextResponse } from 'next/server'
import { proxyUpstreamJson, upstreamErrorResponse, upstreamProxyResponse } from '../../../../lib/integrations/upstream-proxy'
import { getMailIntelligenceHeaders, getMailIntelligenceUrl } from '../../../../lib/integrations/upstream-urls'
import { createGatedHandler } from '../../../../lib/integrations/approval-middleware'

export async function GET(request: Request) {
  try {
    const { search } = new URL(request.url)
    const result = await proxyUpstreamJson({
      baseUrl: getMailIntelligenceUrl(),
      path: `/api/outlook/analyze${search}`,
      headers: getMailIntelligenceHeaders(),
    })
    return upstreamProxyResponse(result)
  } catch (error) {
    return upstreamErrorResponse('Mail Intelligence analyze error', error, 500)
  }
}

export const POST = createGatedHandler(
  'data-mutation',
  'mail-analyze',
  'Mail Intelligence 메일 분석',
  async (request) => {
    try {
      const body = await request.json()
      const { approvalId: _approvalId, ...rest } = body as Record<string, unknown>

      const result = await proxyUpstreamJson({
        baseUrl: getMailIntelligenceUrl(),
        path: '/api/outlook/analyze',
        method: 'POST',
        body: rest,
        headers: getMailIntelligenceHeaders(),
      })

      if (!result.ok) {
        return NextResponse.json(result.data, { status: result.status })
      }

      return NextResponse.json(result.data)
    } catch (error) {
      return upstreamErrorResponse('Mail Intelligence analyze error', error, 500)
    }
  },
)
