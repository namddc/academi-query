import { searchSparse, type SparseSearchOptions } from './sparseRetriever.server';
import { searchDense, type DenseSearchOptions } from './denseRetriever.server';
import type { RetrievalResult, ChunkItem, FAQItem } from '../types';

export interface HybridSearchOptions {
  topK?: number;
  k?: number; // RRF constant, default 60
  sparseWeight?: number; // default 1.0
  denseWeight?: number; // default 1.0
  department?: string;
  sourceType?: 'chunk' | 'faq' | 'all';
}

/**
 * Hybrid Retriever combining Sparse (BM25/Tokens) and Dense (Vector) search via Reciprocal Rank Fusion (RRF)
 */
export async function searchHybrid(
  query: string,
  options: HybridSearchOptions = {}
): Promise<RetrievalResult<ChunkItem | FAQItem>[]> {
  const {
    topK = 10,
    k = 60,
    sparseWeight = 1.0,
    denseWeight = 1.0,
    department,
    sourceType = 'all',
  } = options;

  // Run Sparse and Dense retrieval in parallel
  const [sparseResults, denseResults] = await Promise.all([
    searchSparse(query, {
      topK: Math.max(topK * 3, 20),
      department,
      sourceType,
    }),
    searchDense(query, {
      topK: Math.max(topK * 3, 20),
      department,
      sourceType,
    }),
  ]);

  // Map to hold fused scores and item references
  interface FusedEntry {
    item: ChunkItem | FAQItem;
    rrfScore: number;
    sparseRank?: number;
    denseRank?: number;
    sparseScore?: number;
    denseScore?: number;
  }

  const fusionMap = new Map<string, FusedEntry>();

  // Process Sparse results
  sparseResults.forEach((res, index) => {
    const rank = index + 1;
    const id = 'id' in res.item ? String(res.item.id) : (res.item as any).id;
    const rrfTerm = sparseWeight / (k + rank);

    fusionMap.set(id, {
      item: res.item,
      rrfScore: rrfTerm,
      sparseRank: rank,
      sparseScore: res.score,
    });
  });

  // Process Dense results and combine with RRF
  denseResults.forEach((res, index) => {
    const rank = index + 1;
    const id = 'id' in res.item ? String(res.item.id) : (res.item as any).id;
    const rrfTerm = denseWeight / (k + rank);

    const existing = fusionMap.get(id);
    if (existing) {
      existing.rrfScore += rrfTerm;
      existing.denseRank = rank;
      existing.denseScore = res.score;
    } else {
      fusionMap.set(id, {
        item: res.item,
        rrfScore: rrfTerm,
        denseRank: rank,
        denseScore: res.score,
      });
    }
  });

  // Convert to sorted array
  const fusedList = Array.from(fusionMap.values());
  fusedList.sort((a, b) => b.rrfScore - a.rrfScore);

  // Normalize highest RRF score to 1.0 for intuitive interpretation
  const maxRrf = fusedList.length > 0 ? fusedList[0].rrfScore : 1;

  const finalResults: RetrievalResult<ChunkItem | FAQItem>[] = fusedList.slice(0, topK).map((entry, idx) => {
    const isBoth = entry.sparseRank !== undefined && entry.denseRank !== undefined;
    const matchType = isBoth ? 'hybrid' : (entry.sparseRank !== undefined ? 'sparse' : 'dense');

    return {
      item: entry.item,
      score: maxRrf > 0 ? entry.rrfScore / maxRrf : 0,
      matchType,
      rank: idx + 1,
    };
  });

  return finalResults;
}
