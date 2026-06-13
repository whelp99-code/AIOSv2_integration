import { NextResponse } from 'next/server';
import { ensureApprovedAction, recordApprovalArtifact } from '../../../../../lib/integrations/approval-gate';
import { getVibeCodingOsUrl } from '../../../../../lib/integrations/upstream-urls';
import { proxyUpstreamJson, upstreamErrorResponse } from '../../../../../lib/integrations/upstream-proxy';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const approvalId = typeof body.approvalId === 'string' ? body.approvalId : undefined;
    const title = typeof body.title === 'string' ? body.title : 'rag-ingest';

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: `vibe-rag-ingest-${title}`,
      requestedBy: typeof body.requestedBy === 'string' ? body.requestedBy : 'opencode',
      actionType: 'external-share',
      target: `vibe-coding rag ingest: ${title}`,
      context: {
        sourceType: body.sourceType,
        projectId: body.projectId,
      },
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const { approvalId: _ignored, requestedBy: _req, ...payload } = body;
    const result = await proxyUpstreamJson({
      baseUrl: getVibeCodingOsUrl(),
      path: '/api/rag/ingest',
      method: 'POST',
      body: payload,
    });

    await recordApprovalArtifact(gate.approval, `vibe-coding RAG ingest: ${title}`);

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
    return upstreamErrorResponse('vibe-coding rag ingest proxy error', error, 500);
  }
}
