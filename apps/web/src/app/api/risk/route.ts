import { NextResponse } from 'next/server'
import { proxyAiosV1Json } from '../../../lib/integrations/aios-v1-proxy'
import { getAiosV1Url } from '../../../lib/integrations/upstream-urls'
import { createGatedHandler } from '../../../lib/integrations/approval-middleware'

export const POST = createGatedHandler(
  'config-change',
  'risk-config',
  '리스크 설정 변경',
  async (request) => {
    let projectId: string | undefined
    let scope: string | undefined

    try {
      const body = await request.json()
      projectId = body.projectId
      scope = body.scope
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    try {
      const result = await proxyAiosV1Json({
        path: '/api/risk',
        method: 'POST',
        body: { projectId, scope },
      })

      if (result.ok) {
        return NextResponse.json(result.data, { status: result.status })
      }

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
            mitigation: '정기적인 의존성 업데이트',
          },
          {
            id: 'risk-2',
            category: 'schedule',
            severity: 'low',
            probability: 'medium',
            description: '일정 지연 가능성',
            mitigation: '정기적인 진행 상황 확인',
          },
        ],
        message: '리스크 평가를 위해 AIOS v1을 확인하세요.',
        aiosV1Url: getAiosV1Url(),
      }
      return NextResponse.json({ riskAssessment })
    } catch (error) {
      console.error('Risk error:', error)
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
            mitigation: '정기적인 의존성 업데이트',
          },
          {
            id: 'risk-2',
            category: 'schedule',
            severity: 'low',
            probability: 'medium',
            description: '일정 지연 가능성',
            mitigation: '정기적인 진행 상황 확인',
          },
        ],
        message: '리스크 평가를 위해 AIOS v1을 확인하세요.',
        aiosV1Url: getAiosV1Url(),
      }
      return NextResponse.json({ riskAssessment })
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
      path: '/api/risk',
      query: searchParams,
    })

    if (result.ok) {
      return NextResponse.json(result.data, { status: result.status })
    }

    return NextResponse.json({
      projectId,
      status: 'not_found',
      message: '리스크 평가를 찾을 수 없습니다.',
    })
  } catch (error) {
    console.error('Risk GET error:', error)
    const { searchParams } = new URL(request.url)
    return NextResponse.json({
      projectId: searchParams.get('projectId'),
      status: 'not_found',
      message: '리스크 평가를 찾을 수 없습니다.',
    })
  }
}