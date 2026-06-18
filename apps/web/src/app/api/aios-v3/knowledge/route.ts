import { NextResponse } from 'next/server'
import { getFaiosV3Headers, getFaiosV3Url } from '../../../../lib/integrations/upstream-urls'
import { proxyUpstreamJson, upstreamErrorResponse, upstreamProxyResponse } from '../../../../lib/integrations/upstream-proxy'
import { createGatedHandler } from '../../../../lib/integrations/approval-middleware'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const path = query
      ? `/api/knowledge/search?q=${encodeURIComponent(query)}`
      : '/api/knowledge'

    const result = await proxyUpstreamJson({
      baseUrl: getFaiosV3Url(),
      path,
      headers: getFaiosV3Headers(),
    })
    return upstreamProxyResponse(result)
  } catch (error) {
    return upstreamErrorResponse('F-aios-v3 knowledge error', error, 500)
  }
}

export const POST = createGatedHandler(
  'data-mutation',
  'faios-v3-knowledge-create',
  'F-aios-v3 지식 베이스 생성',
  async (request) => {
    try {
      const body = await request.json()
      const result = await proxyUpstreamJson({
        baseUrl: getFaiosV3Url(),
        path: '/api/knowledge',
        method: 'POST',
        body,
        headers: getFaiosV3Headers(),
      })

      if (!result.ok) {
        return NextResponse.json(result.data, { status: result.status })
      }

      return NextResponse.json(result.data)
    } catch (error) {
      return upstreamErrorResponse('F-aios-v3 knowledge create error', error, 500)
    }
  }
)
