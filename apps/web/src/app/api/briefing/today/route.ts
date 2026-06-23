import { NextResponse } from 'next/server';
import { getCeoBriefingService } from '@/lib/briefing/ceo-briefing-service';

export async function GET() {
  try {
    const briefing = await getCeoBriefingService().getTodayBriefing();
    return NextResponse.json(briefing);
  } catch (error) {
    console.error('[briefing/today]', error);
    return NextResponse.json(
      { error: '브리핑을 생성할 수 없습니다.' },
      { status: 500 },
    );
  }
}
