/**
 * Workflow Domain Entities
 * 워크플로우 도메인 엔티티 (F-aios-v3 재활용)
 */

import { z } from 'zod';

export const WorkflowStatusSchema = z.enum(['draft', 'active', 'paused', 'completed', 'failed']);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const ExecutionStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const WorkflowStepConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['action', 'condition', 'parallel', 'loop', 'approval']),
  config: z.record(z.unknown()),
  nextSteps: z.array(z.string()).optional(),
  timeout: z.number().optional(),
  retryPolicy: z.object({
    maxRetries: z.number(),
    delayMs: z.number(),
  }).optional(),
});
export type WorkflowStepConfig = z.infer<typeof WorkflowStepConfigSchema>;

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string(),
  status: WorkflowStatusSchema.default('draft'),
  steps: z.array(WorkflowStepConfigSchema),
  startStep: z.string(),
  variables: z.record(z.unknown()).optional(),
  userId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

export const WorkflowExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: ExecutionStatusSchema.default('pending'),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  stepResults: z.record(z.object({
    status: ExecutionStatusSchema,
    output: z.unknown().optional(),
    error: z.string().optional(),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
  })).optional(),
});
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;
