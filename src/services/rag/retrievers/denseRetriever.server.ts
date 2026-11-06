import { embeddingService } from '../embedding/embeddingService.server';
import { dbService } from '@/lib/db.server';
import type { RetrievalResult, ChunkItem, FAQItem } from '../types';

export interface DenseSearchOptions {
  topK?: number;
  minScore?: number;
  department?: string;
  sourceType?: 'chunk' | 'faq' | 'all';
}

/**
 * Dense Semantic Retriever using Vector Cosine Similarity
 */
export async function searchDense(
  query: string,
  options: DenseSearchOptions = {}
): Promise<RetrievalResult<ChunkItem | FAQItem>[]> {
  const { topK = 10, minScore = 0.25, department, sourceType = 'all' } = options;

  const vectorMatches = await embeddingService.searchDense(query, {
    topK,
    minScore,
    department,
    sourceType,
  });

  const results: RetrievalResult<ChunkItem | FAQItem>[] = [];

  for (const match of vectorMatches) {
    if (match.sourceType === 'chunk') {
      const item = embeddingService.getItem(match.id);
      if (item) {
        const chunkItem: ChunkItem = {
          id: item.id,
          filePath: '',
          fileName: item.title || '',
          folder: item.department || '',
          metadata: {
            doc_id: '',
            department: item.department || '',
            category: item.category || '',
            source: '',
            doc_title: item.title,
          },
          content: item.content,
          cleanContent: item.content,
          enrichedContent: item.content,
          tokenCount: 0,
          checksum: item.checksum,
        };

        results.push({
          item: chunkItem,
          score: match.score,
          matchType: 'dense',
          rank: results.length + 1,
        });
      }
    } else if (match.sourceType === 'faq') {
      const faqIdNum = parseInt(match.id.replace('faq::', ''), 10);
      const faqRow = dbService.getFaqById(faqIdNum);
      if (faqRow) {
        const faqItem: FAQItem = {
          id: faqRow.id,
          question: faqRow.question,
          answer: faqRow.answer,
          active: Boolean(faqRow.active),
          score: match.score,
        };

        results.push({
          item: faqItem,
          score: match.score,
          matchType: 'dense',
          rank: results.length + 1,
        });
      }
    }
  }

  return results;
}

