import { NextResponse } from 'next/server';
import { approvalReason } from '@/lib/blro/approval-gateway';
import { prisma } from '@aios/db';

const MAIL_URL = process.env.MAIL_INTELLIGENCE_URL ?? 'http://localhost:3010';

export async function POST(request: Request) {
  const bodyText = await request.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(bodyText || '{}');
  } catch {
    body = {};
  }

  if (process.env.MAIL_SEND_KILL_SWITCH === '1') {
    const approvalId = String(body.approvalId ?? '');
    let allowed = false;

    if (approvalId) {
      const item = await prisma.approvalItem.findUnique({
        where: { id: approvalId },
      });
      allowed =
        item?.status === 'APPROVED' && item.actionType === 'SEND_EMAIL';
    }

    if (!allowed) {
      return NextResponse.json(
        { error: approvalReason(['SEND_EMAIL']) ?? '승인이 필요합니다.' },
        { status: 409 },
      );
    }
  }

  try {
    const res = await fetch(`${MAIL_URL}/api/outlook/send`, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') ?? 'application/json',
      },
      body: bodyText,
      signal: AbortSignal.timeout(15000),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('Mail send proxy error:', error);
    return NextResponse.json({ error: '메일 발송 실패' }, { status: 502 });
  }
}
