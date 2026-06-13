import { NextResponse } from 'next/server'
import { proxyAiosV1Json } from '../../../lib/integrations/aios-v1-proxy'
import { getAiosV1Url } from '../../../lib/integrations/upstream-urls'
import { createGatedHandler } from '../../../lib/integrations/approval-middleware'

const FALLBACK_PLAN = {
  status: 'completed' as const,
  timestamp: new Date().toISOString(),
  phases: [
    {
      id: 1,
      name: 'Foundation',
      duration: '1-2 weeks',
      tasks: ['Setup monorepo', 'Configure tools', 'Create base structure'],
    },
    {
      id: 2,
      name: 'Core Development',
      duration: '2-3 weeks',
      tasks: ['Implement domain models', 'Create services', 'Build API'],
    },
    {
      id: 3,
      name: 'Integration',
      duration: '1-2 weeks',
      tasks: ['Connect APIs', 'Test integration', 'Deploy'],
    },
  ],
  message: '계획을 위해 AIOS v1을 확인하세요.',
  aiosV1Url: getAiosV1Url(),
}

export const POST = createGatedHandler(
  'deploy',
  'plan-create',
  '개발 계획 수립',
  async (request) => {
    let projectId: string | undefined
    let requirements: unknown

    try {
      const body = await request.json()
      projectId = body.projectId
      requirements = body.requirements
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    try {
      const result = await proxyAiosV1Json({
        path: '/api/plan',
        method: 'POST',
        body: { projectId, requirements },
      })

      if (result.ok) {
        return NextResponse.json(result.data, { status: result.status })
      }

      return NextResponse.json({ plan: { ...FALLBACK_PLAN, projectId } })
    } catch (error) {
      console.error('Plan error:', error)
      return NextResponse.json({ plan: { ...FALLBACK_PLAN, projectId } })
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
      path: '/api/plan',
      query: searchParams,
    })

    if (result.ok) {
      return NextResponse.json(result.data, { status: result.status })
    }

    return NextResponse.json({
      projectId,
      status: 'not_found',
      message: '계획을 찾을 수 없습니다.',
    })
  } catch (error) {
    console.error('Plan GET error:', error)
    const { searchParams } = new URL(request.url)
    return NextResponse.json({
      projectId: searchParams.get('projectId'),
      status: 'not_found',
      message: '계획을 찾을 수 없습니다.',
    })
  }
}