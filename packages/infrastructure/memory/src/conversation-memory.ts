/**
 * Conversation Memory
 * 대화 메모리 관리 (vibe-coding-os 재활용)
 */

import type { MemoryEntry, MemoryStore, MemorySession } from './types';

export class ConversationMemory implements MemoryStore {
  private sessions: Map<string, MemorySession> = new Map();
  private maxEntriesPerSession: number;

  constructor(maxEntriesPerSession = 100) {
    this.maxEntriesPerSession = maxEntriesPerSession;
  }

  async addEntry(sessionId: string, entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        userId: 'default',
        entries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.sessions.set(sessionId, session);
    }

    const newEntry: MemoryEntry = {
      ...entry,
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
    };

    session.entries.push(newEntry);
    session.updatedAt = new Date();

    // 메모리 제한
    if (session.entries.length > this.maxEntriesPerSession) {
      session.entries = session.entries.slice(-this.maxEntriesPerSession);
    }

    return newEntry;
  }

  async getHistory(sessionId: string, limit = 50): Promise<MemoryEntry[]> {
    const session = this.sessions.get(sessionId);
    return session ? session.entries.slice(-limit) : [];
  }

  async search(sessionId: string, query: string, limit = 10): Promise<MemoryEntry[]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const queryLower = query.toLowerCase();
    return session.entries
      .filter((e) => e.content.toLowerCase().includes(queryLower))
      .slice(-limit);
  }

  async clear(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}
