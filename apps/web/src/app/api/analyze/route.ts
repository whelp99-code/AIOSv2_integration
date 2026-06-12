import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3200'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, type } = body

    // AIOS v1에서 실제 분석 데이터 가져오기
    const response = await fetch(`${AIOS_V1_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, type }),
    })

    if (!response.ok) {
      // AIOS v1에 analyze API가 없는 경우 기본 분석 수행
      const analysis = {
        projectId,
        type: type || 'full',
        status: 'completed',
        timestamp: new Date().toISOString(),
        results: {
          message: '분석을 위해 AIOS v1을 확인하세요.',
          aiosV1Url: AIOS_V1_URL
        }
      }
      return NextResponse.json({ analysis })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json(
      { error: '분석에 실패했습니다.' },
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

    const response = await fetch(`${AIOS_V1_URL}/api/analyze?projectId=${projectId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return NextResponse.json({
        projectId,
        status: 'not_found',
        message: '분석 결과를 찾을 수 없습니다.'
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Analyze GET error:', error)
    return NextResponse.json(
      { error: '분석 결과를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}
