import { dbService, type DBChunk, type DBFaq } from '@/lib/db.server';
import type { RetrievalResult, ChunkItem, FAQItem } from '../types';

export const VIETNAMESE_STOPWORDS = new Set([
  'và', 'hoặc', 'là', 'của', 'trong', 'các', 'cho', 'về', 'với', 'những',
  'tại', 'theo', 'được', 'có', 'đã', 'sẽ', 'đang', 'ra', 'vào', 'lại',
  'này', 'đó', 'khi', 'nào', 'sao', 'làm', 'thế', 'ơi', 'nhé', 'ạ', 'mình',
  'bạn', 'muốn', 'hỏi', 'biết', 'gì', 'bao', 'nhiêu', 'ở', 'đâu'
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?!.,;:()"'\-_/\\\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeQuery(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !VIETNAMESE_STOPWORDS.has(t));
}

export interface SparseSearchOptions {
  topK?: number;
  minScore?: number;
  department?: string;
  sourceType?: 'chunk' | 'faq' | 'all';
}

/**
 * Enhanced Sparse Keyword Retriever (Exact phrase + Token Overlap + Bigrams + Metadata boost)
 */
export async function searchSparse(
  query: string,
  options: SparseSearchOptions = {}
): Promise<RetrievalResult<ChunkItem | FAQItem>[]> {
  const { topK = 15, minScore = 15, department, sourceType = 'all' } = options;

  const queryNorm = normalizeText(query);
  const tokens = tokenizeQuery(query);

  if (tokens.length === 0) {
    return [];
  }

  // Generate bigrams
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }

  const results: RetrievalResult<ChunkItem | FAQItem>[] = [];

  // 1. Search Chunks
  if (sourceType === 'chunk' || sourceType === 'all') {
    const chunks = dbService.getAllChunks();

    for (const c of chunks) {
      if (department && c.department && c.department !== department) {
        continue;
      }

      const metaStr = `${c.doc_title || ''} ${c.source || ''} ${c.doc_id || ''} ${c.department || ''}`.toLowerCase();
      const contentStr = c.content.toLowerCase();
      const fullText = `${metaStr} ${contentStr}`;

      // Exact phrase match
      const exactBonus = fullText.includes(queryNorm) ? 50 : 0;

      // Token overlap
      let tokenHits = 0;
      for (const t of tokens) {
        if (fullText.includes(t)) tokenHits++;
      }
      const tokenScore = (tokenHits / tokens.length) * 40;

      // Bigram overlap
      let bigramHits = 0;
      for (const bg of bigrams) {
        if (fullText.includes(bg)) bigramHits++;
      }
      const bigramBonus = bigrams.length > 0 ? (bigramHits / bigrams.length) * 10 : 0;

      // Metadata boost
      let metaBonus = 0;
      if (tokens.some((t) => metaStr.includes(t))) {
        metaBonus = 15;
      }

      const score = Math.min(100, exactBonus + tokenScore + bigramBonus + metaBonus);

      if (score >= minScore) {
        const chunkItem: ChunkItem = {
          id: c.id,
          filePath: c.file_path,
          fileName: c.file_name,
          folder: c.department || '',
          metadata: {
            doc_id: c.doc_id || '',
            department: c.department || '',
            category: c.category || '',
            source: c.source || '',
            doc_title: c.doc_title || c.file_name,
          },
          content: c.content,
          cleanContent: c.content,
          enrichedContent: c.enriched_content || c.content,
          tokenCount: c.token_count || 0,
          checksum: c.checksum || '',
        };

        results.push({
          item: chunkItem,
          score: score / 100, // Normalize to 0.0 - 1.0
          matchType: 'sparse',
        });
      }
    }
  }

  // 2. Search FAQs
  if (sourceType === 'faq' || sourceType === 'all') {
    const faqs = dbService.getAllActiveFaqs();

    for (const faq of faqs) {
      const qNorm = normalizeText(faq.question);
      const aNorm = normalizeText(faq.answer);
      const fullFaq = `${qNorm} ${aNorm}`;

      const exactBonus = fullFaq.includes(queryNorm) ? 50 : 0;

      let tokenHits = 0;
      for (const t of tokens) {
        if (fullFaq.includes(t)) tokenHits++;
      }
      const tokenScore = (tokenHits / tokens.length) * 40;

      let bigramHits = 0;
      for (const bg of bigrams) {
        if (fullFaq.includes(bg)) bigramHits++;
      }
      const bigramBonus = bigrams.length > 0 ? (bigramHits / bigrams.length) * 10 : 0;

      // Extra bonus if question itself matches tokens
      let questionBonus = 0;
      if (tokens.some((t) => qNorm.includes(t))) {
        questionBonus = 10;
      }

      const score = Math.min(100, exactBonus + tokenScore + bigramBonus + questionBonus);

      if (score >= minScore) {
        const faqItem: FAQItem = {
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          active: Boolean(faq.active),
          score: score / 100,
        };

        results.push({
          item: faqItem,
          score: score / 100,
          matchType: 'sparse',
        });
      }
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  // Assign ranks
  results.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return results.slice(0, topK);
}
