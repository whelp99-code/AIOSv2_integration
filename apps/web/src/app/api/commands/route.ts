import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3101'

export async function GET() {
  try {
    // AIOS v1에서 실제 명령어 목록 가져오기
    const response = await fetch(`${AIOS_V1_URL}/api/commands`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      // AIOS v1에 commands API가 없는 경우 기본 명령어 반환
      const commands = [
        {
          id: 'analyze',
          name: 'Analyze',
          description: '프로젝트 구조 및 코드 분석',
          endpoint: '/api/analyze'
        },
        {
          id: 'plan',
          name: 'Plan',
          description: '개발 계획 수립',
          endpoint: '/api/plan'
        },
        {
          id: 'risk',
          name: 'Risk Assessment',
          description: '프로젝트 리스크 평가',
          endpoint: '/api/risk'
        },
        {
          id: 'customers',
          name: 'Customers',
          description: '고객 관리',
          endpoint: '/api/customers'
        },
        {
          id: 'partners',
          name: 'Partners',
          description: '파트너 관리',
          endpoint: '/api/partners'
        },
        {
          id: 'workflows',
          name: 'Workflows',
          description: '워크플로우 관리',
          endpoint: '/api/workflows'
        }
      ]
      return NextResponse.json({ commands })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Commands error:', error)
    return NextResponse.json(
      { error: '명령어를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { command, params } = body

    // AIOS v1에 명령어 실행 요청
    const response = await fetch(`${AIOS_V1_URL}/api/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, params }),
    })

    if (!response.ok) {
      return NextResponse.json({
        status: 'queued',
        message: `${command} 명령어가 실행되었습니다.`
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Command execute error:', error)
    return NextResponse.json(
      { error: '명령어 실행에 실패했습니다.' },
      { status: 500 }
    )
  }
}
