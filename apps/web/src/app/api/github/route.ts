import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3200'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')

    // AIOS v1의 connectors API를 GitHub 연동으로 활용
    const response = await fetch(`${AIOS_V1_URL}/api/connectors`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`AIOS v1 API error: ${response.status}`)
    }

    const data = await response.json()
    
    // connectors를 GitHub 형식으로 변환
    const connectors = data.connectors || data || []
    const githubConnector = connectors.find((c: any) => 
      c.type === 'github' || c.name?.toLowerCase().includes('github')
    )

    return NextResponse.json({
      branches: githubConnector?.branches || [],
      commits: githubConnector?.commits || [],
      connectors: connectors,
      message: 'GitHub 연동을 위해 connectors API를 사용합니다.'
    })
  } catch (error) {
    console.error('GitHub error:', error)
    return NextResponse.json(
      { error: 'GitHub 데이터를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}
