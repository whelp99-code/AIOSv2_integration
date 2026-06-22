import { NextResponse } from 'next/server';
import {
  ingestBronze,
  loadRegistry,
  normalizeSilver,
  projectFromMail,
} from '@aios/data-plane';
import { prisma } from '@aios/db';
import { ensureDefaultOrganization } from '@/lib/blro/default-org';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const registry = await loadRegistry();
    const rawPayload = {
      messageId: String(body.messageId ?? body.id ?? `mail-${Date.now()}`),
      subject: String(body.subject ?? 'Untitled'),
      from: String(body.from ?? body.sender ?? 'unknown'),
      bodyPreview: String(body.bodyPreview ?? body.preview ?? ''),
      receivedAt: body.receivedAt ?? new Date().toISOString(),
    };

    const bronze = await ingestBronze('email', rawPayload, registry);
    const silver = await normalizeSilver('email', bronze.record, registry);
    const gold = await projectFromMail(silver.record, registry);

    const projectName = String(gold.project.name ?? rawPayload.subject);
    const org = await ensureDefaultOrganization();

    const existing = await prisma.project.findFirst({
      where: {
        organizationId: org.id,
        name: projectName,
      },
    });

    if (existing) {
      return NextResponse.json({
        duplicate: true,
        project: existing,
        policy: 'name-match-dedup',
        streamId: gold.streamId,
      });
    }

    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: projectName,
        summary: String(rawPayload.bodyPreview).slice(0, 500) || null,
        status: 'NEW_LEAD',
        opportunity: 'MEDIUM',
      },
    });

    return NextResponse.json({
      duplicate: false,
      project,
      bronze: bronze.record,
      silver: silver.record,
      gold: gold.project,
      streamId: gold.streamId,
    });
  } catch (error) {
    console.error('from-mail error:', error);
    return NextResponse.json(
      { error: '메일→Project 변환 실패' },
      { status: 500 },
    );
  }
}
