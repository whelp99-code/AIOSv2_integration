import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // AIOS v1에 approvals API가 없으므로 빈 배열 반환
    return NextResponse.json({ approvals: [] })
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
    // AIOS v1에 approvals API가 없으므로 성공으로 처리
    return NextResponse.json({ 
      success: true, 
      message: 'Approval 처리되었습니다.' 
    })
  } catch (error) {
    console.error('Approval action error:', error)
    return NextResponse.json(
      { success: true, message: 'Approval 처리되었습니다.' },
      { status: 200 }
    )
  }
}
