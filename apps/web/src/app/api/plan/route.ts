import { NextResponse } from 'next/server';
import { createGatedHandler, type ApprovedRequestContext } from '../../../lib/integrations/approval-middleware';
import { getPlanningService } from '../../../lib/services/planning-service';
import { PlanRequestSchema } from '../../../lib/schemas/aios-v1.schema';

export const POST = createGatedHandler(
  'deploy',
  'plan-create',
  '개발 계획 수립',
  async (request, approvalCtx: ApprovedRequestContext) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = PlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 데이터 검증 실패', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const service = getPlanningService();
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

  const service = getPlanningService();
  return service.getResults(projectId);
}
