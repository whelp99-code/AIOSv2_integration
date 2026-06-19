import { NextResponse } from 'next/server'
import { proxyUpstreamJson } from '../../../../lib/integrations/upstream-proxy'
import { getMailIntelligenceHeaders, getMailIntelligenceUrl } from '../../../../lib/integrations/upstream-urls'

export async function GET() {
  try {
    const result = await proxyUpstreamJson({
      baseUrl: getMailIntelligenceUrl(),
      path: '/api/outlook/health',
      timeoutMs: 5000,
      headers: getMailIntelligenceHeaders(),
    })

    if (result.ok) {
      const upstream = result.data as Record<string, unknown>
      return NextResponse.json({
        ...upstream,
        proxy: 'Mail Intelligence health proxied successfully',
        upstream: getMailIntelligenceUrl(),
      })
    }

    return NextResponse.json(
      {
        status: 'unreachable',
        error: 'Mail Intelligence 서버에 연결할 수 없습니다.',
        upstream: getMailIntelligenceUrl(),
        details: `upstream returned ${result.status}`,
      },
      { status: 503 },
    )
  } catch (error) {
    const err = error as Error
    console.error('Mail Intelligence health check error:', err.message)
    return NextResponse.json(
      {
        status: 'unreachable',
        error: 'Mail Intelligence 서버에 연결할 수 없습니다.',
        upstream: getMailIntelligenceUrl(),
        details: err.message,
      },
      { status: 503 },
    )
  }
}
