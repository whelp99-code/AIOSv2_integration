import { NextResponse } from 'next/server';
import { createCfoDraftFromMail } from '@/lib/cfo/mail-bridge';

export async function POST(request: Request) {
  const body = await request.json();
  const result = await createCfoDraftFromMail({
    subject: String(body.subject ?? ''),
    bodyPreview: body.bodyPreview,
    from: body.from,
  });
  return NextResponse.json(result);
}
