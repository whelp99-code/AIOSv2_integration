export interface RAGDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

export interface RAGSearchResult {
  document: RAGDocument;
  score: number;
}

export interface RAGClient {
  index(document: RAGDocument): Promise<void>;
  search(query: string, topK?: number): Promise<RAGSearchResult[]>;
  delete(id: string): Promise<void>;
}
