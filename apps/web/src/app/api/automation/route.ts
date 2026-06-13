import { NextResponse } from 'next/server'
import { proxyAiosV1Json } from '../../../lib/integrations/aios-v1-proxy'
import { upstreamErrorResponse } from '../../../lib/integrations/upstream-proxy'
import { createGatedHandler } from '../../../lib/integrations/approval-middleware'

export async function GET() {
  try {
    const result = await proxyAiosV1Json({ path: '/api/actions' })
    return NextResponse.json(result.data, { status: result.status })
  } catch (error) {
    return upstreamErrorResponse('Automation proxy error', error)
  }
}

export const POST = createGatedHandler(
  'data-mutation',
  'automation-create',
  '자동화 액션 생성',
  async (request) => {
    try {
      const body = await request.json()
      const result = await proxyAiosV1Json({
        path: '/api/actions',
        method: 'POST',
        body,
      })
      return NextResponse.json(result.data, { status: result.status })
    } catch (error) {
      return upstreamErrorResponse('Automation create error', error)
    }
  }
)