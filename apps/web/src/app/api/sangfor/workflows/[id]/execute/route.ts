import { NextResponse } from 'next/server';
import { ensureApprovedAction, recordApprovalArtifact } from '../../../../../../lib/integrations/approval-gate';
import { getSangforMcpUrl } from '../../../../../../lib/integrations/upstream-urls';
import { proxyUpstreamJson, upstreamErrorResponse } from '../../../../../../lib/integrations/upstream-proxy';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const approvalId = typeof body.approvalId === 'string' ? body.approvalId : undefined;

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: `sangfor-workflow-execute-${id}`,
      requestedBy: typeof body.requestedBy === 'string' ? body.requestedBy : 'opencode',
      actionType: 'deploy',
      target: `sangfor workflow execute: ${id}`,
      context: { workflowId: id },
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path: `/api/workflows/${id}/execute`,
      method: 'POST',
      body: body.payload ?? {},
    });

    await recordApprovalArtifact(gate.approval, `Sangfor workflow executed: ${id}`);

    if (!result.ok) {
      return NextResponse.json(result.data, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      approvalStatus: 'approved',
      approvalId: gate.approval.id,
      result: result.data,
    });
  } catch (error) {
    return upstreamErrorResponse('Sangfor workflow execute proxy error', error, 500);
  }
}
