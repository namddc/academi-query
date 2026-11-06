import { dbService } from '@/lib/db.server';
import { defaultVectorizer, cosineSimilarity, type SemanticVectorizer } from './semanticVectorizer.server';
import type { EmbeddingProvider, VectorSearchResult } from './types';

export interface IndexedVectorItem {
  id: string;
  sourceType: 'chunk' | 'faq';
  vector: number[];
  department?: string;
  category?: string;
  title?: string;
  content: string;
  checksum: string;
}

class EmbeddingService {
  private provider: EmbeddingProvider = defaultVectorizer;
  private inMemoryIndex: Map<string, IndexedVectorItem> = new Map();
  private initialized = false;

  /**
   * Set custom provider if external API key is provided
   */
  setProvider(customProvider: EmbeddingProvider) {
    this.provider = customProvider;
  }

  /**
   * Embed query string
   */
  async embedQuery(text: string): Promise<number[]> {
    return this.provider.embedQuery(text);
  }

  /**
   * Initializes or refreshes vector index from database and caches
   */
  async initializeVectorIndex(forceRecompute = false): Promise<{
    totalIndexed: number;
    computedCount: number;
    cachedCount: number;
  }> {
    const existingDbVectors = dbService.getAllChunkVectors();
    const vectorMap = new Map<string, { vector: number[]; checksum: string; sourceType: string }>();

    for (const row of existingDbVectors) {
      try {
        vectorMap.set(row.id, {
          vector: JSON.parse(row.vector_json),
          checksum: row.checksum,
          sourceType: row.source_type,
        });
      } catch {
        // Ignore corrupted JSON
      }
    }

    const chunks = dbService.getAllChunks();
    const faqs = dbService.getAllActiveFaqs();

    let computedCount = 0;
    let cachedCount = 0;
    const vectorsToUpsert: Array<{ id: string; source_type: string; vector_json: string; checksum: string }> = [];

    // 1. Process Chunks
    for (const ch of chunks) {
      const checksum = ch.checksum || ch.id;
      const cached = vectorMap.get(ch.id);

      let vector: number[];
      if (!forceRecompute && cached && cached.checksum === checksum) {
        vector = cached.vector;
        cachedCount++;
      } else {
        // Embed enriched content to keep title, doc ID and department in semantic space
        const textToEmbed = ch.enriched_content || `${ch.doc_title || ch.file_name}\n${ch.content}`;
        vector = await this.provider.embedQuery(textToEmbed);
        computedCount++;

        vectorsToUpsert.push({
          id: ch.id,
          source_type: 'chunk',
          vector_json: JSON.stringify(vector),
          checksum,
        });
      }

      this.inMemoryIndex.set(ch.id, {
        id: ch.id,
        sourceType: 'chunk',
        vector,
        department: ch.department,
        category: ch.category,
        title: ch.doc_title || ch.file_name,
        content: ch.content,
        checksum,
      });
    }

    // 2. Process FAQs
    for (const faq of faqs) {
      const faqId = `faq::${faq.id}`;
      const faqText = `${faq.question}\n${faq.answer}`;
      const checksum = `faq_v1_${faq.id}`;
      const cached = vectorMap.get(faqId);

      let vector: number[];
      if (!forceRecompute && cached && cached.checksum === checksum) {
        vector = cached.vector;
        cachedCount++;
      } else {
        vector = await this.provider.embedQuery(faqText);
        computedCount++;

        vectorsToUpsert.push({
          id: faqId,
          source_type: 'faq',
          vector_json: JSON.stringify(vector),
          checksum,
        });
      }

      this.inMemoryIndex.set(faqId, {
        id: faqId,
        sourceType: 'faq',
        vector,
        content: faq.answer,
        title: faq.question,
        checksum,
      });
    }

    // Persist newly computed vectors to SQLite
    if (vectorsToUpsert.length > 0) {
      dbService.upsertChunkVectors(vectorsToUpsert);
    }

    this.initialized = true;

    return {
      totalIndexed: this.inMemoryIndex.size,
      computedCount,
      cachedCount,
    };
  }

  /**
   * Dense vector search (Cosine Similarity)
   */
  async searchDense(
    query: string,
    options: {
      topK?: number;
      minScore?: number;
      department?: string;
      sourceType?: 'chunk' | 'faq' | 'all';
    } = {}
  ): Promise<VectorSearchResult[]> {
    if (!this.initialized || this.inMemoryIndex.size === 0) {
      await this.initializeVectorIndex();
    }

    const { topK = 10, minScore = 0.25, department, sourceType = 'all' } = options;
    const queryVector = await this.provider.embedQuery(query);

    const scored: VectorSearchResult[] = [];

    for (const item of this.inMemoryIndex.values()) {
      if (sourceType !== 'all' && item.sourceType !== sourceType) {
        continue;
      }

      if (department && item.department && item.department !== department) {
        // If query strictly targets a department, skip other departments
        continue;
      }

      const score = cosineSimilarity(queryVector, item.vector);
      if (score >= minScore) {
        scored.push({
          id: item.id,
          score,
          sourceType: item.sourceType,
        });
      }
    }

    // Sort descending by cosine similarity
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  /**
   * Get an indexed item by ID
   */
  getItem(id: string): IndexedVectorItem | undefined {
    return this.inMemoryIndex.get(id);
  }
}

export const embeddingService = new EmbeddingService();

