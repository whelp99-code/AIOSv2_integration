import { NextResponse } from 'next/server'
import { proxyUpstreamJson } from '../../../../lib/integrations/upstream-proxy'
import { getFaiosV3Headers, getFaiosV3Url } from '../../../../lib/integrations/upstream-urls'

export async function GET() {
  try {
    const result = await proxyUpstreamJson({
      baseUrl: getFaiosV3Url(),
      path: '/health',
      timeoutMs: 5000,
      headers: getFaiosV3Headers(),
    })

    if (result.ok) {
      const upstream = result.data as Record<string, unknown>
      return NextResponse.json({
        ...upstream,
        proxy: 'F-aios-v3 health proxied successfully',
        upstream: getFaiosV3Url(),
      })
    }

    return NextResponse.json(
      {
        status: 'unreachable',
        error: 'F-aios-v3 서버에 연결할 수 없습니다.',
        upstream: getFaiosV3Url(),
        details: `upstream returned ${result.status}`,
      },
      { status: 503 },
    )
  } catch (error) {
    const err = error as Error
    console.error('F-aios-v3 health check error:', err.message)
    return NextResponse.json(
      {
        status: 'unreachable',
        error: 'F-aios-v3 서버에 연결할 수 없습니다.',
        upstream: getFaiosV3Url(),
        details: err.message,
      },
      { status: 503 },
    )
  }
}
