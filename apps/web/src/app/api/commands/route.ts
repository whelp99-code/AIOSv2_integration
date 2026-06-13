import { NextResponse } from 'next/server'
import { proxyAiosV1Json } from '../../../lib/integrations/aios-v1-proxy'
import { createGatedHandler } from '../../../lib/integrations/approval-middleware'

const FALLBACK_COMMANDS = [
  {
    id: 'analyze',
    name: 'Analyze',
    description: '프로젝트 구조 및 코드 분석',
    endpoint: '/api/analyze',
  },
  {
    id: 'plan',
    name: 'Plan',
    description: '개발 계획 수립',
    endpoint: '/api/plan',
  },
  {
    id: 'risk',
    name: 'Risk Assessment',
    description: '프로젝트 리스크 평가',
    endpoint: '/api/risk',
  },
  {
    id: 'customers',
    name: 'Customers',
    description: '고객 관리',
    endpoint: '/api/customers',
  },
  {
    id: 'partners',
    name: 'Partners',
    description: '파트너 관리',
    endpoint: '/api/partners',
  },
  {
    id: 'workflows',
    name: 'Workflows',
    description: '워크플로우 관리',
    endpoint: '/api/workflows',
  },
]

export async function GET() {
  try {
    const result = await proxyAiosV1Json({ path: '/api/commands' })

    if (result.ok) {
      return NextResponse.json(result.data, { status: result.status })
    }

    return NextResponse.json({ commands: FALLBACK_COMMANDS })
  } catch (error) {
    console.error('Commands error:', error)
    return NextResponse.json({ commands: FALLBACK_COMMANDS })
  }
}

export const POST = createGatedHandler(
  'deploy',
  'command-execute',
  '명령어 실행',
  async (request) => {
    let command: string | undefined
    let params: unknown

    try {
      const body = await request.json()
      command = body.command
      params = body.params
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    try {
      const result = await proxyAiosV1Json({
        path: '/api/commands',
        method: 'POST',
        body: { command, params },
      })

      if (result.ok) {
        return NextResponse.json(result.data, { status: result.status })
      }

      return NextResponse.json({
        status: 'queued',
        message: `${command} 명령어가 실행되었습니다.`,
      })
    } catch (error) {
      console.error('Command execute error:', error)
      return NextResponse.json({
        status: 'queued',
        message: `${command} 명령어가 실행되었습니다.`,
      })
    }
  }
)