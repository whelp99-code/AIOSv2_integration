import { NextResponse } from 'next/server';
import { getCeoBriefingService } from '@/lib/briefing/ceo-briefing-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { approver?: string; reason?: string };
    const approver = body.approver ?? 'CEO';
    const reason = body.reason ?? '사유 미입력';
    const result = getCeoBriefingService().reject(id, approver, reason);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[approval/reject]', error);
    return NextResponse.json({ error: '거부 처리에 실패했습니다.' }, { status: 500 });
  }
}
