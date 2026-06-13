import { NextResponse } from 'next/server';
import { proxyAiosV1Json } from '../../../lib/integrations/aios-v1-proxy';
import { upstreamErrorResponse } from '../../../lib/integrations/upstream-proxy';

export async function GET() {
  try {
    const result = await proxyAiosV1Json<{ connectors?: Array<Record<string, unknown>> }>({
      path: '/api/connectors',
    });

    if (!result.ok) {
      return NextResponse.json(result.data, { status: result.status });
    }

    const connectors = result.data.connectors ?? result.data ?? [];
    const list = Array.isArray(connectors) ? connectors : [];
    const githubConnector = list.find((connector) =>
      connector.type === 'github' || String(connector.name ?? '').toLowerCase().includes('github'),
    );

    return NextResponse.json({
      branches: githubConnector?.branches ?? [],
      commits: githubConnector?.commits ?? [],
      connectors: list,
      connected: Boolean(githubConnector),
      message: 'GitHub 연동을 위해 connectors API를 사용합니다.',
    });
  } catch (error) {
    return upstreamErrorResponse('GitHub error', error);
  }
}
