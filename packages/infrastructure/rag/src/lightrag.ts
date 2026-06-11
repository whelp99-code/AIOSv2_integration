/**
 * LightRAG Client
 * LightRAG GraphRAG 서버 연동 (F-aios-v3 재활용)
 */

import axios from 'axios';
import type { RAGClient, RAGDocument, RAGSearchResult } from './types';

export interface LightRAGConfig {
  baseUrl?: string;
}

export class LightRAGClient implements RAGClient {
  private baseUrl: string;

  constructor(config: LightRAGConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.LIGHT_RAG_URL || 'http://localhost:3300';
  }

  async index(document: RAGDocument): Promise<void> {
    await axios.post(`${this.baseUrl}/insert`, {
      content: document.content,
      metadata: { ...document.metadata, id: document.id },
    });
  }

  async search(query: string, topK = 10): Promise<RAGSearchResult[]> {
    const response = await axios.post(`${this.baseUrl}/query`, {
      query,
      top_k: topK,
    });
    return (response.data.results || []).map((r: { content: string; score: number; metadata: Record<string, unknown> }) => ({
      document: {
        id: r.metadata?.id as string || '',
        content: r.content,
        metadata: r.metadata,
      },
      score: r.score,
    }));
  }

  async delete(id: string): Promise<void> {
    await axios.delete(`${this.baseUrl}/documents/${id}`);
  }
}
