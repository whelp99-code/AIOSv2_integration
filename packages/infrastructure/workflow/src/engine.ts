/**
 * Workflow Engine
 * 워크플로우 실행 엔진 (F-aios-v3 재활용)
 */

export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'parallel' | 'loop';
  config: Record<string, unknown>;
  nextSteps?: string[];
  retryPolicy?: { maxRetries: number; delayMs: number };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  startStep: string;
  variables?: Record<string, unknown>;
}

export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Map<string, unknown>;
  stepResults: Map<string, { status: WorkflowStepStatus; output?: unknown; error?: string }>;
  startedAt: Date;
}

export type StepHandler = (step: WorkflowStep, context: WorkflowExecutionContext) => Promise<unknown>;

export class WorkflowEngine {
  private handlers: Map<string, StepHandler> = new Map();
  private executions: Map<string, WorkflowExecutionContext> = new Map();

  registerHandler(stepType: string, handler: StepHandler): void {
    this.handlers.set(stepType, handler);
  }

  async execute(definition: WorkflowDefinition, initialVars?: Record<string, unknown>): Promise<WorkflowExecutionContext> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const context: WorkflowExecutionContext = {
      workflowId: definition.id,
      executionId,
      variables: new Map(Object.entries(initialVars || definition.variables || {})),
      stepResults: new Map(),
      startedAt: new Date(),
    };
    this.executions.set(executionId, context);

    try {
      await this.executeStep(definition.startStep, definition, context);
    } catch (error) {
      console.error(`Workflow execution failed: ${executionId}`, error);
    }

    return context;
  }

  getExecution(executionId: string): WorkflowExecutionContext | undefined {
    return this.executions.get(executionId);
  }

  private async executeStep(stepId: string, definition: WorkflowDefinition, context: WorkflowExecutionContext): Promise<void> {
    const step = definition.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);

    context.stepResults.set(stepId, { status: 'running' });

    try {
      const handler = this.handlers.get(step.type);
      if (!handler) throw new Error(`No handler for step type: ${step.type}`);

      const output = await handler(step, context);
      context.stepResults.set(stepId, { status: 'completed', output });

      if (step.nextSteps) {
        for (const nextId of step.nextSteps) {
          await this.executeStep(nextId, definition, context);
        }
      }
    } catch (error) {
      context.stepResults.set(stepId, { status: 'failed', error: String(error) });
      throw error;
    }
  }
}
