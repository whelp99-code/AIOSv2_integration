import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3101'

export async function GET() {
  try {
    // AIOS v1의 actions API를 automation으로 활용
    const response = await fetch(`${AIOS_V1_URL}/api/actions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`AIOS v1 API error: ${response.status}`)
    }

    const data = await response.json()
    
    // actions를 automation workflows 형식으로 변환
    const workflows = (data.actions || data || []).map((action: any) => ({
      id: action.id || action.name,
      name: action.name || action.title,
      description: action.description,
      status: action.status || 'active',
      type: 'automation',
      createdAt: action.createdAt,
      updatedAt: action.updatedAt
    }))

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error('Automation error:', error)
    return NextResponse.json(
      { error: '자동화 워크플로우를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId, input } = body

    // AIOS v1의 actions API로 자동화 실행
    const response = await fetch(`${AIOS_V1_URL}/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: workflowId,
        params: input
      }),
    })

    if (!response.ok) {
      throw new Error(`AIOS v1 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Automation execute error:', error)
    return NextResponse.json(
      { error: '자동화 실행에 실패했습니다.' },
      { status: 500 }
    )
  }
}
