import { NextResponse } from 'next/server';
import { buildBriefing } from '@/lib/blro/briefing';

export async function GET() {
  try {
    const briefing = await buildBriefing();
    return NextResponse.json(briefing);
  } catch (error) {
    console.error('Briefing error:', error);
    return NextResponse.json(
      { error: '브리핑을 생성할 수 없습니다.' },
      { status: 500 },
    );
  }
}
