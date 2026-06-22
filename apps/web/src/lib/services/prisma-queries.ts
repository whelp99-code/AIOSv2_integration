import { prisma } from '@aios/db';
import { ensureDefaultOrganization } from '../blro/default-org';
import {
  PROJECT_SAFE_SELECT,
  USER_SAFE_SELECT,
  TASK_SAFE_SELECT,
  EXECUTION_RUN_SAFE_SELECT,
  CUSTOMER_SAFE_OMIT,
} from '../schemas/aios-v1.schema';

export async function findProjectSafe(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: PROJECT_SAFE_SELECT,
  });
}

export async function findProjectsSafe(organizationId?: string) {
  const orgId = organizationId ?? (await ensureDefaultOrganization()).id;
  return prisma.project.findMany({
    where: { organizationId: orgId },
    select: PROJECT_SAFE_SELECT,
    orderBy: { updatedAt: 'desc' },
  });
}

export async function findUserSafe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: USER_SAFE_SELECT,
  });
}

export async function findTasksByProject(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    select: TASK_SAFE_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

/** @deprecated BLRO schema — use ExecutionRun via findRunsByProject */
export async function findResultsByProject(projectId: string) {
  return findRunsByProject(projectId);
}

export async function findRunsByProject(projectId: string) {
  return prisma.executionRun.findMany({
    where: { projectId },
    select: EXECUTION_RUN_SAFE_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findCustomersSafe(organizationId?: string) {
  const orgId = organizationId ?? (await ensureDefaultOrganization()).id;
  return prisma.customer.findMany({
    where: { organizationId: orgId },
    omit: CUSTOMER_SAFE_OMIT,
    orderBy: { updatedAt: 'desc' },
  });
}

/** @deprecated Partner model removed — returns customers tagged as PARTNER status */
export async function findPartnersSafe(organizationId?: string) {
  const orgId = organizationId ?? (await ensureDefaultOrganization()).id;
  return prisma.customer.findMany({
    where: { organizationId: orgId, status: 'PARTNER' },
    omit: CUSTOMER_SAFE_OMIT,
    orderBy: { updatedAt: 'desc' },
  });
}
