import type { Workflow, WorkflowExecution, WorkflowExecutionEvent } from './entities';

export interface WorkflowRepository {
  findById(id: string): Promise<Workflow | null>;
  findAll(options?: { userId?: string; status?: string }): Promise<Workflow[]>;
  save(workflow: Workflow): Promise<void>;
  update(id: string, updates: Partial<Workflow>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface WorkflowExecutionRepository {
  findById(id: string): Promise<WorkflowExecution | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<WorkflowExecution | null>;
  findByWorkflowId(workflowId: string): Promise<WorkflowExecution[]>;
  save(execution: WorkflowExecution): Promise<void>;
  update(id: string, updates: Partial<WorkflowExecution>): Promise<void>;
  appendEvent(event: WorkflowExecutionEvent): Promise<void>;
  listEvents(executionId: string, afterSequence?: number): Promise<WorkflowExecutionEvent[]>;
}
