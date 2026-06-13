import { describe, expect, it } from 'vitest';
import { AgentSessionCoordinator, createDefaultParticipants } from '../src/agents/session-coordinator';
import type { CollaborationWorkspaceState } from '@aios/domain';

class InMemoryCollaborationStore {
  constructor(private state: CollaborationWorkspaceState) {}

  async loadState(): Promise<CollaborationWorkspaceState> {
    return this.state;
  }

  async saveState(state: CollaborationWorkspaceState): Promise<void> {
    this.state = state;
  }
}

describe('AgentSessionCoordinator', () => {
  it('creates sessions and records assignments/handoffs in shared state', async () => {
    const store = new InMemoryCollaborationStore({
      schemaVersion: 1,
      workspaceRoot: '/repo',
      lastUpdatedAt: new Date().toISOString(),
      projects: [],
      sessions: [],
    });
    const coordinator = new AgentSessionCoordinator(store);

    const session = await coordinator.createSession({
      title: 'Cursor + opencode collaboration',
      objective: 'shared execution flow',
      owner: 'cursor',
      participants: createDefaultParticipants(),
      metadata: { channel: 'plan' },
    });

    const assignment = await coordinator.addAssignment(session.id, {
      title: 'Implement session store',
      description: 'Persist the collaboration state to .aios/context',
      assignedTo: 'opencode',
      role: 'implementer',
      targetFiles: ['packages/infrastructure/src/collaboration/session-file-store.ts'],
      requiredApprovals: ['review'],
    });

    const handoff = await coordinator.addHandoff(session.id, {
      from: 'cursor',
      to: 'opencode',
      reason: 'implementation',
      summary: 'Cursor defined the plan, opencode will implement it.',
    });

    const updatedSession = await coordinator.getSession(session.id);
    const summary = await coordinator.getSummary();

    expect(updatedSession).not.toBeNull();
    expect(updatedSession?.assignments).toHaveLength(1);
    expect(updatedSession?.handoffs).toHaveLength(1);
    expect(assignment.assignedTo).toBe('opencode');
    expect(handoff.from).toBe('cursor');
    expect(summary.totalSessions).toBe(1);
    expect(summary.pendingAssignments).toBe(1);
    expect(summary.toolsInUse).toContain('cursor');
    expect(summary.toolsInUse).toContain('opencode');
  });

  it('updates assignment status and derives waiting/blocked/completed session state', async () => {
    const store = new InMemoryCollaborationStore({
      schemaVersion: 1,
      workspaceRoot: '/repo',
      lastUpdatedAt: new Date().toISOString(),
      projects: [],
      sessions: [],
    });
    const coordinator = new AgentSessionCoordinator(store);

    const session = await coordinator.createSession({
      title: 'Approval flow session',
      objective: 'verify session status derivation',
      owner: 'cursor',
      participants: createDefaultParticipants(),
    });

    const assignment = await coordinator.addAssignment(session.id, {
      title: 'Protected deploy',
      description: 'Requires manual approval',
      assignedTo: 'opencode',
      role: 'implementer',
      targetFiles: ['apps/api/src/index.ts'],
      requiredApprovals: ['deploy'],
    });

    await coordinator.updateAssignment(session.id, assignment.id, {
      status: 'waiting-for-approval',
    });

    let updated = await coordinator.getSession(session.id);
    expect(updated?.status).toBe('waiting-for-review');

    await coordinator.updateAssignment(session.id, assignment.id, {
      status: 'failed',
    });

    updated = await coordinator.getSession(session.id);
    expect(updated?.status).toBe('blocked');

    await coordinator.updateAssignment(session.id, assignment.id, {
      status: 'done',
    });

    updated = await coordinator.getSession(session.id);
    expect(updated?.status).toBe('completed');
  });
});
