import { NextResponse } from 'next/server';
import { probeAllIntegrations, resolveAiosWorkspaceRoot } from '@aios/infrastructure';

export async function GET() {
  try {
    const report = await probeAllIntegrations({
      workspaceRoot: resolveAiosWorkspaceRoot(),
    });

    const healthy = report.summary.ok === report.summary.total && report.summary.total > 0;
    const httpStatus = healthy ? 200 : 503;

    return NextResponse.json({
      status: healthy ? 'ok' : 'degraded',
      ...report,
    }, { status: httpStatus });
  } catch (error) {
    console.error('Integrations health error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
