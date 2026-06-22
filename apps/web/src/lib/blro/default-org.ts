import { prisma } from '@aios/db';

const DEFAULT_ORG_SLUG = 'blro-default';

export async function ensureDefaultOrganization() {
  const existing = await prisma.organization.findFirst({
    where: { name: 'BLRO Operating OS' },
  });
  if (existing) return existing;

  return prisma.organization.create({
    data: {
      name: 'BLRO Operating OS',
      description: `C-Stack default org (${DEFAULT_ORG_SLUG})`,
    },
  });
}
