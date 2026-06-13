import { NextResponse } from 'next/server'
import { createDefaultParticipants } from '@aios/application'
import { getCollaborationServices } from '../../../../lib/collaboration/server'

export async function GET(request: Request) {
  try {
    const { coordinator } = getCollaborationServices()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const sessions = await coordinator.listSessions(status as never)
    const summary = await coordinator.getSummary()

    return NextResponse.json({ sessions, summary })
  } catch (error) {
    console.error('Collaboration sessions error:', error)
    return NextResponse.json(
      { error: '협업 세션 목록을 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { coordinator } = getCollaborationServices()
    const body = await request.json()
    const session = await coordinator.createSession({
      title: body.title ?? 'Untitled collaboration session',
      objective: body.objective ?? 'AIOS multi-session execution',
      owner: body.owner ?? 'cursor',
      participants: body.participants ?? createDefaultParticipants(),
      metadata: body.metadata ?? {},
    })

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error('Collaboration session create error:', error)
    return NextResponse.json(
      { error: '협업 세션 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
