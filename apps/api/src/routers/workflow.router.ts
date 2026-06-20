/**
 * Workflow Router
 * 워크플로우 tRPC 라우터 — Prisma Repository 연동
 */

import { z } from 'zod';
import { router, protectedProcedure } from './trpc';
import { WorkflowService } from '@aios/application-workflow';
import { createPrismaWorkflowRepositories } from '@aios/infrastructure-workflow';

const { workflowRepository, executionRepository } = createPrismaWorkflowRepositories();
const workflowService = new WorkflowService(workflowRepository, executionRepository);

export const workflowRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const workflows = await workflowService.getWorkflows();
      return { workflows };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const workflow = await workflowService.getWorkflowById(input.id);
      if (!workflow) {
        throw new Error(`Workflow not found: ${input.id}`);
      }
      return workflow;
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
    .mutation(async ({ input, ctx }) => {
      const workflow = await workflowService.createWorkflow({
        ...input,
        userId: ctx.userId ?? 'system',
        status: 'draft',
        version: 1,
        source: 'aios-v2',
      });
      return workflow;
    }),

  execute: protectedProcedure
    .input(z.object({
      workflowId: z.string(),
      input: z.record(z.unknown()).optional(),
      approvalId: z.string().optional(),
      idempotencyKey: z.string().optional(),
      mode: z.enum(['real', 'simulated']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const execution = await workflowService.queueWorkflow(
        input.workflowId,
        input.input,
        {
          approvalId: input.approvalId,
          requestedBy: ctx.userId ?? 'api-client',
          idempotencyKey: input.idempotencyKey,
          mode: input.mode,
        },
      );
      return execution;
    }),

  executions: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input }) => {
      const executions = await workflowService.getExecutions(input.workflowId);
      return { executions };
    }),

  executionById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const execution = await workflowService.getExecution(input.id);
      if (!execution) {
        throw new Error(`Execution not found: ${input.id}`);
      }
      return execution;
    }),
});
