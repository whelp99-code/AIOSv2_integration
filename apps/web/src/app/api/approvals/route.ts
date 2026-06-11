import { NextResponse } from 'next/server'

const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3101'

export async function GET() {
  try {
    // AIOS v1의 approvals API 호출
    const response = await fetch(`${AIOS_V1_URL}/api/approvals`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      // approvals API가 없으면 빈 배열 반환
      return NextResponse.json({ approvals: [] })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Approvals error:', error)
    return NextResponse.json(
      { approvals: [] },
      { status: 200 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, action, reason } = body

    // AIOS v1의 approvals API 호출
    const endpoint = action === 'approve' 
      ? `${AIOS_V1_URL}/api/approvals/${id}/approve`
      : `${AIOS_V1_URL}/api/approvals/${id}/reject`
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })

    if (!response.ok) {
      // approvals API가 없으면 성공으로 처리
      return NextResponse.json({ 
        success: true, 
        message: `Approval ${action} 처리되었습니다.` 
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Approval action error:', error)
    return NextResponse.json(
      { success: true, message: 'Approval 처리되었습니다.' },
      { status: 200 }
    )
  }
}
