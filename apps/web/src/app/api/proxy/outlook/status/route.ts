import { NextResponse } from 'next/server'

const MAIL_INTELLIGENCE_URL = process.env.MAIL_INTELLIGENCE_URL || 'http://localhost:3010'

export async function GET() {
  try {
    const response = await fetch(`${MAIL_INTELLIGENCE_URL}/api/outlook/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Mail Intelligence API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Outlook status proxy error:', error)
    return NextResponse.json(
      { 
        connected: false,
        error: 'Mail Intelligence 서버에 연결할 수 없습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
