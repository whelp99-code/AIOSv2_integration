import { NextResponse } from 'next/server'

const MAIL_INTELLIGENCE_URL = process.env.MAIL_INTELLIGENCE_URL || 'http://localhost:10200'

export async function GET() {
  try {
    const response = await fetch(`${MAIL_INTELLIGENCE_URL}/api/outlook/messages`, {
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
    console.error('Outlook messages proxy error:', error)
    return NextResponse.json(
      { 
        messages: [],
        error: '메일 데이터를 가져올 수 없습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
