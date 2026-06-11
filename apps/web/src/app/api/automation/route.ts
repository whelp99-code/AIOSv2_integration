import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3101'

export async function GET() {
  try {
    const response = await fetch(`${AIOS_V1_URL}/api/automation/workflows`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`AIOS v1 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Automation proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation workflows' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId } = body
    
    const response = await fetch(`${AIOS_V1_URL}/api/automation/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`AIOS v1 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Automation execute error:', error)
    return NextResponse.json(
      { error: 'Failed to execute automation' },
      { status: 500 }
    )
  }
}
