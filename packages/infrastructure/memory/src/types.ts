export interface MemoryEntry {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

export interface MemorySession {
  id: string;
  userId: string;
  entries: MemoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryStore {
  addEntry(sessionId: string, entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry>;
  getHistory(sessionId: string, limit?: number): Promise<MemoryEntry[]>;
  search(sessionId: string, query: string, limit?: number): Promise<MemoryEntry[]>;
  clear(sessionId: string): Promise<void>;
}
