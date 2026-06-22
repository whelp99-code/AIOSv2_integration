import { prisma, Prisma } from '@aios/db';
import { ensureDefaultOrganization } from './default-org';

export type ApprovalActionType =
  | 'SEND_EMAIL'
  | 'SEND_MESSAGE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'MOVE'
  | 'COST_ACTION'
  | 'SEND_QUOTE'
  | 'EXTERNAL_SHARE';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'EXPIRED';

export async function listApprovals(organizationId?: string) {
  const orgId = organizationId ?? (await ensureDefaultOrganization()).id;
  return prisma.approvalItem.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function createApproval(input: {
  title: string;
  summary?: string;
  actionType: ApprovalActionType;
  projectId?: string;
  preview?: Record<string, unknown>;
  warning?: string;
}) {
  const org = await ensureDefaultOrganization();
  return prisma.approvalItem.create({
    data: {
      organizationId: org.id,
      title: input.title,
      summary: input.summary,
      actionType: input.actionType,
      projectId: input.projectId,
      preview: input.preview as Prisma.InputJsonValue | undefined,
      warning: input.warning,
      status: 'PENDING',
    },
  });
}

export async function resolveApproval(
  id: string,
  status: Extract<ApprovalStatus, 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'>,
  decisionNote?: string,
) {
  return prisma.approvalItem.update({
    where: { id },
    data: {
      status,
      decisionNote,
      decidedAt: new Date(),
    },
  });
}

export async function hasApprovedAction(
  actionType: ApprovalActionType,
  projectId?: string,
): Promise<boolean> {
  const org = await ensureDefaultOrganization();
  const item = await prisma.approvalItem.findFirst({
    where: {
      organizationId: org.id,
      actionType,
      status: 'APPROVED',
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { decidedAt: 'desc' },
  });
  return Boolean(item);
}
