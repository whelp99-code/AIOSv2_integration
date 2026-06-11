import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3101'

export async function GET() {
  try {
    // AIOS v1에 workflows API가 없으므로 빈 배열 반환
    // 향후 AIOS v1에 workflows API가 추가되면 프록시 연결
    return NextResponse.json({ workflows: [] })
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
    
    // AIOS v1에 workflows API가 없으므로 에러 반환
    return NextResponse.json(
      { error: '워크플로우 API가 아직 구현되지 않았습니다.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Workflow create error:', error)
    return NextResponse.json(
      { error: '워크플로우 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
