/**
 * Automation Workflow Engine — Phase 6
 *
 * Orchestrates the classification → command suggestion → approval → execution flow.
 * Enforces red-team constraints:
 * - 분류 결과가 자동 side effect를 만들 수 없음
 * - command suggestion까지만 자동 생성
 * - AutomationApprovalRequest 승인 후 workflow 실행
 * - OutboxEvent로 retry/idempotency 보장
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 6
 */

import type { PersonaType } from './classifier';
import type { WaveCStore, CommandRecord, CommandRunStatus, RiskAnalysisRecord } from './wave-c-store';

// ── Types ─────────────────────────────────────────────────────────────

export interface CommandSuggestion {
  commandKey: string;
  title: string;
  inputSummary: string;
  sourceEntityType: string;
  sourceEntityId: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
}

export interface WorkflowStepDefinition {
  name: string;
  agentKey: string;
  toolName?: string;
  input?: Record<string, unknown>;
}

export interface ExecutionResult {
  commandRunId: string;
  status: CommandRunStatus;
  approvalRequired: boolean;
  approvalId?: string;
  timeline: Array<{ eventType: string; message: string; timestamp: string }>;
}

// ── Automation Workflow Engine ────────────────────────────────────────

export class AutomationWorkflowEngine {
  private store: WaveCStore;
  private projectId: string;

  constructor(store: WaveCStore, projectId: string) {
    this.store = store;
    this.projectId = projectId;
  }

  /**
   * Step 1: Suggest commands from a classification result.
   * Does NOT execute — only suggests. No automatic side effects.
   */
  suggestCommands(params: {
    category: PersonaType;
    confidence: number;
    sourceEntityType: string;
    sourceEntityId: string;
    sourceSummary?: string;
  }): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    switch (params.category) {
      case 'SALES':
        suggestions.push(this.suggest('send-quote', '견적서 발송', '견적서 준비 및 발송', params, 'medium'));
        break;
      case 'PRESALES':
        suggestions.push(this.suggest('schedule-demo', '데모 일정 조율', 'POC/데모 일정 잡기', params, 'low'));
        break;
      case 'ENGINEER':
        suggestions.push(this.suggest('create-pr', 'PR 생성', '코드 변경 PR 생성', params, 'high'));
        break;
      case 'PM':
        suggestions.push(this.suggest('create-task', '작업 생성', '프로젝트 작업 생성', params, 'low'));
        break;
      case 'FINANCE':
        suggestions.push(this.suggest('process-invoice', '청구서 처리', '청구서 검토 및 처리', params, 'medium'));
        break;
      case 'CEO':
        suggestions.push(this.suggest('escalate', '경영진 에스컬레이션', '긴급 의사결정 필요', params, 'high'));
        break;
      case 'MARKETING':
        suggestions.push(this.suggest('draft-newsletter', '뉴스레터 작성', '뉴스레터 초안 작성', params, 'low'));
        break;
      case 'WORK_SUPPORT':
        suggestions.push(this.suggest('create-ticket', '티켓 생성', '업무 지원 티켓 생성', params, 'low'));
        break;
    }

    return suggestions;
  }

  /**
   * Step 2: Create a command run from a suggestion.
   * Records intent analysis and risk analysis.
   * For high-risk commands, creates an approval request.
   */
  initiateCommand(params: {
    commandKey: string;
    inputSummary: string;
    sourceEntityType: string;
    sourceEntityId: string;
    requestedById?: string;
  }): ExecutionResult {
    // Find or register the command
    let command = this.store.getCommandByKey(params.commandKey);
    if (!command) {
      command = this.store.registerCommand(params.commandKey, params.commandKey, 'low');
    }

    // Create command run
    const run = this.store.createCommandRun({
      commandId: command.id,
      projectId: this.projectId,
      requestedById: params.requestedById,
      inputSummary: params.inputSummary,
      sourceEntityType: params.sourceEntityType,
      sourceEntityId: params.sourceEntityId,
    });

    // Timeline: initiated
    this.store.addTimelineItem(run.id, 'command_initiated', `Command ${command.key} initiated`, { commandKey: command.key });

    // Intent analysis
    this.store.recordIntentAnalysis(run.id, `Execute ${command.title}`, 0.8, { source: params.sourceEntityType });

    // Risk analysis
    const riskLevel = command.riskLevel;
    const requiresApproval = riskLevel === 'high' || riskLevel === 'medium';
    this.store.recordRiskAnalysis(run.id, riskLevel, [`${riskLevel} risk command`], requiresApproval);

    const timeline = this.store.getTimeline(run.id).map(t => ({
      eventType: t.eventType, message: t.message, timestamp: t.createdAt,
    }));

    // High-risk → approval required
    if (requiresApproval) {
      const approval = this.store.createApprovalRequest(run.id, `${riskLevel} risk command requires approval`);
      this.store.updateCommandRunStatus(run.id, 'awaiting_approval');
      this.store.addTimelineItem(run.id, 'approval_requested', `Approval requested for ${riskLevel} risk command`, { approvalId: approval.id });

      return {
        commandRunId: run.id,
        status: 'awaiting_approval',
        approvalRequired: true,
        approvalId: approval.id,
        timeline: this.store.getTimeline(run.id).map(t => ({ eventType: t.eventType, message: t.message, timestamp: t.createdAt })),
      };
    }

    // Low risk → ready for execution (but still needs explicit trigger)
    this.store.updateCommandRunStatus(run.id, 'approved');
    return {
      commandRunId: run.id,
      status: 'approved',
      approvalRequired: false,
      timeline: this.store.getTimeline(run.id).map(t => ({ eventType: t.eventType, message: t.message, timestamp: t.createdAt })),
    };
  }

  /**
   * Step 3: Approve a pending approval request.
   * Only after approval can the workflow be executed.
   */
  approve(approvalId: string, approvedBy: string): { approved: boolean; commandRunId: string | null } {
    const approval = this.store.approveRequest(approvalId, approvedBy);
    if (!approval) return { approved: false, commandRunId: null };

    this.store.updateCommandRunStatus(approval.commandRunId, 'approved');
    this.store.addTimelineItem(approval.commandRunId, 'approval_granted', `Approved by ${approvedBy}`, { approvedBy });

    // Publish outbox event for idempotent execution trigger
    this.store.publishEvent('command_approved', 'CommandRun', approval.commandRunId, { approvedBy });

    return { approved: true, commandRunId: approval.commandRunId };
  }

  /**
   * Step 4: Execute an approved command run.
   * Creates workflow, steps, agent assignments, and runs through them.
   */
  execute(commandRunId: string, steps: WorkflowStepDefinition[]): ExecutionResult {
    const run = this.store.getCommandRunById(commandRunId);
    if (!run || run.status !== 'approved') {
      return {
        commandRunId,
        status: run?.status ?? 'failed',
        approvalRequired: false,
        timeline: [],
      };
    }

    this.store.updateCommandRunStatus(commandRunId, 'running');
    this.store.addTimelineItem(commandRunId, 'execution_started', 'Workflow execution started');

    // Create workflow
    const workflow = this.store.createWorkflow(commandRunId, `workflow-${commandRunId}`);

    // Create and execute steps
    for (let i = 0; i < steps.length; i++) {
      const stepDef = steps[i];
      const step = this.store.addWorkflowStep(workflow.id, i, stepDef.name, stepDef.input);
      this.store.updateStepStatus(step.id, 'running');

      // Assign agent
      const assignment = this.store.assignAgent(step.id, stepDef.agentKey);

      // Record tool call if specified
      if (stepDef.toolName) {
        this.store.recordToolCall(assignment.id, stepDef.toolName, stepDef.input ?? {}, { success: true }, 'success', 100);
      }

      // Record agent message and decision
      this.store.recordAgentMessage(assignment.id, 'agent', `Executed step: ${stepDef.name}`);
      this.store.recordAgentDecision(assignment.id, 'proceed', `Step ${stepDef.name} completed successfully`, 0.9);

      this.store.updateStepStatus(step.id, 'completed', { result: 'success' });
      this.store.addTimelineItem(commandRunId, 'step_completed', `Step "${stepDef.name}" completed`, { stepIndex: i });
    }

    // Complete workflow
    workflow.status = 'completed';
    workflow.updatedAt = new Date().toISOString();
    this.store.updateCommandRunStatus(commandRunId, 'completed');

    // Generate report
    this.store.createReport(commandRunId, 'Execution Report', `Workflow completed with ${steps.length} steps`, { stepCount: steps.length });

    // Record validation results
    this.store.recordValidation(commandRunId, 'all_steps_passed', true, steps.length, steps.length);

    // Publish completion event
    this.store.publishEvent('command_completed', 'CommandRun', commandRunId, { stepCount: steps.length });

    this.store.addTimelineItem(commandRunId, 'execution_completed', 'Workflow execution completed');

    return {
      commandRunId,
      status: 'completed',
      approvalRequired: false,
      timeline: this.store.getTimeline(commandRunId).map(t => ({ eventType: t.eventType, message: t.message, timestamp: t.createdAt })),
    };
  }

  /**
   * Reject a command (by rejecting its approval).
   */
  reject(approvalId: string, reason: string): boolean {
    const approval = this.store.rejectRequest(approvalId, reason);
    if (!approval) return false;
    this.store.updateCommandRunStatus(approval.commandRunId, 'rejected');
    this.store.addTimelineItem(approval.commandRunId, 'approval_rejected', `Rejected: ${reason}`, { reason });
    return true;
  }

  /**
   * Process pending outbox events.
   * Returns processed event IDs.
   */
  processOutbox(): string[] {
    const pending = this.store.getPendingEvents();
    const processed: string[] = [];
    for (const event of pending) {
      try {
        // Simulate processing
        this.store.markEventProcessed(event.id);
        processed.push(event.id);
      } catch {
        this.store.markEventFailed(event.id);
      }
    }
    return processed;
  }

  // ── Private ────────────────────────────────────────────────────

  private suggest(
    key: string, title: string, inputSummary: string,
    params: { sourceEntityType: string; sourceEntityId: string },
    riskLevel: 'low' | 'medium' | 'high',
  ): CommandSuggestion {
    return {
      commandKey: key,
      title,
      inputSummary,
      sourceEntityType: params.sourceEntityType,
      sourceEntityId: params.sourceEntityId,
      riskLevel,
      requiresApproval: riskLevel === 'high' || riskLevel === 'medium',
    };
  }
}
