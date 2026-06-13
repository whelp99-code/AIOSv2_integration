import { describe, expect, it } from 'vitest';
import { getIntegrationTarget } from '@aios/shared';
import { probeAllIntegrations, probeIntegrationTarget } from '../src/integrations/project-health-probe';

describe('project-health-probe', () => {
  it('marks HTTP integrations as ok when health endpoint returns 200', async () => {
    const target = getIntegrationTarget('f-aios-v3-core');
    const result = await probeIntegrationTarget(target, {
      env: { F_AIOS_V3_URL: 'http://f-aios-v3.test' },
      fetchImpl: async () =>
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });

    expect(result.status).toBe('ok');
    expect(result.upstream).toBe('http://f-aios-v3.test');
  });

  it('returns aggregated report for all integration targets', async () => {
    const report = await probeAllIntegrations({
      env: {
        AIOS_V1_URL: 'http://aios-v1.test',
        F_AIOS_V3_URL: 'http://f-aios-v3.test',
        SANGFOR_MCP_URL: 'http://sangfor.test',
        VIBE_CODING_OS_URL: 'http://vibe.test',
      },
      workspaceRoot: process.cwd(),
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes('aios-v1')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
        }
        if (url.includes('f-aios-v3')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
        }
        return new Response(JSON.stringify({ status: 'unreachable' }), { status: 503 });
      },
    });

    expect(report.projects).toHaveLength(5);
    expect(report.summary.total).toBe(5);
    expect(report.summary.ok).toBeGreaterThanOrEqual(2);
  });
});
