import { NextResponse } from 'next/server';

interface ServiceHealth {
  id: string;
  name: string;
  url: string;
  status: 'ok' | 'degraded' | 'unreachable';
  role: string;
}

async function checkService(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export async function GET() {
  const services: ServiceHealth[] = [
    {
      id: 'sangfor-mcp',
      name: 'Sangfor MCP',
      url: 'http://localhost:3500/api/system/health',
      status: 'unreachable',
      role: 'MCP 워크플로우',
    },
    {
      id: 'mail-intelligence',
      name: 'Mail Intelligence',
      url: 'http://localhost:3010/api/outlook/status',
      status: 'unreachable',
      role: '이메일 통합',
    },
    {
      id: 'aios-v2-api',
      name: 'AIOSv2 API',
      url: 'http://localhost:3200/api/health',
      status: 'unreachable',
      role: '백엔드 API',
    },
    {
      id: 'aios-v2-web',
      name: 'AIOSv2 Web',
      url: 'http://localhost:3110',
      status: 'unreachable',
      role: '웹 대시보드',
    },
    {
      id: 'vibe-coding-os',
      name: 'Vibe Coding OS',
      url: 'http://localhost:4000',
      status: 'unreachable',
      role: '코딩 에이전트',
    },
    {
      id: 'freellm-api',
      name: 'FreeLLM API',
      url: 'http://localhost:3001',
      status: 'unreachable',
      role: 'LLM 프록시',
    },
  ];

  const results = await Promise.all(
    services.map(async (svc) => {
      const ok = await checkService(svc.url);
      return { ...svc, status: ok ? 'ok' as const : 'unreachable' as const };
    })
  );

  const ok = results.filter((r) => r.status === 'ok').length;
  const unreachable = results.filter((r) => r.status === 'unreachable').length;

  return NextResponse.json({
    status: ok >= 3 ? 'ok' : 'degraded',
    checkedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      ok,
      unreachable,
    },
    projects: results,
  });
}
