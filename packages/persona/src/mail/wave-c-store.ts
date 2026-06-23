/**
 * Wave C Store — Phase 6: Automation Workflow Runtime
 *
 * In-memory store for 19 Wave C models:
 * AutomationProject, AutomationProjectMember, AutomationWorkspace,
 * Command, CommandRun, IntentAnalysis, RiskAnalysis,
 * AutomationWorkflow, AutomationWorkflowStep, AgentAssignment,
 * ToolCall, AgentMessage, AgentDecisionLog,
 * AutomationApprovalRequest, AutomationReport, ValidationResult,
 * ImprovementCandidate, RunTimelineItem, OutboxEvent
 *
 * Key constraints from replan:
 * - 분류 결과가 자동 side effect를 만들 수 없음
 * - command suggestion까지만 자동 생성
 * - AutomationApprovalRequest 승인 후 workflow 실행
 * - OutboxEvent로 retry/idempotency 보장
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 6
 */

import type { PersonaType } from './classifier';

// ═══════════════════════════════════════════════════════════════════════
// Model Types
// ═══════════════════════════════════════════════════════════════════════

export interface AutomationProjectRecord {
  id: string; name: string; description: string | null; status: 'active' | 'paused' | 'completed'; createdAt: string;
}
export interface AutomationProjectMemberRecord {
  id: string; projectId: string; userId: string; role: 'owner' | 'member' | 'viewer'; createdAt: string;
}
export interface AutomationWorkspaceRecord {
  id: string; projectId: string; name: string; config: Record<string, unknown> | null; createdAt: string;
}
export interface CommandRecord {
  id: string; key: string; title: string; description: string | null; riskLevel: 'low' | 'medium' | 'high'; createdAt: string;
}
export type CommandRunStatus = 'pending' | 'awaiting_approval' | 'approved' | 'running' | 'completed' | 'failed' | 'rejected' | 'cancelled';
export interface CommandRunRecord {
  id: string; commandId: string; projectId: string; requestedById: string | null;
  status: CommandRunStatus; inputSummary: string | null;
  sourceEntityType: string | null; sourceEntityId: string | null;
  createdAt: string; updatedAt: string;
}
export interface IntentAnalysisRecord {
  id: string; commandRunId: string; intent: string; confidence: number; entities: Record<string, unknown>; createdAt: string;
}
export interface RiskAnalysisRecord {
  id: string; commandRunId: string; riskLevel: 'low' | 'medium' | 'high'; factors: string[]; requiresApproval: boolean; createdAt: string;
}
export interface AutomationWorkflowRecord {
  id: string; commandRunId: string; name: string; status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'; createdAt: string; updatedAt: string;
}
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export interface AutomationWorkflowStepRecord {
  id: string; workflowId: string; stepIndex: number; name: string; status: StepStatus; input: Record<string, unknown> | null; output: Record<string, unknown> | null; createdAt: string;
}
export interface AgentAssignmentRecord {
  id: string; stepId: string; agentKey: string; status: 'assigned' | 'running' | 'completed' | 'failed'; createdAt: string;
}
export interface ToolCallRecord {
  id: string; assignmentId: string; toolName: string; input: Record<string, unknown>; output: Record<string, unknown> | null; status: 'pending' | 'success' | 'error'; latencyMs: number | null; createdAt: string;
}
export interface AgentMessageRecord {
  id: string; assignmentId: string; role: 'user' | 'agent' | 'system'; content: string; createdAt: string;
}
export interface AgentDecisionLogRecord {
  id: string; assignmentId: string; decision: string; reasoning: string; confidence: number; createdAt: string;
}
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export interface AutomationApprovalRequestRecord {
  id: string; commandRunId: string; status: ApprovalStatus; reason: string | null; approvedBy: string | null; createdAt: string; resolvedAt: string | null;
}
export interface AutomationReportRecord {
  id: string; commandRunId: string; title: string; summary: string; metrics: Record<string, number> | null; createdAt: string;
}
export interface ValidationResultRecord {
  id: string; commandRunId: string; checkKey: string; passed: boolean; actualValue: number | null; threshold: number | null; createdAt: string;
}
export interface ImprovementCandidateRecord {
  id: string; commandRunId: string; candidateType: string; title: string; description: string; status: 'proposed' | 'accepted' | 'rejected'; createdAt: string;
}
export interface RunTimelineItemRecord {
  id: string; commandRunId: string; eventType: string; message: string; metadata: Record<string, unknown> | null; createdAt: string;
}
export type OutboxStatus = 'pending' | 'processing' | 'completed' | 'failed';
export interface OutboxEventRecord {
  id: string; eventType: string; aggregateType: string; aggregateId: string; payload: Record<string, unknown>;
  status: OutboxStatus; createdAt: string; processedAt: string | null; retryCount: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Wave C Store
// ═══════════════════════════════════════════════════════════════════════

let nextId = 1;
function genId(prefix: string = 'wc'): string { return `${prefix}-${String(nextId++).padStart(8, '0')}`; }

export class WaveCStore {
  readonly projects: AutomationProjectRecord[] = [];
  readonly members: AutomationProjectMemberRecord[] = [];
  readonly workspaces: AutomationWorkspaceRecord[] = [];
  readonly commands: CommandRecord[] = [];
  readonly commandRuns: CommandRunRecord[] = [];
  readonly intentAnalyses: IntentAnalysisRecord[] = [];
  readonly riskAnalyses: RiskAnalysisRecord[] = [];
  readonly workflows: AutomationWorkflowRecord[] = [];
  readonly workflowSteps: AutomationWorkflowStepRecord[] = [];
  readonly agentAssignments: AgentAssignmentRecord[] = [];
  readonly toolCalls: ToolCallRecord[] = [];
  readonly agentMessages: AgentMessageRecord[] = [];
  readonly agentDecisionLogs: AgentDecisionLogRecord[] = [];
  readonly approvalRequests: AutomationApprovalRequestRecord[] = [];
  readonly reports: AutomationReportRecord[] = [];
  readonly validationResults: ValidationResultRecord[] = [];
  readonly improvementCandidates: ImprovementCandidateRecord[] = [];
  readonly timelineItems: RunTimelineItemRecord[] = [];
  readonly outboxEvents: OutboxEventRecord[] = [];

  // ── Project ────────────────────────────────────────────────────

  createProject(name: string, description?: string): AutomationProjectRecord {
    const r: AutomationProjectRecord = { id: genId('proj'), name, description: description ?? null, status: 'active', createdAt: new Date().toISOString() };
    this.projects.push(r); return r;
  }
  addMember(projectId: string, userId: string, role: AutomationProjectMemberRecord['role'] = 'member'): AutomationProjectMemberRecord {
    const r: AutomationProjectMemberRecord = { id: genId('mem'), projectId, userId, role, createdAt: new Date().toISOString() };
    this.members.push(r); return r;
  }
  createWorkspace(projectId: string, name: string, config?: Record<string, unknown>): AutomationWorkspaceRecord {
    const r: AutomationWorkspaceRecord = { id: genId('ws'), projectId, name, config: config ?? null, createdAt: new Date().toISOString() };
    this.workspaces.push(r); return r;
  }

  // ── Command ────────────────────────────────────────────────────

  registerCommand(key: string, title: string, riskLevel: CommandRecord['riskLevel'] = 'low', description?: string): CommandRecord {
    const r: CommandRecord = { id: genId('cmd'), key, title, description: description ?? null, riskLevel, createdAt: new Date().toISOString() };
    this.commands.push(r); return r;
  }
  getCommandByKey(key: string): CommandRecord | null { return this.commands.find(c => c.key === key) ?? null; }

  // ── CommandRun ─────────────────────────────────────────────────

  createCommandRun(params: { commandId: string; projectId: string; requestedById?: string; inputSummary?: string; sourceEntityType?: string; sourceEntityId?: string }): CommandRunRecord {
    const r: CommandRunRecord = {
      id: genId('run'), commandId: params.commandId, projectId: params.projectId, requestedById: params.requestedById ?? null,
      status: 'pending', inputSummary: params.inputSummary ?? null,
      sourceEntityType: params.sourceEntityType ?? null, sourceEntityId: params.sourceEntityId ?? null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.commandRuns.push(r); return r;
  }
  updateCommandRunStatus(runId: string, status: CommandRunStatus): CommandRunRecord | null {
    const r = this.commandRuns.find(cr => cr.id === runId); if (!r) return null;
    r.status = status; r.updatedAt = new Date().toISOString(); return r;
  }
  getCommandRunById(id: string): CommandRunRecord | null { return this.commandRuns.find(cr => cr.id === id) ?? null; }

  // ── Intent / Risk Analysis ─────────────────────────────────────

  recordIntentAnalysis(commandRunId: string, intent: string, confidence: number, entities: Record<string, unknown> = {}): IntentAnalysisRecord {
    const r: IntentAnalysisRecord = { id: genId('intent'), commandRunId, intent, confidence, entities, createdAt: new Date().toISOString() };
    this.intentAnalyses.push(r); return r;
  }
  recordRiskAnalysis(commandRunId: string, riskLevel: RiskAnalysisRecord['riskLevel'], factors: string[], requiresApproval: boolean): RiskAnalysisRecord {
    const r: RiskAnalysisRecord = { id: genId('risk'), commandRunId, riskLevel, factors, requiresApproval, createdAt: new Date().toISOString() };
    this.riskAnalyses.push(r); return r;
  }

  // ── Workflow ───────────────────────────────────────────────────

  createWorkflow(commandRunId: string, name: string): AutomationWorkflowRecord {
    const r: AutomationWorkflowRecord = { id: genId('wf'), commandRunId, name, status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.workflows.push(r); return r;
  }
  addWorkflowStep(workflowId: string, stepIndex: number, name: string, input?: Record<string, unknown>): AutomationWorkflowStepRecord {
    const r: AutomationWorkflowStepRecord = { id: genId('step'), workflowId, stepIndex, name, status: 'pending', input: input ?? null, output: null, createdAt: new Date().toISOString() };
    this.workflowSteps.push(r); return r;
  }
  updateStepStatus(stepId: string, status: StepStatus, output?: Record<string, unknown>): AutomationWorkflowStepRecord | null {
    const s = this.workflowSteps.find(st => st.id === stepId); if (!s) return null;
    s.status = status; if (output) s.output = output; return s;
  }

  // ── Agent Assignment ───────────────────────────────────────────

  assignAgent(stepId: string, agentKey: string): AgentAssignmentRecord {
    const r: AgentAssignmentRecord = { id: genId('assign'), stepId, agentKey, status: 'assigned', createdAt: new Date().toISOString() };
    this.agentAssignments.push(r); return r;
  }
  recordToolCall(assignmentId: string, toolName: string, input: Record<string, unknown>, output?: Record<string, unknown>, status: ToolCallRecord['status'] = 'success', latencyMs?: number): ToolCallRecord {
    const r: ToolCallRecord = { id: genId('tc'), assignmentId, toolName, input, output: output ?? null, status, latencyMs: latencyMs ?? null, createdAt: new Date().toISOString() };
    this.toolCalls.push(r); return r;
  }
  recordAgentMessage(assignmentId: string, role: AgentMessageRecord['role'], content: string): AgentMessageRecord {
    const r: AgentMessageRecord = { id: genId('amsg'), assignmentId, role, content, createdAt: new Date().toISOString() };
    this.agentMessages.push(r); return r;
  }
  recordAgentDecision(assignmentId: string, decision: string, reasoning: string, confidence: number): AgentDecisionLogRecord {
    const r: AgentDecisionLogRecord = { id: genId('adec'), assignmentId, decision, reasoning, confidence, createdAt: new Date().toISOString() };
    this.agentDecisionLogs.push(r); return r;
  }

  // ── Approval ───────────────────────────────────────────────────

  createApprovalRequest(commandRunId: string, reason?: string): AutomationApprovalRequestRecord {
    const r: AutomationApprovalRequestRecord = { id: genId('appr'), commandRunId, status: 'pending', reason: reason ?? null, approvedBy: null, createdAt: new Date().toISOString(), resolvedAt: null };
    this.approvalRequests.push(r); return r;
  }
  approveRequest(approvalId: string, approvedBy: string): AutomationApprovalRequestRecord | null {
    const r = this.approvalRequests.find(a => a.id === approvalId); if (!r || r.status !== 'pending') return null;
    r.status = 'approved'; r.approvedBy = approvedBy; r.resolvedAt = new Date().toISOString(); return r;
  }
  rejectRequest(approvalId: string, reason: string): AutomationApprovalRequestRecord | null {
    const r = this.approvalRequests.find(a => a.id === approvalId); if (!r || r.status !== 'pending') return null;
    r.status = 'rejected'; r.reason = reason; r.resolvedAt = new Date().toISOString(); return r;
  }
  getPendingApprovals(): AutomationApprovalRequestRecord[] { return this.approvalRequests.filter(a => a.status === 'pending'); }

  // ── Report / Validation / Improvement ──────────────────────────

  createReport(commandRunId: string, title: string, summary: string, metrics?: Record<string, number>): AutomationReportRecord {
    const r: AutomationReportRecord = { id: genId('rpt'), commandRunId, title, summary, metrics: metrics ?? null, createdAt: new Date().toISOString() };
    this.reports.push(r); return r;
  }
  recordValidation(commandRunId: string, checkKey: string, passed: boolean, actualValue?: number, threshold?: number): ValidationResultRecord {
    const r: ValidationResultRecord = { id: genId('val'), commandRunId, checkKey, passed, actualValue: actualValue ?? null, threshold: threshold ?? null, createdAt: new Date().toISOString() };
    this.validationResults.push(r); return r;
  }
  createImprovementCandidate(commandRunId: string, candidateType: string, title: string, description: string): ImprovementCandidateRecord {
    const r: ImprovementCandidateRecord = { id: genId('imp'), commandRunId, candidateType, title, description, status: 'proposed', createdAt: new Date().toISOString() };
    this.improvementCandidates.push(r); return r;
  }

  // ── Timeline ───────────────────────────────────────────────────

  addTimelineItem(commandRunId: string, eventType: string, message: string, metadata?: Record<string, unknown>): RunTimelineItemRecord {
    const r: RunTimelineItemRecord = { id: genId('tl'), commandRunId, eventType, message, metadata: metadata ?? null, createdAt: new Date().toISOString() };
    this.timelineItems.push(r); return r;
  }
  getTimeline(commandRunId: string): RunTimelineItemRecord[] {
    return this.timelineItems.filter(t => t.commandRunId === commandRunId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // ── Outbox ─────────────────────────────────────────────────────

  publishEvent(eventType: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>): OutboxEventRecord {
    const r: OutboxEventRecord = { id: genId('obx'), eventType, aggregateType, aggregateId, payload, status: 'pending', createdAt: new Date().toISOString(), processedAt: null, retryCount: 0 };
    this.outboxEvents.push(r); return r;
  }
  markEventProcessed(eventId: string): OutboxEventRecord | null {
    const e = this.outboxEvents.find(ev => ev.id === eventId); if (!e) return null;
    e.status = 'completed'; e.processedAt = new Date().toISOString(); return e;
  }
  markEventFailed(eventId: string): OutboxEventRecord | null {
    const e = this.outboxEvents.find(ev => ev.id === eventId); if (!e) return null;
    e.status = 'failed'; e.retryCount++; return e;
  }
  getPendingEvents(): OutboxEventRecord[] { return this.outboxEvents.filter(e => e.status === 'pending'); }

  // ── Summary ────────────────────────────────────────────────────

  summary(): Record<string, number> {
    return {
      projects: this.projects.length, members: this.members.length, workspaces: this.workspaces.length,
      commands: this.commands.length, commandRuns: this.commandRuns.length,
      intentAnalyses: this.intentAnalyses.length, riskAnalyses: this.riskAnalyses.length,
      workflows: this.workflows.length, workflowSteps: this.workflowSteps.length,
      agentAssignments: this.agentAssignments.length, toolCalls: this.toolCalls.length,
      agentMessages: this.agentMessages.length, agentDecisionLogs: this.agentDecisionLogs.length,
      approvalRequests: this.approvalRequests.length, reports: this.reports.length,
      validationResults: this.validationResults.length, improvementCandidates: this.improvementCandidates.length,
      timelineItems: this.timelineItems.length, outboxEvents: this.outboxEvents.length,
    };
  }

  clear(): void {
    for (const key of Object.keys(this) as Array<keyof WaveCStore>) {
      if (Array.isArray(this[key])) (this[key] as unknown[]).length = 0;
    }
  }
}
