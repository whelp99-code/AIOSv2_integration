import { NextResponse } from 'next/server'

const F_AIOS_V3_URL = process.env.F_AIOS_V3_URL || 'http://localhost:3200'

export async function GET() {
  try {
    const response = await fetch(`${F_AIOS_V3_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`F-aios-v3 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('F-aios-v3 health check error:', error)
    return NextResponse.json(
      { error: 'F-aios-v3 서버에 연결할 수 없습니다.' },
      { status: 500 }
    )
  }
}
