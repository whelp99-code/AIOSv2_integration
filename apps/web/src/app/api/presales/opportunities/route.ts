import { NextResponse } from 'next/server';
import { prisma } from '@aios/db';
import { ensureDefaultOrganization } from '@/lib/blro/default-org';
import { evaluateOpportunities } from '@/lib/presales/rules-engine';

export async function GET() {
  try {
    const org = await ensureDefaultOrganization();
    const [customers, projects, mailItems] = await Promise.all([
      prisma.customer.findMany({
        where: { organizationId: org.id },
        take: 50,
      }),
      prisma.project.findMany({
        where: { organizationId: org.id },
        take: 50,
      }),
      prisma.mailItem.findMany({
        where: { organizationId: org.id },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const opportunities = evaluateOpportunities({ customers, projects, mailItems });
    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error('presales opportunities error:', error);
    return NextResponse.json({ opportunities: [] });
  }
}
