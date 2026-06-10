import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, requirements } = body

    // Create development plan
    const plan = {
      projectId,
      status: 'completed',
      phases: [
        {
          id: 1,
          name: 'Foundation',
          duration: '1-2 weeks',
          tasks: ['Setup monorepo', 'Configure tools', 'Create base structure']
        },
        {
          id: 2,
          name: 'Core Development',
          duration: '2-3 weeks',
          tasks: ['Implement domain models', 'Create services', 'Build API']
        },
        {
          id: 3,
          name: 'Integration',
          duration: '1-2 weeks',
          tasks: ['Connect services', 'Add authentication', 'Create UI']
        },
        {
          id: 4,
          name: 'Testing & Deployment',
          duration: '1 week',
          tasks: ['Write tests', 'Setup CI/CD', 'Deploy']
        }
      ],
      estimatedDuration: '5-8 weeks',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({ plan })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Get plan
    const plan = {
      projectId,
      status: 'not_found',
      message: 'No plan found for this project'
    }

    return NextResponse.json({ plan })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
