import { generateText } from 'ai';
import { getPrimaryModel } from '@/lib/ai-provider.server';
import type { RetrievalResult, ChunkItem, FAQItem } from './types';

export interface RerankOptions {
  topN?: number;
  timeoutMs?: number;
}

/**
 * Fast LLM-based Cross-Encoder Reranker.
 * Evaluates candidate relevance against the student query using an ultra-compact prompt.
 * Falls back safely to RRF score if API times out or fails.
 */
export async function rerankCandidates(
  query: string,
  candidates: RetrievalResult<ChunkItem | FAQItem>[],
  options: RerankOptions = {}
): Promise<RetrievalResult<ChunkItem | FAQItem>[]> {
  const { topN = 5, timeoutMs = 800 } = options;

  // If few candidates, skip expensive LLM reranking
  if (candidates.length <= 1) {
    return candidates;
  }

  const pool = candidates.slice(0, Math.min(candidates.length, 6));

  const candidateSnippets = pool.map((c, idx) => {
    let title = '';
    let snippet = '';
    if ('fileName' in c.item) {
      title = c.item.metadata.doc_title || c.item.fileName;
      snippet = c.item.cleanContent.slice(0, 180).replace(/\s+/g, ' ');
    } else if ('question' in c.item) {
      title = c.item.question;
      snippet = c.item.answer.slice(0, 180).replace(/\s+/g, ' ');
    }
    return `[${idx + 1}] Tiêu đề: ${title}\nNội dung: ${snippet}`;
  }).join('\n\n');

  const rerankPrompt = `Bạn là hệ thống xếp hạng độ liên quan văn bản cho câu hỏi sinh viên ICTU.
Câu hỏi: "${query}"

Danh sách tài liệu ứng viên:
${candidateSnippets}

YÊU CẦU:
Đánh giá mức độ trả lời đúng trọng tâm câu hỏi của từng ứng viên trên thang điểm 0 - 100.
Chỉ trả về JSON mảng các đối tượng, không giải thích gì thêm:
[{"index": 1, "score": 95}, {"index": 2, "score": 40}]`;

  try {
    const model = getPrimaryModel();

    // Enforce strict timeout
    const rerankPromise = generateText({
      model,
      prompt: rerankPrompt,
      maxOutputTokens: 120,
    });

    const timeoutPromise = new Promise<{ text: string }>((_, reject) =>
      setTimeout(() => reject(new Error('Rerank timeout')), timeoutMs)
    );

    const { text } = await Promise.race([rerankPromise, timeoutPromise]);
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);

    if (jsonMatch) {
      const parsedScores: Array<{ index: number; score: number }> = JSON.parse(jsonMatch[0]);
      const scoreMap = new Map<number, number>();
      for (const item of parsedScores) {
        if (typeof item.index === 'number' && typeof item.score === 'number') {
          scoreMap.set(item.index, item.score);
        }
      }

      // Re-score pool
      pool.forEach((c, idx) => {
        const llmScore = scoreMap.get(idx + 1);
        if (llmScore !== undefined) {
          // Blended score: 60% LLM reranker + 40% RRF score
          c.score = (llmScore / 100) * 0.6 + c.score * 0.4;
        }
      });

      pool.sort((a, b) => b.score - a.score);
    }
  } catch {
    // Graceful degradation: If LLM rerank times out or fails, preserve RRF rank
  }

  // Combine top reranked pool with remaining candidates
  const remaining = candidates.slice(pool.length);
  const combined = [...pool, ...remaining];

  combined.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return combined.slice(0, topN);
}
