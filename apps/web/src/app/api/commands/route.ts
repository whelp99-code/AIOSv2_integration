import { NextResponse } from 'next/server';
import { createGatedHandler, type ApprovedRequestContext } from '../../../lib/integrations/approval-middleware';
import { getCommandRegistry } from '../../../lib/services/command-registry';
import { CommandExecuteRequestSchema } from '../../../lib/schemas/aios-v1.schema';

export async function GET() {
  const registry = getCommandRegistry();
  return registry.listCommands();
}

export const POST = createGatedHandler(
  'deploy',
  'command-execute',
  '명령어 실행',
  async (request, approvalCtx: ApprovedRequestContext) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = CommandExecuteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 데이터 검증 실패', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const registry = getCommandRegistry();
    return registry.executeCommand(parsed.data, {
      userId: approvalCtx.requestedBy,
      sessionId: approvalCtx.approvalId,
      resourceId: parsed.data.command,
      idempotencyKey: parsed.data.idempotencyKey,
    });
  },
);
