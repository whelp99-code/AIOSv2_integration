import { NextResponse } from 'next/server'
import { proxyAiosV1Json } from '../../../lib/integrations/aios-v1-proxy'
import { getAiosV1Url } from '../../../lib/integrations/upstream-urls'
import { createGatedHandler } from '../../../lib/integrations/approval-middleware'

export const POST = createGatedHandler(
  'deploy',
  'analyze-execute',
  '프로젝트 분석 실행',
  async (request) => {
    let projectId: string | undefined
    let type: string | undefined

    try {
      const body = await request.json()
      projectId = body.projectId
      type = body.type
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    try {
      const result = await proxyAiosV1Json({
        path: '/api/analyze',
        method: 'POST',
        body: { projectId, type },
      })

      if (result.ok) {
        return NextResponse.json(result.data, { status: result.status })
      }

      const analysis = {
        projectId,
        type: type || 'full',
        status: 'completed',
        timestamp: new Date().toISOString(),
        results: {
          message: '분석을 위해 AIOS v1을 확인하세요.',
          aiosV1Url: getAiosV1Url(),
        },
      }
      return NextResponse.json({ analysis })
    } catch (error) {
      console.error('Analyze error:', error)
      const analysis = {
        projectId,
        type: type || 'full',
        status: 'completed',
        timestamp: new Date().toISOString(),
        results: {
          message: '분석을 위해 AIOS v1을 확인하세요.',
          aiosV1Url: getAiosV1Url(),
        },
      }
      return NextResponse.json({ analysis })
    }
  }
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const result = await proxyAiosV1Json({
      path: '/api/analyze',
      query: searchParams,
    })

    if (result.ok) {
      return NextResponse.json(result.data, { status: result.status })
    }

    return NextResponse.json({
      projectId,
      status: 'not_found',
      message: '분석 결과를 찾을 수 없습니다.',
    })
  } catch (error) {
    console.error('Analyze GET error:', error)
    const { searchParams } = new URL(request.url)
    return NextResponse.json({
      projectId: searchParams.get('projectId'),
      status: 'not_found',
      message: '분석 결과를 찾을 수 없습니다.',
    })
  }
}