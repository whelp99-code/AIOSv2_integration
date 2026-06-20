/**
 * Phase 5 Tests - Execution Registry & AG-UI Stream
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ExecutionRegistry,
  generateExecutionId,
  generateEventId,
  type ExecutionRecord,
  type ExecutionEvent,
} from '../packages/shared/src/execution-registry';
import {
  createAGUIStream,
  type AGUIEvent,
} from '../packages/shared/src/ag-ui-stream';

describe('Execution Registry', () => {
  let registry: ExecutionRegistry;

  beforeEach(() => {
    registry = ExecutionRegistry.getInstance();
    registry.clear();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('ID Generation', () => {
    it('should generate unique execution IDs', () => {
      const id1 = generateExecutionId();
      const id2 = generateExecutionId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^exec-/);
    });

    it('should generate unique event IDs', () => {
      const id1 = generateEventId();
      const id2 = generateEventId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^evt-/);
    });
  });

  describe('Registration', () => {
    it('should register a new execution', () => {
      const record = registry.register({
        sessionId: 'session-1',
        tool: 'opencode',
      });

      expect(record).toBeDefined();
      expect(record.id).toMatch(/^exec-/);
      expect(record.sessionId).toBe('session-1');
      expect(record.tool).toBe('opencode');
      expect(record.status).toBe('pending');
      expect(record.startedAt).toBeDefined();
      expect(record.events).toHaveLength(1);
      expect(record.events[0].type).toBe('start');
    });

    it('should register with optional assignmentId', () => {
      const record = registry.register({
        sessionId: 'session-1',
        assignmentId: 'assign-123',
        tool: 'cursor',
      });

      expect(record.assignmentId).toBe('assign-123');
    });

    it('should register with metadata', () => {
      const record = registry.register({
        sessionId: 'session-1',
        tool: 'hermes',
        metadata: { command: 'pnpm test', pid: 12345 },
      });

      expect(record.metadata.command).toBe('pnpm test');
      expect(record.metadata.pid).toBe(12345);
    });
  });

  describe('Updates', () => {
    it('should update execution status', () => {
      const record = registry.register({
        sessionId: 'session-1',
        tool: 'opencode',
      });

      const updated = registry.update(record.id, { status: 'running' });
      expect(updated).toBeDefined();
      expect(updated!.status).toBe('running');
      expect(updated!.events).toHaveLength(2);
      expect(updated!.events[1].type).toBe('progress');
    });

    it('should update metadata', () => {
      const record = registry.register({
        sessionId: 'session-1',
        tool: 'opencode',
      });

      const updated = registry.update(record.id, {
        metadata: { exitCode: 0, summary: 'Tests passed' },
      });

      expect(updated!.metadata.exitCode).toBe(0);
      expect(updated!.metadata.summary).toBe('Tests passed');
    });

    it('should return null for non-existent execution', () => {
      const result = registry.update('non-existent', { status: 'running' });
      expect(result).toBeNull();
    });
  });

  describe('Completion', () => {
    it('should complete execution successfully', () => {
      const record = registry.register({
        sessionId: 'session-1',
        tool: 'opencode',
      });

      const completed = registry.complete(record.id, {
        exitCode: 0,
        summary: 'All tests passed',
      });

      expect(completed).toBeDefined();
      expect(completed!.status).toBe('completed');
      expect(completed!.completedAt).toBeDefined();
      expect(completed!.metadata.exitCode).toBe(0);
      expect(completed!.events).toHaveLength(2);
      expect(completed!.events[1].type).toBe('complete');
    });

    it('should complete execution with failure', () => {
      const record = registry.register({
        sessionId: 'session-1',
        tool: 'cursor',
      });

      const failed = registry.complete(record.id, {
        exitCode: 1,
        error: 'Test failed',
      });

      expect(failed).toBeDefined();
      expect(failed!.status).toBe('failed');
      expect(failed!.metadata.error).toBe('Test failed');
    });
  });

  describe('Cancellation', () => {
    it('should cancel execution', () => {
      const record = registry.register({
        sessionId: 'session-1',
        tool: 'opencode',
      });

      const cancelled = registry.cancel(record.id);
      expect(cancelled).toBeDefined();
      expect(cancelled!.status).toBe('cancelled');
      expect(cancelled!.completedAt).toBeDefined();
      expect(cancelled!.events).toHaveLength(2);
      expect(cancelled!.events[1].type).toBe('cancel');
    });
  });

  describe('Queries', () => {
    it('should get execution by ID', () => {
      const record = registry.register({
        sessionId: 'session-1',
        tool: 'opencode',
      });

      const found = registry.get(record.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(record.id);
    });

    it('should get executions by session', () => {
      registry.register({ sessionId: 'session-1', tool: 'opencode' });
      registry.register({ sessionId: 'session-1', tool: 'cursor' });
      registry.register({ sessionId: 'session-2', tool: 'hermes' });

      const session1Execs = registry.getBySession('session-1');
      expect(session1Execs).toHaveLength(2);
    });

    it('should get executions by status', () => {
      const exec1 = registry.register({ sessionId: 'session-1', tool: 'opencode' });
      const exec2 = registry.register({ sessionId: 'session-1', tool: 'cursor' });
      registry.update(exec1.id, { status: 'running' });
      registry.update(exec2.id, { status: 'completed' });

      const running = registry.getByStatus('running');
      expect(running).toHaveLength(1);
      expect(running[0].id).toBe(exec1.id);
    });

    it('should get summary', () => {
      const exec1 = registry.register({ sessionId: 'session-1', tool: 'opencode' });
      const exec2 = registry.register({ sessionId: 'session-1', tool: 'cursor' });
      registry.update(exec1.id, { status: 'running' });
      registry.complete(exec2.id, { exitCode: 0 });

      const summary = registry.getSummary();
      expect(summary.total).toBe(2);
      expect(summary.running).toBe(1);
      expect(summary.completed).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.recent).toHaveLength(2);
    });
  });

  describe('Events', () => {
    it('should emit events on registration', () => {
      const events: ExecutionEvent[] = [];
      const unsubscribe = registry.onAny((event) => events.push(event));

      registry.register({ sessionId: 'session-1', tool: 'opencode' });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('start');

      unsubscribe();
    });

    it('should emit events on update', () => {
      const events: ExecutionEvent[] = [];
      const unsubscribe = registry.onAny((event) => events.push(event));

      const record = registry.register({ sessionId: 'session-1', tool: 'opencode' });
      registry.update(record.id, { status: 'running' });

      expect(events).toHaveLength(2);
      expect(events[1].type).toBe('progress');

      unsubscribe();
    });

    it('should emit typed events', () => {
      const startEvents: ExecutionEvent[] = [];
      const completeEvents: ExecutionEvent[] = [];

      const unsub1 = registry.on('start', (event) => startEvents.push(event));
      const unsub2 = registry.on('complete', (event) => completeEvents.push(event));

      const record = registry.register({ sessionId: 'session-1', tool: 'opencode' });
      registry.complete(record.id, { exitCode: 0 });

      expect(startEvents).toHaveLength(1);
      expect(completeEvents).toHaveLength(1);

      unsub1();
      unsub2();
    });

    it('should unsubscribe correctly', () => {
      const events: ExecutionEvent[] = [];
      const unsubscribe = registry.onAny((event) => events.push(event));

      registry.register({ sessionId: 'session-1', tool: 'opencode' });
      expect(events).toHaveLength(1);

      unsubscribe();
      registry.register({ sessionId: 'session-1', tool: 'cursor' });
      expect(events).toHaveLength(1); // Should not increase
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize', () => {
      registry.register({ sessionId: 'session-1', tool: 'opencode' });
      registry.register({ sessionId: 'session-2', tool: 'cursor' });

      const serialized = registry.serialize();
      expect(typeof serialized).toBe('string');

      registry.clear();
      expect(registry.getSummary().total).toBe(0);

      registry.deserialize(serialized);
      expect(registry.getSummary().total).toBe(2);
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      registry.deserialize('invalid json');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('AG-UI Stream', () => {
  let registry: ExecutionRegistry;

  beforeEach(() => {
    registry = ExecutionRegistry.getInstance();
    registry.clear();
  });

  afterEach(() => {
    registry.clear();
  });

  it('should create a readable stream', () => {
    const stream = createAGUIStream();
    expect(stream).toBeDefined();
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('should accept configuration', () => {
    const stream = createAGUIStream({
      heartbeatIntervalMs: 5000,
      maxEvents: 50,
      includeHistory: true,
    });
    expect(stream).toBeDefined();
  });
});
