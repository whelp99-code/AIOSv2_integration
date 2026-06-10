import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return available commands
    const commands = [
      {
        id: 'analyze',
        name: 'Analyze',
        description: 'Analyze project structure and code',
        endpoint: '/api/analyze'
      },
      {
        id: 'plan',
        name: 'Plan',
        description: 'Create development plan',
        endpoint: '/api/plan'
      },
      {
        id: 'risk',
        name: 'Risk Assessment',
        description: 'Assess project risks',
        endpoint: '/api/risk'
      }
    ]

    return NextResponse.json({ commands })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { command, params } = body

    // Process command
    let result
    
    switch (command) {
      case 'analyze':
        result = { status: 'queued', message: 'Analysis started' }
        break
      case 'plan':
        result = { status: 'queued', message: 'Planning started' }
        break
      case 'risk':
        result = { status: 'queued', message: 'Risk assessment started' }
        break
      default:
        return NextResponse.json({ error: 'Unknown command' }, { status: 400 })
    }

    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
