import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3101'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, requirements } = body

    // AIOS v1에서 실제 계획 데이터 가져오기
    const response = await fetch(`${AIOS_V1_URL}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, requirements }),
    })

    if (!response.ok) {
      // AIOS v1에 plan API가 없는 경우 기본 계획 반환
      const plan = {
        projectId,
        status: 'completed',
        timestamp: new Date().toISOString(),
        phases: [
          {
            id: 1,
            name: 'Foundation',
            duration: '1-2 weeks',
            tasks: ['Setup monorepo', 'Configure tools', 'Create base structure']
          },
          {
            id: 2,
            name: 'Core Development',
            duration: '2-3 weeks',
            tasks: ['Implement domain models', 'Create services', 'Build API']
          },
          {
            id: 3,
            name: 'Integration',
            duration: '1-2 weeks',
            tasks: ['Connect APIs', 'Test integration', 'Deploy']
          }
        ],
        message: '계획을 위해 AIOS v1을 확인하세요.',
        aiosV1Url: AIOS_V1_URL
      }
      return NextResponse.json({ plan })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Plan error:', error)
    return NextResponse.json(
      { error: '계획 수립에 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const response = await fetch(`${AIOS_V1_URL}/api/plan?projectId=${projectId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return NextResponse.json({
        projectId,
        status: 'not_found',
        message: '계획을 찾을 수 없습니다.'
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Plan GET error:', error)
    return NextResponse.json(
      { error: '계획을 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}
