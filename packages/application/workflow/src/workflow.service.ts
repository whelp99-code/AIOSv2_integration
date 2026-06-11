/**
 * Workflow Service
 * 워크플로우 유스케이스 서비스 (F-aios-v3 재활용)
 */

import type { Workflow, WorkflowExecution, WorkflowRepository, WorkflowExecutionRepository } from '@aios/domain/workflow';
import type { WorkflowEngine } from '@aios/infrastructure/workflow';

export class WorkflowService {
  constructor(
    private workflowRepo: WorkflowRepository,
    private executionRepo: WorkflowExecutionRepository,
    private engine: WorkflowEngine
  ) {}

  async getWorkflows(userId?: string): Promise<Workflow[]> {
    return this.workflowRepo.findAll({ userId });
  }

  async getWorkflowById(id: string): Promise<Workflow | null> {
    return this.workflowRepo.findById(id);
  }

  async createWorkflow(data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const now = new Date().toISOString();
    const workflow: Workflow = { ...data, id: `wf_${Date.now()}`, createdAt: now, updatedAt: now };
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
    const workflow = await this.workflowRepo.findById(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    const executionId = `exec_${Date.now()}`;
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      input,
      startedAt: new Date().toISOString(),
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
}
