import { NextResponse } from 'next/server'
import { proxyAiosV1Json } from '../../../lib/integrations/aios-v1-proxy'
import { upstreamErrorResponse, upstreamProxyResponse } from '../../../lib/integrations/upstream-proxy'
import { createGatedHandler } from '../../../lib/integrations/approval-middleware'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const result = await proxyAiosV1Json({
      path: '/api/tasks',
      query: searchParams.get('status') ? searchParams : undefined,
    })
    return upstreamProxyResponse(result)
  } catch (error) {
    return upstreamErrorResponse('Tasks proxy error', error)
  }
}

export const POST = createGatedHandler(
  'data-mutation',
  'task-create',
  '작업 생성',
  async (request) => {
    try {
      const body = await request.json()
      const result = await proxyAiosV1Json({
        path: '/api/tasks',
        method: 'POST',
        body,
      })
      return upstreamProxyResponse(result)
    } catch (error) {
      return upstreamErrorResponse('Task create error', error)
    }
  }
)