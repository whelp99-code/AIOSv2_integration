import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3101'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')

    // AIOS v1에 github API가 없으므로 빈 데이터 반환
    return NextResponse.json({
      branches: [],
      commits: [],
      message: 'GitHub API가 아직 구현되지 않았습니다.'
    })
  } catch (error) {
    console.error('GitHub error:', error)
    return NextResponse.json(
      { error: 'GitHub 데이터를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}
