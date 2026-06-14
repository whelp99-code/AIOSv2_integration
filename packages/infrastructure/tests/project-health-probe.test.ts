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

  it('marks HTTP integrations as degraded when health body reports healthy with 503', async () => {
    const target = getIntegrationTarget('vibe-coding-os');
    const result = await probeIntegrationTarget(target, {
      env: { VIBE_CODING_OS_URL: 'http://vibe.test' },
      fetchImpl: async () =>
        new Response(JSON.stringify({ ok: false, status: 'degraded', time: 'now' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
    });

    expect(result.status).toBe('degraded');
  });

  it('probes whelp99 HTTP bridge when WHELP99_MCP_HTTP_URL is configured', async () => {
    const target = getIntegrationTarget('whelp99-code-sangfor-engineer-mcp');
    const result = await probeIntegrationTarget(target, {
      env: {
        WHELP99_MCP_PATH: '/tmp/whelp99',
        WHELP99_MCP_HTTP_URL: 'http://whelp99-bridge.test',
      },
      fetchImpl: async (input) => {
        expect(String(input)).toBe('http://whelp99-bridge.test/health');
        return new Response(JSON.stringify({ status: 'ok', bridge: 'whelp99-mcp-http-bridge' }), {
          status: 200,
        });
      },
    });

    expect(result.status).toBe('ok');
    expect(result.probeMode).toBe('http');
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
