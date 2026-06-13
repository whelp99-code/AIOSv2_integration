import { NextResponse } from 'next/server'
import { proxyAiosV1Json } from '../../../lib/integrations/aios-v1-proxy'
import { upstreamErrorResponse, upstreamProxyResponse } from '../../../lib/integrations/upstream-proxy'
import { createGatedHandler } from '../../../lib/integrations/approval-middleware'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const path = query
      ? `/api/knowledge/search?q=${encodeURIComponent(query)}`
      : '/api/knowledge'
    const result = await proxyAiosV1Json({ path })
    return upstreamProxyResponse(result)
  } catch (error) {
    return upstreamErrorResponse('Knowledge proxy error', error)
  }
}

export const POST = createGatedHandler(
  'data-mutation',
  'knowledge-create',
  '지식 베이스 생성',
  async (request) => {
    try {
      const body = await request.json()
      const result = await proxyAiosV1Json({
        path: '/api/knowledge',
        method: 'POST',
        body,
      })
      return upstreamProxyResponse(result)
    } catch (error) {
      return upstreamErrorResponse('Knowledge create error', error)
    }
  }
)