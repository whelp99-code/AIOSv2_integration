import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3200'

export async function GET() {
  try {
    // AIOS v1의 tasks API를 workflows로 활용
    const response = await fetch(`${AIOS_V1_URL}/api/tasks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`AIOS v1 API error: ${response.status}`)
    }

    const data = await response.json()
    
    // tasks를 workflows 형식으로 변환
    const workflows = (data.tasks || []).map((task: any) => ({
      id: task.id,
      name: task.title,
      description: task.description,
      status: task.status,
      type: 'task',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }))

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error('Workflows error:', error)
    return NextResponse.json(
      { error: '워크플로우를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description } = body

    // AIOS v1의 tasks API로 워크플로우 생성
    const response = await fetch(`${AIOS_V1_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: name,
        description,
        status: 'BACKLOG',
        priority: 'MEDIUM'
      }),
    })

    if (!response.ok) {
      throw new Error(`AIOS v1 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Workflow create error:', error)
    return NextResponse.json(
      { error: '워크플로우 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
