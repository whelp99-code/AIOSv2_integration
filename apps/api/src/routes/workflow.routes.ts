import { randomUUID } from 'node:crypto';
import { Router, type IRouter, type Response } from 'express';
import { z } from 'zod';
import { WorkflowService } from '@aios/application-workflow';
import { createPrismaWorkflowRepositories } from '@aios/infrastructure-workflow';

const stepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['action', 'condition', 'parallel', 'loop', 'approval']),
  config: z.record(z.unknown()).default({}),
  nextSteps: z.array(z.string()).optional(),
  timeout: z.number().int().positive().optional(),
  retryPolicy: z.object({
    maxRetries: z.number().int().nonnegative(),
    delayMs: z.number().int().nonnegative(),
  }).optional(),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  type: z.string().min(1).max(100).default('automation'),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'failed']).default('draft'),
  steps: z.array(stepSchema).min(1),
  startStep: z.string().min(1),
  variables: z.record(z.unknown()).optional(),
  source: z.string().min(1).max(100).default('aios-v2'),
});

const queueExecutionSchema = z.object({
  input: z.record(z.unknown()).optional(),
  approvalId: z.string().min(1).optional(),
  requestedBy: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1).max(200).optional(),
  traceId: z.string().min(1).optional(),
  engine: z.string().min(1).default('f-aios-v3'),
  mode: z.enum(['real', 'simulated']).default('real'),
  metadata: z.record(z.unknown()).optional(),
});

const updateExecutionSchema = z.object({
  status: z.enum([
    'queued',
    'pending',
    'pending_approval',
    'running',
    'completed',
    'failed',
    'cancelled',
    'degraded',
  ]).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().max(20_000).optional(),
  stepResults: z.record(z.object({
    status: z.enum([
      'queued',
      'pending',
      'pending_approval',
      'running',
      'completed',
      'failed',
      'cancelled',
      'degraded',
    ]),
    output: z.unknown().optional(),
    error: z.string().optional(),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
  })).optional(),
  heartbeatAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  attempt: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional(),
  event: z.object({
    sequence: z.number().int().nonnegative(),
    type: z.string().min(1),
    payload: z.record(z.unknown()).default({}),
  }).optional(),
});

const repositories = createPrismaWorkflowRepositories();
const workflowService = new WorkflowService(
  repositories.workflowRepository,
  repositories.executionRepository,
);

export const workflowRestRouter: IRouter = Router();

workflowRestRouter.get('/workflows', async (req, res) => {
  try {
    const workflows = await workflowService.getWorkflows(req.user?.id);
    res.json({ workflows });
  } catch (error) {
    respondError(res, error);
  }
});

workflowRestRouter.get('/workflows/:id', async (req, res) => {
  try {
    const workflow = await workflowService.getWorkflowById(req.params.id);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }
    res.json({ workflow });
  } catch (error) {
    respondError(res, error);
  }
});

workflowRestRouter.post('/workflows', async (req, res) => {
  const parsed = createWorkflowSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid workflow', issues: parsed.error.issues });
    return;
  }

  if (!parsed.data.steps.some((step) => step.id === parsed.data.startStep)) {
    res.status(400).json({ error: 'startStep must reference an existing step' });
    return;
  }

  try {
    const workflow = await workflowService.createWorkflow({
      ...parsed.data,
      version: 1,
      userId: req.user?.id ?? 'service:f-aios-v3',
    });
    res.status(201).json({ workflow });
  } catch (error) {
    respondError(res, error);
  }
});

workflowRestRouter.delete('/workflows/:id', async (req, res) => {
  if (!req.headers['x-aios-approval-id']) {
    res.status(409).json({
      error: 'Approval required',
      status: 'pending_approval',
      actionType: 'delete',
    });
    return;
  }
  try {
    await workflowService.deleteWorkflow(req.params.id);
    res.status(204).send();
  } catch (error) {
    respondError(res, error);
  }
});

workflowRestRouter.post('/workflows/:id/executions', async (req, res) => {
  const parsed = queueExecutionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid execution request', issues: parsed.error.issues });
    return;
  }

  try {
    const approvalId =
      parsed.data.approvalId ??
      (typeof req.headers['x-aios-approval-id'] === 'string'
        ? req.headers['x-aios-approval-id']
        : undefined);
    const idempotencyKey =
      parsed.data.idempotencyKey ??
      (typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key']
        : undefined);
    const execution = await workflowService.queueWorkflow(
      req.params.id,
      parsed.data.input,
      {
        ...parsed.data,
        approvalId,
        idempotencyKey,
        requestedBy: parsed.data.requestedBy ?? req.user?.id,
      },
    );
    res.status(202).json({ execution });
  } catch (error) {
    respondError(res, error);
  }
});

workflowRestRouter.get('/workflows/:id/executions', async (req, res) => {
  try {
    const executions = await workflowService.getExecutions(req.params.id);
    res.json({ executions });
  } catch (error) {
    respondError(res, error);
  }
});

workflowRestRouter.get('/executions/:id', async (req, res) => {
  try {
    const execution = await workflowService.getExecution(req.params.id);
    if (!execution) {
      res.status(404).json({ error: 'Workflow execution not found' });
      return;
    }
    const afterSequence = Number(req.query.afterSequence ?? -1);
    const events = await repositories.executionRepository.listEvents(
      execution.id,
      Number.isFinite(afterSequence) ? afterSequence : -1,
    );
    res.json({ execution, events });
  } catch (error) {
    respondError(res, error);
  }
});

workflowRestRouter.patch('/executions/:id', async (req, res) => {
  const parsed = updateExecutionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid execution update', issues: parsed.error.issues });
    return;
  }

  try {
    const { event, ...updates } = parsed.data;
    const execution = await workflowService.updateExecution(req.params.id, updates);
    if (event) {
      await repositories.executionRepository.appendEvent({
        id: `evt_${randomUUID()}`,
        executionId: execution.id,
        sequence: event.sequence,
        type: event.type,
        payload: event.payload,
        createdAt: new Date().toISOString(),
      });
    }
    res.json({ execution });
  } catch (error) {
    respondError(res, error);
  }
});

function respondError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.includes('not found') ? 404 : 500;
  res.status(status).json({ error: message });
}
