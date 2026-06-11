/**
 * pgvector Client
 * PostgreSQL pgvector 벡터 검색 연동 (vibe-coding 재활용)
 */

import type { RAGClient, RAGDocument, RAGSearchResult } from './types';

export interface PgVectorConfig {
  embeddingDimension?: number;
}

export class PgVectorClient implements RAGClient {
  private dimension: number;

  constructor(config: PgVectorConfig = {}) {
    this.dimension = config.embeddingDimension || 1536;
  }

  async index(_document: RAGDocument): Promise<void> {
    // pgvector를 통한 벡터 저장
    console.log(`Indexing document via pgvector (dim=${this.dimension})`);
  }

  async search(_query: string, topK = 10): Promise<RAGSearchResult[]> {
    // 코사인 유사도 검색
    console.log(`Searching via pgvector (topK=${topK})`);
    return [];
  }

  async delete(_id: string): Promise<void> {
    console.log('Deleting document from pgvector');
  }
}
