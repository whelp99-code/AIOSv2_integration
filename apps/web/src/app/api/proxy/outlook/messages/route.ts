import { NextResponse } from 'next/server'
import { fetchMailIntelligence } from '@/lib/integrations/mail-intelligence-proxy'

export async function GET() {
  try {
    const { response, data } = await fetchMailIntelligence('/api/outlook/messages', {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      throw new Error(`Mail Intelligence API error: ${response.status}`)
    }

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
