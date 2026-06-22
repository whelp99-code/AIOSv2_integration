import { prisma } from '@aios/db';
import { ensureDefaultOrganization } from './default-org';

const MAIL_URL = process.env.MAIL_INTELLIGENCE_URL ?? 'http://localhost:3010';
const CFO_URL = process.env.CFO_AIOS_URL ?? 'http://localhost:4100';
const SANGFOR_URL = process.env.SANGFOR_MCP_URL ?? 'http://localhost:3500';

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function buildBriefing() {
  const org = await ensureDefaultOrganization();

  const [pendingApprovals, openProjects, recentRuns, mailStatus, cfoHealth, sangforHealth] =
    await Promise.all([
      prisma.approvalItem.count({
        where: { organizationId: org.id, status: 'PENDING' },
      }),
      prisma.project.count({
        where: {
          organizationId: org.id,
          status: { notIn: ['WON', 'LOST'] },
        },
      }),
      prisma.executionRun.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true },
      }),
      fetchJson(`${MAIL_URL}/api/outlook/status`),
      fetchJson(`${CFO_URL}/api/health`),
      fetchJson(`${SANGFOR_URL}/api/system/health`),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    mail: {
      connected: mailStatus.ok,
      summary: mailStatus.ok ? 'Outlook 연결 확인' : '메일 서비스 미연결',
      href: '/mail',
    },
    approvals: {
      pending: pendingApprovals,
      summary: `승인 대기 ${pendingApprovals}건`,
      href: '/approvals',
    },
    projects: {
      open: openProjects,
      summary: `진행 프로젝트 ${openProjects}건`,
      href: '/command',
    },
    cfo: {
      healthy: cfoHealth.ok,
      summary: cfoHealth.ok ? 'CFO 정상' : 'CFO 미기동',
      href: '/finance',
    },
    sangfor: {
      healthy: sangforHealth.ok,
      summary: sangforHealth.ok ? 'Sangfor 정상' : 'Sangfor 미기동',
      href: '/sangfor',
    },
    recentRuns,
  };
}
