import { NextResponse } from 'next/server';
import { createGatedHandler, type ApprovedRequestContext } from '../../../lib/integrations/approval-middleware';
import { getRiskService } from '../../../lib/services/risk-service';
import { RiskRequestSchema } from '../../../lib/schemas/aios-v1.schema';

export const POST = createGatedHandler(
  'config-change',
  'risk-config',
  '리스크 설정 변경',
  async (request, approvalCtx: ApprovedRequestContext) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = RiskRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 데이터 검증 실패', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const service = getRiskService();
    return service.execute(parsed.data, {
      userId: approvalCtx.requestedBy,
      sessionId: approvalCtx.approvalId,
      resourceId: parsed.data.projectId,
      idempotencyKey: parsed.data.idempotencyKey,
    });
  },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  const service = getRiskService();
  return service.getResults(projectId);
}
