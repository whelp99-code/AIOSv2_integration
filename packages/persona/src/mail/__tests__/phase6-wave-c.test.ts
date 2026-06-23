/**
 * Phase 6 Tests — Wave C: Automation Workflow Runtime
 *
 * Tests for:
 * - WaveCStore (19 models)
 * - AutomationWorkflowEngine (suggest → initiate → approve → execute flow)
 * - Red-team constraints: no auto side effects, approval gates, outbox pattern
 * - High-risk commands require approval
 * - Timeline tracking
 */

import { describe, it, expect } from 'vitest';
import { WaveCStore } from '../wave-c-store';
import { AutomationWorkflowEngine } from '../automation-engine';

// ── Helpers ───────────────────────────────────────────────────────────

function setupEngine(): { store: WaveCStore; engine: AutomationWorkflowEngine } {
  const store = new WaveCStore();
  const project = store.createProject('Test Project');
  const engine = new AutomationWorkflowEngine(store, project.id);
  return { store, engine };
}

// ── WaveCStore ────────────────────────────────────────────────────────

describe('WaveCStore', () => {
  it('creates project with members and workspace', () => {
    const store = new WaveCStore();
    const proj = store.createProject('Sales Automation');
    store.addMember(proj.id, 'user-1', 'owner');
    store.createWorkspace(proj.id, 'main-workspace');
    expect(store.projects).toHaveLength(1);
    expect(store.members).toHaveLength(1);
    expect(store.workspaces).toHaveLength(1);
  });

  it('registers and retrieves commands', () => {
    const store = new WaveCStore();
    store.registerCommand('send-quote', '견적서 발송', 'medium');
    expect(store.getCommandByKey('send-quote')?.title).toBe('견적서 발송');
    expect(store.getCommandByKey('nonexistent')).toBeNull();
  });

  it('creates command run with status tracking', () => {
    const store = new WaveCStore();
    const cmd = store.registerCommand('test', 'Test');
    const run = store.createCommandRun({ commandId: cmd.id, projectId: 'p1', inputSummary: 'test input' });
    expect(run.status).toBe('pending');
    store.updateCommandRunStatus(run.id, 'running');
    expect(store.getCommandRunById(run.id)?.status).toBe('running');
  });

  it('records intent and risk analysis', () => {
    const store = new WaveCStore();
    store.recordIntentAnalysis('run-1', 'send email', 0.85, { to: 'customer' });
    store.recordRiskAnalysis('run-1', 'high', ['external API call', 'customer-facing'], true);
    expect(store.intentAnalyses).toHaveLength(1);
    expect(store.riskAnalyses[0].requiresApproval).toBe(true);
  });

  it('creates workflow with steps', () => {
    const store = new WaveCStore();
    const wf = store.createWorkflow('run-1', 'send-quote-workflow');
    store.addWorkflowStep(wf.id, 0, 'prepare-quote', { amount: 1000 });
    store.addWorkflowStep(wf.id, 1, 'send-email');
    expect(store.workflowSteps).toHaveLength(2);
  });

  it('manages approval requests', () => {
    const store = new WaveCStore();
    const approval = store.createApprovalRequest('run-1', 'high risk');
    expect(approval.status).toBe('pending');
    expect(store.getPendingApprovals()).toHaveLength(1);
    store.approveRequest(approval.id, 'admin');
    expect(store.getPendingApprovals()).toHaveLength(0);
  });

  it('rejects approval request', () => {
    const store = new WaveCStore();
    const approval = store.createApprovalRequest('run-1');
    store.rejectRequest(approval.id, 'insufficient justification');
    expect(approval.status).toBe('rejected');
  });

  it('tracks timeline items', () => {
    const store = new WaveCStore();
    store.addTimelineItem('run-1', 'initiated', 'Command started');
    store.addTimelineItem('run-1', 'completed', 'Command done');
    expect(store.getTimeline('run-1')).toHaveLength(2);
  });

  it('manages outbox events with idempotency', () => {
    const store = new WaveCStore();
    const event = store.publishEvent('command_completed', 'CommandRun', 'run-1', { steps: 3 });
    expect(store.getPendingEvents()).toHaveLength(1);
    store.markEventProcessed(event.id);
    expect(store.getPendingEvents()).toHaveLength(0);
    expect(event.status).toBe('completed');
  });

  it('tracks outbox retry count on failure', () => {
    const store = new WaveCStore();
    const event = store.publishEvent('test', 'Test', 'id-1', {});
    store.markEventFailed(event.id);
    store.markEventFailed(event.id);
    expect(event.retryCount).toBe(2);
    expect(event.status).toBe('failed');
  });

  it('records agent assignment, tool calls, messages, decisions', () => {
    const store = new WaveCStore();
    const assignment = store.assignAgent('step-1', 'sales-agent');
    store.recordToolCall(assignment.id, 'send-email', { to: 'a@b.com' }, { sent: true }, 'success', 150);
    store.recordAgentMessage(assignment.id, 'agent', 'Email sent successfully');
    store.recordAgentDecision(assignment.id, 'proceed', 'All checks passed', 0.95);
    expect(store.toolCalls).toHaveLength(1);
    expect(store.agentMessages).toHaveLength(1);
    expect(store.agentDecisionLogs).toHaveLength(1);
  });

  it('creates report and validation results', () => {
    const store = new WaveCStore();
    store.createReport('run-1', 'Execution Report', 'All steps completed', { steps: 3, duration: 500 });
    store.recordValidation('run-1', 'all_steps_passed', true, 3, 3);
    expect(store.reports).toHaveLength(1);
    expect(store.validationResults[0].passed).toBe(true);
  });

  it('creates improvement candidate with proposed status', () => {
    const store = new WaveCStore();
    const imp = store.createImprovementCandidate('run-1', 'performance', 'Cache optimization', 'Add caching for repeated queries');
    expect(imp.status).toBe('proposed');
  });
});

// ── AutomationWorkflowEngine ──────────────────────────────────────────

describe('AutomationWorkflowEngine', () => {
  it('suggests commands from classification — no auto side effects', () => {
    const { store, engine } = setupEngine();

    const suggestions = engine.suggestCommands({
      category: 'SALES',
      confidence: 0.9,
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-001',
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].commandKey).toBe('send-quote');
    expect(suggestions[0].requiresApproval).toBe(true); // medium risk

    // No side effects — store is empty
    expect(store.commandRuns).toHaveLength(0);
  });

  it('suggests high-risk commands for ENGINEER category', () => {
    const { engine } = setupEngine();
    const suggestions = engine.suggestCommands({
      category: 'ENGINEER', confidence: 0.85,
      sourceEntityType: 'MailClassification', sourceEntityId: 'mc-002',
    });
    expect(suggestions[0].commandKey).toBe('create-pr');
    expect(suggestions[0].riskLevel).toBe('high');
    expect(suggestions[0].requiresApproval).toBe(true);
  });

  it('suggests low-risk commands for PM category', () => {
    const { engine } = setupEngine();
    const suggestions = engine.suggestCommands({
      category: 'PM', confidence: 0.8,
      sourceEntityType: 'MailClassification', sourceEntityId: 'mc-003',
    });
    expect(suggestions[0].commandKey).toBe('create-task');
    expect(suggestions[0].riskLevel).toBe('low');
    expect(suggestions[0].requiresApproval).toBe(false);
  });

  it('initiates command with approval for high-risk', () => {
    const { store, engine } = setupEngine();
    store.registerCommand('create-pr', 'PR 생성', 'high');

    const result = engine.initiateCommand({
      commandKey: 'create-pr',
      inputSummary: 'Create PR for bug fix',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-001',
    });

    expect(result.status).toBe('awaiting_approval');
    expect(result.approvalRequired).toBe(true);
    expect(result.approvalId).toBeTruthy();
    expect(store.approvalRequests).toHaveLength(1);
    expect(store.intentAnalyses).toHaveLength(1);
    expect(store.riskAnalyses).toHaveLength(1);
  });

  it('initiates command without approval for low-risk', () => {
    const { store, engine } = setupEngine();
    store.registerCommand('create-task', '작업 생성', 'low');

    const result = engine.initiateCommand({
      commandKey: 'create-task',
      inputSummary: 'Create task from mail',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-002',
    });

    expect(result.status).toBe('approved');
    expect(result.approvalRequired).toBe(false);
  });

  it('blocks execution until approval is granted', () => {
    const { store, engine } = setupEngine();
    store.registerCommand('send-quote', '견적서 발송', 'medium');

    const init = engine.initiateCommand({
      commandKey: 'send-quote',
      inputSummary: 'Send quote to customer',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-003',
    });

    expect(init.status).toBe('awaiting_approval');

    // Try to execute without approval — should fail
    const execResult = engine.execute(init.commandRunId, [
      { name: 'prepare', agentKey: 'sales-agent' },
    ]);
    expect(execResult.status).toBe('awaiting_approval');
  });

  it('executes workflow after approval', () => {
    const { store, engine } = setupEngine();
    store.registerCommand('send-quote', '견적서 발송', 'medium');

    const init = engine.initiateCommand({
      commandKey: 'send-quote',
      inputSummary: 'Send quote',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-004',
    });

    // Approve
    const approval = engine.approve(init.approvalId!, 'manager');
    expect(approval.approved).toBe(true);

    // Execute
    const result = engine.execute(init.commandRunId, [
      { name: 'prepare-quote', agentKey: 'sales-agent', toolName: 'quote-api' },
      { name: 'send-email', agentKey: 'mail-agent', toolName: 'email-api' },
    ]);

    expect(result.status).toBe('completed');
    expect(result.timeline.length).toBeGreaterThan(0);

    // Verify store state
    expect(store.workflows).toHaveLength(1);
    expect(store.workflowSteps).toHaveLength(2);
    expect(store.agentAssignments).toHaveLength(2);
    expect(store.toolCalls).toHaveLength(2);
    expect(store.reports).toHaveLength(1);
    expect(store.validationResults).toHaveLength(1);
  });

  it('rejects approval and blocks execution', () => {
    const { store, engine } = setupEngine();
    store.registerCommand('escalate', '에스컬레이션', 'high');

    const init = engine.initiateCommand({
      commandKey: 'escalate',
      inputSummary: 'Escalate to CEO',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-005',
    });

    const rejected = engine.reject(init.approvalId!, 'Not justified');
    expect(rejected).toBe(true);
    expect(store.getCommandRunById(init.commandRunId)?.status).toBe('rejected');
  });

  it('publishes outbox events for idempotency', () => {
    const { store, engine } = setupEngine();
    store.registerCommand('create-task', '작업 생성', 'low');

    const init = engine.initiateCommand({
      commandKey: 'create-task',
      inputSummary: 'Task from mail',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-006',
    });

    engine.execute(init.commandRunId, [{ name: 'create', agentKey: 'pm-agent' }]);

    // Should have outbox events
    expect(store.outboxEvents.length).toBeGreaterThanOrEqual(1);
    const completed = store.outboxEvents.filter(e => e.eventType === 'command_completed');
    expect(completed.length).toBe(1);
  });

  it('processes outbox events', () => {
    const { store, engine } = setupEngine();
    store.publishEvent('test', 'Test', 'id-1', {});
    store.publishEvent('test', 'Test', 'id-2', {});

    const processed = engine.processOutbox();
    expect(processed).toHaveLength(2);
    expect(store.getPendingEvents()).toHaveLength(0);
  });

  it('timeline tracks all execution phases', () => {
    const { store, engine } = setupEngine();
    store.registerCommand('send-quote', '견적서 발송', 'medium');

    const init = engine.initiateCommand({
      commandKey: 'send-quote',
      inputSummary: 'Send quote',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-007',
    });

    engine.approve(init.approvalId!, 'admin');
    engine.execute(init.commandRunId, [
      { name: 'step-1', agentKey: 'agent-1' },
      { name: 'step-2', agentKey: 'agent-2' },
    ]);

    const timeline = store.getTimeline(init.commandRunId);
    const eventTypes = timeline.map(t => t.eventType);
    expect(eventTypes).toContain('command_initiated');
    expect(eventTypes).toContain('approval_requested');
    expect(eventTypes).toContain('approval_granted');
    expect(eventTypes).toContain('execution_started');
    expect(eventTypes).toContain('step_completed');
    expect(eventTypes).toContain('execution_completed');
  });

  it('summary() returns all collection counts', () => {
    const { store, engine } = setupEngine();
    store.registerCommand('test', 'Test', 'low');
    const init = engine.initiateCommand({
      commandKey: 'test', inputSummary: 'Test', sourceEntityType: 'Mail', sourceEntityId: 'm1',
    });
    engine.execute(init.commandRunId, [{ name: 'step', agentKey: 'agent' }]);
    const s = store.summary();
    expect(s.commandRuns).toBe(1);
    expect(s.workflows).toBe(1);
    expect(s.commands).toBe(1);
  });
});
