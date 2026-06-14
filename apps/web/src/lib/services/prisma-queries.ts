import { prisma } from '@aios/db';
import {
  PROJECT_SAFE_SELECT,
  USER_SAFE_SELECT,
  TASK_SAFE_SELECT,
  RESULT_SAFE_SELECT,
  CUSTOMER_SAFE_OMIT,
  PARTNER_SAFE_OMIT,
} from '../schemas/aios-v1.schema';

export async function findProjectSafe(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: PROJECT_SAFE_SELECT,
  });
}

export async function findProjectsSafe(userId?: string) {
  return prisma.project.findMany({
    where: userId ? { userId } : undefined,
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

export async function findResultsByProject(projectId: string) {
  return prisma.result.findMany({
    where: { projectId },
    select: RESULT_SAFE_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findCustomersSafe(userId?: string) {
  return prisma.customer.findMany({
    where: userId ? { userId } : undefined,
    omit: CUSTOMER_SAFE_OMIT,
    orderBy: { updatedAt: 'desc' },
  });
}

export async function findPartnersSafe(userId?: string) {
  return prisma.partner.findMany({
    where: userId ? { userId } : undefined,
    omit: PARTNER_SAFE_OMIT,
    orderBy: { updatedAt: 'desc' },
  });
}
