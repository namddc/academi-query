export interface EmbeddingProvider {
  name: string;
  dimension: number;
  embedQuery(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface CachedVector {
  id: string;
  sourceType: 'chunk' | 'faq';
  vector: number[];
  checksum: string;
  updatedAt: string;
}

export interface VectorSearchResult {
  id: string;
  score: number; // Cosine similarity: -1.0 to 1.0 (typically 0.0 to 1.0 for normalized vectors)
  sourceType: 'chunk' | 'faq';
}

