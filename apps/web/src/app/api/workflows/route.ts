import { NextResponse } from 'next/server'
import { proxyAiosV1Json } from '../../../lib/integrations/aios-v1-proxy'
import { upstreamErrorResponse } from '../../../lib/integrations/upstream-proxy'
import { createGatedHandler, GATE_PRESETS } from '../../../lib/integrations/approval-middleware'

export async function GET() {
  try {
    const result = await proxyAiosV1Json<{ tasks?: Array<Record<string, unknown>> }>({
      path: '/api/tasks',
    })

    if (!result.ok) {
      return NextResponse.json(result.data, { status: result.status })
    }

    const workflows = (result.data.tasks ?? []).map((task) => ({
      id: task.id,
      name: task.title,
      description: task.description,
      status: task.status,
      type: 'task',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }))

    return NextResponse.json({ workflows })
  } catch (error) {
    return upstreamErrorResponse('Workflows error', error)
  }
}

// POST with deploy gate for workflow creation
export const POST = createGatedHandler(
  'deploy',
  GATE_PRESETS.workflowCreate().assignmentId,
  GATE_PRESETS.workflowCreate().target,
  async (request) => {
    try {
      const body = await request.json()
      const { name, description } = body
      const result = await proxyAiosV1Json({
        path: '/api/tasks',
        method: 'POST',
        body: {
          title: name,
          description,
          status: 'BACKLOG',
          priority: 'MEDIUM',
        },
      })
      return NextResponse.json(result.data, { status: result.status })
    } catch (error) {
      return upstreamErrorResponse('Workflow create error', error)
    }
  }
)