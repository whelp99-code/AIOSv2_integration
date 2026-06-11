import { NextResponse } from 'next/server'

const F_AIOS_V3_URL = process.env.F_AIOS_V3_URL || 'http://localhost:3200'

export async function GET() {
  try {
    const response = await fetch(`${F_AIOS_V3_URL}/api/workflows`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`F-aios-v3 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('F-aios-v3 workflows error:', error)
    return NextResponse.json(
      { error: '워크플로우를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId, input } = body

    const response = await fetch(`${F_AIOS_V3_URL}/api/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    })

    if (!response.ok) {
      throw new Error(`F-aios-v3 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('F-aios-v3 workflow execute error:', error)
    return NextResponse.json(
      { error: '워크플로우 실행에 실패했습니다.' },
      { status: 500 }
    )
  }
}
