/**
 * Collaboration Session Coordinator
 * Cursor, opencode, Codex 세션을 저장소 기반으로 정리/연결하는 코디네이터
 */

import type {
  CollaborationArtifact,
  CollaborationAssignment,
  CollaborationAssignmentCreateRequest,
  CollaborationHandoff,
  CollaborationHandoffCreateRequest,
  CollaborationParticipant,
  CollaborationSession,
  CollaborationSessionCreateRequest,
  CollaborationSessionStatus,
  CollaborationSessionUpdateRequest,
  CollaborationWorkspaceProject,
  CollaborationWorkspaceState,
  CollaborationTool,
} from '@aios/domain';
import {
  createCollaborationWorkspaceProjects,
  createDefaultCollaborationParticipants,
} from '@aios/domain';

type CollaborationAssignmentStatus = CollaborationAssignment['status'];

export interface CollaborationSessionStore {
  loadState(): Promise<CollaborationWorkspaceState>;
  saveState(state: CollaborationWorkspaceState): Promise<void>;
}

export interface SessionSummary {
  totalSessions: number;
  activeSessions: number;
  blockedSessions: number;
  deferredSessions: number;
  pendingAssignments: number;
  toolsInUse: CollaborationTool[];
}

export interface IAgentSessionCoordinator {
  createSession(request: CollaborationSessionCreateRequest): Promise<CollaborationSession>;
  updateSession(sessionId: string, request: CollaborationSessionUpdateRequest): Promise<CollaborationSession>;
  listSessions(status?: CollaborationSessionStatus): Promise<CollaborationSession[]>;
  getSession(sessionId: string): Promise<CollaborationSession | null>;
  addAssignment(sessionId: string, request: CollaborationAssignmentCreateRequest): Promise<CollaborationAssignment>;
  updateAssignment(
    sessionId: string,
    assignmentId: string,
    request: { status?: CollaborationAssignmentStatus; metadata?: Record<string, unknown> },
  ): Promise<CollaborationAssignment>;
  getAssignment(sessionId: string, assignmentId: string): Promise<CollaborationAssignment | null>;
  addHandoff(sessionId: string, request: CollaborationHandoffCreateRequest): Promise<CollaborationHandoff>;
  addArtifact(sessionId: string, artifact: CollaborationArtifact): Promise<CollaborationArtifact>;
  getSummary(): Promise<SessionSummary>;
}

const ACTIVE_STATUSES: CollaborationSessionStatus[] = ['planned', 'in-progress', 'waiting-for-review'];

export class AgentSessionCoordinator implements IAgentSessionCoordinator {
  constructor(private readonly store: CollaborationSessionStore) {}

  async createSession(request: CollaborationSessionCreateRequest): Promise<CollaborationSession> {
    const state = await this.store.loadState();
    const now = new Date();
    const session: CollaborationSession = {
      id: createSessionId('session'),
      title: request.title,
      objective: request.objective,
      status: 'planned',
      owner: request.owner,
      participants: request.participants,
      assignments: [],
      handoffs: [],
      artifacts: [],
      createdAt: now,
      updatedAt: now,
      metadata: request.metadata ?? {},
    };

    state.sessions.push(session);
    state.lastUpdatedAt = now.toISOString();
    await this.store.saveState(state);
    return session;
  }

  async updateSession(sessionId: string, request: CollaborationSessionUpdateRequest): Promise<CollaborationSession> {
    const state = await this.store.loadState();
    const session = this.findSessionOrThrow(state.sessions, sessionId);
    const updatedSession: CollaborationSession = {
      ...session,
      title: request.title ?? session.title,
      objective: request.objective ?? session.objective,
      status: request.status ?? session.status,
      owner: request.owner ?? session.owner,
      metadata: {
        ...session.metadata,
        ...(request.metadata ?? {}),
      },
      updatedAt: new Date(),
    };

    this.replaceSession(state.sessions, updatedSession);
    state.lastUpdatedAt = updatedSession.updatedAt.toISOString();
    await this.store.saveState(state);
    return updatedSession;
  }

  async listSessions(status?: CollaborationSessionStatus): Promise<CollaborationSession[]> {
    const state = await this.store.loadState();
    const sessions = status ? state.sessions.filter((session) => session.status === status) : state.sessions;
    return [...sessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getSession(sessionId: string): Promise<CollaborationSession | null> {
    const state = await this.store.loadState();
    return state.sessions.find((session) => session.id === sessionId) ?? null;
  }

  async addAssignment(sessionId: string, request: CollaborationAssignmentCreateRequest): Promise<CollaborationAssignment> {
    const state = await this.store.loadState();
    const session = this.findSessionOrThrow(state.sessions, sessionId);
    const now = new Date();
    const assignment: CollaborationAssignment = {
      id: createSessionId('assignment'),
      title: request.title,
      description: request.description,
      assignedTo: request.assignedTo,
      role: request.role,
      targetFiles: request.targetFiles,
      requiredApprovals: request.requiredApprovals ?? [],
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      metadata: request.metadata ?? {},
    };

    session.assignments.push(assignment);
    session.status = this.deriveSessionStatus(session);
    session.updatedAt = now;
    state.lastUpdatedAt = now.toISOString();
    await this.store.saveState(state);
    return assignment;
  }

  async updateAssignment(
    sessionId: string,
    assignmentId: string,
    request: { status?: CollaborationAssignmentStatus; metadata?: Record<string, unknown> },
  ): Promise<CollaborationAssignment> {
    const state = await this.store.loadState();
    const session = this.findSessionOrThrow(state.sessions, sessionId);
    const assignment = this.findAssignmentOrThrow(session, assignmentId);
    const now = new Date();
    const updatedAssignment: CollaborationAssignment = {
      ...assignment,
      status: request.status ?? assignment.status,
      metadata: {
        ...assignment.metadata,
        ...(request.metadata ?? {}),
      },
      updatedAt: now,
    };

    const index = session.assignments.findIndex((entry) => entry.id === assignmentId);
    session.assignments[index] = updatedAssignment;
    session.status = this.deriveSessionStatus(session);
    session.updatedAt = now;
    state.lastUpdatedAt = now.toISOString();
    await this.store.saveState(state);
    return updatedAssignment;
  }

  async getAssignment(sessionId: string, assignmentId: string): Promise<CollaborationAssignment | null> {
    const session = await this.getSession(sessionId);
    return session?.assignments.find((assignment) => assignment.id === assignmentId) ?? null;
  }

  async addHandoff(sessionId: string, request: CollaborationHandoffCreateRequest): Promise<CollaborationHandoff> {
    const state = await this.store.loadState();
    const session = this.findSessionOrThrow(state.sessions, sessionId);
    const now = new Date();
    const handoff: CollaborationHandoff = {
      id: createSessionId('handoff'),
      from: request.from,
      to: request.to,
      reason: request.reason,
      summary: request.summary,
      createdAt: now,
      metadata: request.metadata ?? {},
    };

    session.handoffs.push(handoff);
    session.status = this.deriveSessionStatus(session);
    session.updatedAt = now;
    state.lastUpdatedAt = now.toISOString();
    await this.store.saveState(state);
    return handoff;
  }

  async addArtifact(sessionId: string, artifact: CollaborationArtifact): Promise<CollaborationArtifact> {
    const state = await this.store.loadState();
    const session = this.findSessionOrThrow(state.sessions, sessionId);
    session.artifacts.push(artifact);
    session.status = this.deriveSessionStatus(session);
    session.updatedAt = new Date();
    state.lastUpdatedAt = session.updatedAt.toISOString();
    await this.store.saveState(state);
    return artifact;
  }

  async getSummary(): Promise<SessionSummary> {
    const state = await this.store.loadState();
    const activeSessions = state.sessions.filter((session) => ACTIVE_STATUSES.includes(session.status));
    const blockedSessions = state.sessions.filter((session) => session.status === 'blocked').length;
    const deferredSessions = state.sessions.filter((session) => session.status === 'deferred').length;
    const pendingAssignments = state.sessions.reduce(
      (count, session) => count + session.assignments.filter((assignment) => assignment.status !== 'done').length,
      0,
    );

    return {
      totalSessions: state.sessions.length,
      activeSessions: activeSessions.length,
      blockedSessions,
      deferredSessions,
      pendingAssignments,
      toolsInUse: this.collectTools(state.sessions),
    };
  }

  private findSessionOrThrow(sessions: CollaborationSession[], sessionId: string): CollaborationSession {
    const session = sessions.find((entry) => entry.id === sessionId);
    if (!session) {
      throw new Error(`Collaboration session not found: ${sessionId}`);
    }
    return session;
  }

  private replaceSession(sessions: CollaborationSession[], updatedSession: CollaborationSession): void {
    const index = sessions.findIndex((session) => session.id === updatedSession.id);
    if (index === -1) {
      throw new Error(`Collaboration session not found: ${updatedSession.id}`);
    }
    sessions[index] = updatedSession;
  }

  private findAssignmentOrThrow(session: CollaborationSession, assignmentId: string): CollaborationAssignment {
    const assignment = session.assignments.find((entry) => entry.id === assignmentId);
    if (!assignment) {
      throw new Error(`Collaboration assignment not found: ${assignmentId}`);
    }
    return assignment;
  }

  private deriveSessionStatus(session: CollaborationSession): CollaborationSessionStatus {
    if (session.assignments.some((assignment) => assignment.status === 'failed')) {
      return 'blocked';
    }
    if (session.assignments.some((assignment) => assignment.status === 'deferred')) {
      return 'deferred';
    }
    if (session.assignments.some((assignment) => assignment.status === 'waiting-for-approval')) {
      return 'waiting-for-review';
    }
    if (session.assignments.length > 0 && session.assignments.every((assignment) => assignment.status === 'done')) {
      return 'completed';
    }
    if (session.assignments.some((assignment) => assignment.status === 'running' || assignment.status === 'queued')) {
      return 'in-progress';
    }
    return session.status;
  }

  private collectTools(sessions: CollaborationSession[]): CollaborationTool[] {
    const tools = new Set<CollaborationTool>();
    for (const session of sessions) {
      tools.add(session.owner);
      for (const participant of session.participants) {
        tools.add(participant.tool);
      }
      for (const handoff of session.handoffs) {
        tools.add(handoff.from);
        tools.add(handoff.to);
      }
    }
    return [...tools];
  }
}

function createSessionId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultParticipants(): CollaborationParticipant[] {
  return createDefaultCollaborationParticipants();
}

export function createWorkspaceProjects(rootDir: string): CollaborationWorkspaceProject[] {
  return createCollaborationWorkspaceProjects(rootDir);
}
