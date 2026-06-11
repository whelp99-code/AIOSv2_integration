import { NextResponse } from 'next/server'

const F_AIOS_V3_URL = process.env.F_AIOS_V3_URL || 'http://localhost:3200'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    const url = query
      ? `${F_AIOS_V3_URL}/api/knowledge/search?q=${encodeURIComponent(query)}`
      : `${F_AIOS_V3_URL}/api/knowledge`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`F-aios-v3 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('F-aios-v3 knowledge error:', error)
    return NextResponse.json(
      { error: '지식 그래프를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(`${F_AIOS_V3_URL}/api/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`F-aios-v3 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('F-aios-v3 knowledge create error:', error)
    return NextResponse.json(
      { error: '지식 그래프 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
