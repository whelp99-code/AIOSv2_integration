import { describe, expect, it, beforeEach } from 'vitest';
import { ConversationMemory } from '../../packages/infrastructure/memory/src/conversation-memory';

describe('ConversationMemory', () => {
  let memory: ConversationMemory;

  beforeEach(() => {
    memory = new ConversationMemory(100);
  });

  it('should add entries to a session', async () => {
    const entry = await memory.addEntry('session-1', {
      content: 'Hello',
      role: 'user',
    });

    expect(entry.id).toMatch(/^mem_/);
    expect(entry.content).toBe('Hello');
    expect(entry.role).toBe('user');
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it('should retrieve conversation history', async () => {
    await memory.addEntry('session-1', { content: 'msg1', role: 'user' });
    await memory.addEntry('session-1', { content: 'msg2', role: 'assistant' });
    await memory.addEntry('session-1', { content: 'msg3', role: 'user' });

    const history = await memory.getHistory('session-1');
    expect(history).toHaveLength(3);
    expect(history[0].content).toBe('msg1');
    expect(history[2].content).toBe('msg3');
  });

  it('should respect limit parameter in getHistory', async () => {
    for (let i = 0; i < 10; i++) {
      await memory.addEntry('session-1', { content: `msg${i}`, role: 'user' });
    }

    const history = await memory.getHistory('session-1', 3);
    expect(history).toHaveLength(3);
    expect(history[0].content).toBe('msg7');
  });

  it('should return empty array for non-existent session', async () => {
    const history = await memory.getHistory('non-existent');
    expect(history).toEqual([]);
  });

  it('should search entries by content', async () => {
    await memory.addEntry('session-1', { content: 'Hello world', role: 'user' });
    await memory.addEntry('session-1', { content: 'How are you?', role: 'assistant' });
    await memory.addEntry('session-1', { content: 'Hello again', role: 'user' });

    const results = await memory.search('session-1', 'hello');
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.content.toLowerCase().includes('hello'))).toBe(true);
  });

  it('should return empty search for non-existent session', async () => {
    const results = await memory.search('non-existent', 'query');
    expect(results).toEqual([]);
  });

  it('should clear a session', async () => {
    await memory.addEntry('session-1', { content: 'msg', role: 'user' });
    expect(memory.getSessionCount()).toBe(1);

    await memory.clear('session-1');
    expect(memory.getSessionCount()).toBe(0);

    const history = await memory.getHistory('session-1');
    expect(history).toEqual([]);
  });

  it('should enforce maxEntriesPerSession', async () => {
    const smallMemory = new ConversationMemory(3);
    for (let i = 0; i < 5; i++) {
      await smallMemory.addEntry('session-1', { content: `msg${i}`, role: 'user' });
    }

    const history = await smallMemory.getHistory('session-1');
    expect(history).toHaveLength(3);
    expect(history[0].content).toBe('msg2');
    expect(history[2].content).toBe('msg4');
  });

  it('should track multiple sessions independently', async () => {
    await memory.addEntry('s1', { content: 'hello s1', role: 'user' });
    await memory.addEntry('s2', { content: 'hello s2', role: 'user' });

    expect(memory.getSessionCount()).toBe(2);
    const h1 = await memory.getHistory('s1');
    const h2 = await memory.getHistory('s2');
    expect(h1).toHaveLength(1);
    expect(h2).toHaveLength(1);
    expect(h1[0].content).toBe('hello s1');
    expect(h2[0].content).toBe('hello s2');
  });

  it('should store metadata on entries', async () => {
    const entry = await memory.addEntry('session-1', {
      content: 'test',
      role: 'user',
      metadata: { source: 'cli', importance: 'high' },
    });

    expect(entry.metadata).toEqual({ source: 'cli', importance: 'high' });
  });
});
