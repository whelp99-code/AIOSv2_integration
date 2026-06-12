import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3200'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, scope } = body

    // AIOS v1에서 실제 리스크 데이터 가져오기
    const response = await fetch(`${AIOS_V1_URL}/api/risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, scope }),
    })

    if (!response.ok) {
      // AIOS v1에 risk API가 없는 경우 기본 리스크 평가 반환
      const riskAssessment = {
        projectId,
        scope: scope || 'full',
        status: 'completed',
        timestamp: new Date().toISOString(),
        risks: [
          {
            id: 'risk-1',
            category: 'technical',
            severity: 'medium',
            probability: 'low',
            description: '의존성 취약점',
            mitigation: '정기적인 의존성 업데이트'
          },
          {
            id: 'risk-2',
            category: 'schedule',
            severity: 'low',
            probability: 'medium',
            description: '일정 지연 가능성',
            mitigation: '정기적인 진행 상황 확인'
          }
        ],
        message: '리스크 평가를 위해 AIOS v1을 확인하세요.',
        aiosV1Url: AIOS_V1_URL
      }
      return NextResponse.json({ riskAssessment })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Risk error:', error)
    return NextResponse.json(
      { error: '리스크 평가에 실패했습니다.' },
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

    const response = await fetch(`${AIOS_V1_URL}/api/risk?projectId=${projectId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return NextResponse.json({
        projectId,
        status: 'not_found',
        message: '리스크 평가를 찾을 수 없습니다.'
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Risk GET error:', error)
    return NextResponse.json(
      { error: '리스크 평가를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}
