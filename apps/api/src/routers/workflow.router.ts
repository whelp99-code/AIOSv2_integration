/**
 * Workflow Router
 * 워크플로우 tRPC 라우터
 */

import { z } from 'zod';
import { router, protectedProcedure } from './trpc';

export const workflowRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async () => {
      return { workflows: [] };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return { id: input.id, name: '', status: 'draft', steps: [] };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      type: z.string(),
      steps: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['action', 'condition', 'parallel', 'loop', 'approval']),
        config: z.record(z.unknown()),
        nextSteps: z.array(z.string()).optional(),
      })),
      startStep: z.string(),
      variables: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      return { id: `wf_${Date.now()}`, ...input, status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    }),

  execute: protectedProcedure
    .input(z.object({ workflowId: z.string(), input: z.record(z.unknown()).optional() }))
    .mutation(async ({ input }) => {
      return { executionId: `exec_${Date.now()}`, workflowId: input.workflowId, status: 'running' };
    }),

  executions: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async () => {
      return { executions: [] };
    }),
});
