/**
 * Workflow Service
 * 워크플로우 유스케이스 서비스 (F-aios-v3 재활용)
 */

import type { Workflow, WorkflowExecution, WorkflowRepository, WorkflowExecutionRepository } from '@aios/domain-workflow';
import type { WorkflowEngine } from '@aios/infrastructure-workflow';
import { randomUUID } from 'node:crypto';

export class WorkflowService {
  constructor(
    private workflowRepo: WorkflowRepository,
    private executionRepo: WorkflowExecutionRepository,
    private engine?: WorkflowEngine
  ) {}

  async getWorkflows(userId?: string): Promise<Workflow[]> {
    return this.workflowRepo.findAll({ userId });
  }

  async getWorkflowById(id: string): Promise<Workflow | null> {
    return this.workflowRepo.findById(id);
  }

  async createWorkflow(data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const now = new Date().toISOString();
    const workflow: Workflow = {
      ...data,
      id: `wf_${randomUUID()}`,
      version: data.version ?? 1,
      source: data.source ?? 'aios-v2',
      createdAt: now,
      updatedAt: now,
    };
    await this.workflowRepo.save(workflow);
    return workflow;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<void> {
    await this.workflowRepo.update(id, { ...updates, updatedAt: new Date().toISOString() });
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.workflowRepo.delete(id);
  }

  async executeWorkflow(workflowId: string, input?: Record<string, unknown>): Promise<WorkflowExecution> {
    if (!this.engine) throw new Error('Workflow engine is not configured');
    const workflow = await this.workflowRepo.findById(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    const executionId = `exec_${Date.now()}`;
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      input,
      startedAt: new Date().toISOString(),
      mode: 'real',
      attempt: 0,
      createdAt: new Date().toISOString(),
    };
    await this.executionRepo.save(execution);

    try {
      const definition = {
        id: workflow.id,
        name: workflow.name,
        steps: workflow.steps.map((s) => ({
          ...s,
          nextSteps: s.nextSteps || [],
        })),
        startStep: workflow.startStep,
        variables: { ...(workflow.variables || {}), ...(input || {}) },
      };

      const result = await this.engine.execute(definition, input);
      const lastStep = Array.from(result.stepResults.entries()).pop();
      const hasFailed = Array.from(result.stepResults.values()).some((r) => r.status === 'failed');

      await this.executionRepo.update(executionId, {
        status: hasFailed ? 'failed' : 'completed',
        output: lastStep?.[1]?.output as Record<string, unknown>,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      await this.executionRepo.update(executionId, {
        status: 'failed',
        error: String(error),
        completedAt: new Date().toISOString(),
      });
    }

    return (await this.executionRepo.findById(executionId))!;
  }

  async getExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    return this.executionRepo.findByWorkflowId(workflowId);
  }

  async queueWorkflow(
    workflowId: string,
    input: Record<string, unknown> | undefined,
    context: {
      approvalId?: string;
      requestedBy?: string;
      idempotencyKey?: string;
      traceId?: string;
      engine?: string;
      mode?: 'real' | 'simulated';
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<WorkflowExecution> {
    const workflow = await this.workflowRepo.findById(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    if (context.idempotencyKey) {
      const existing = await this.executionRepo.findByIdempotencyKey(context.idempotencyKey);
      if (existing) return existing;
    }

    const now = new Date().toISOString();
    const execution: WorkflowExecution = {
      id: `exec_${randomUUID()}`,
      workflowId,
      status: context.approvalId ? 'queued' : 'pending_approval',
      input,
      mode: context.mode ?? 'real',
      engine: context.engine ?? 'f-aios-v3',
      approvalId: context.approvalId,
      requestedBy: context.requestedBy,
      idempotencyKey: context.idempotencyKey,
      traceId: context.traceId ?? randomUUID(),
      attempt: 0,
      metadata: context.metadata,
      startedAt: now,
      createdAt: now,
    };
    await this.executionRepo.save(execution);
    await this.executionRepo.appendEvent({
      id: `evt_${randomUUID()}`,
      executionId: execution.id,
      sequence: 0,
      type: 'workflow.queued',
      payload: {
        workflowId,
        status: execution.status,
        mode: execution.mode,
      },
      createdAt: now,
    });
    return execution;
  }

  async getExecution(id: string): Promise<WorkflowExecution | null> {
    return this.executionRepo.findById(id);
  }

  async updateExecution(
    id: string,
    updates: Partial<WorkflowExecution>,
  ): Promise<WorkflowExecution> {
    await this.executionRepo.update(id, updates);
    const execution = await this.executionRepo.findById(id);
    if (!execution) throw new Error(`Workflow execution not found: ${id}`);
    return execution;
  }
}
