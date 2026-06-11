export interface WorkflowStartedEvent {
  type: 'workflow.started';
  workflowId: string;
  executionId: string;
  timestamp: Date;
}

export interface WorkflowCompletedEvent {
  type: 'workflow.completed';
  workflowId: string;
  executionId: string;
  timestamp: Date;
}

export interface WorkflowFailedEvent {
  type: 'workflow.failed';
  workflowId: string;
  executionId: string;
  error: string;
  timestamp: Date;
}

export type WorkflowEvent = WorkflowStartedEvent | WorkflowCompletedEvent | WorkflowFailedEvent;
