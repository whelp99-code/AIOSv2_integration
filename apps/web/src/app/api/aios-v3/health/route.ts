import { NextResponse } from 'next/server'

const F_AIOS_V3_URL = process.env.F_AIOS_V3_URL || 'http://localhost:3200'

export async function GET() {
  try {
    const response = await fetch(`${F_AIOS_V3_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      throw new Error(`F-aios-v3 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json({
      ...data,
      proxy: 'F-aios-v3 health proxied successfully',
      upstream: F_AIOS_V3_URL,
    })
  } catch (error) {
    const err = error as Error
    console.error('F-aios-v3 health check error:', err.message)
    return NextResponse.json(
      {
        status: 'unreachable',
        error: 'F-aios-v3 서버에 연결할 수 없습니다.',
        upstream: F_AIOS_V3_URL,
        details: err.message,
      },
      { status: 503 }
    )
  }
}
