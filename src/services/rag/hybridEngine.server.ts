import { routeQuery } from './queryRouter.server';
import { searchHybrid } from './retrievers/hybridRetriever.server';
import { rerankCandidates } from './reranker.server';
import { buildGroundedContext, type CitationInfo } from './contextBuilder.server';
import {
  buildGroundedHybridPrompt,
  buildFallbackPrompt,
  FALLBACK_RESPONSE,
} from '@/lib/system-prompt';

export interface HybridRAGExecutionResult {
  systemPrompt: string;
  directAnswer?: string;
  citations: CitationInfo[];
  intent: 'faq' | 'document' | 'hybrid' | 'fallback' | 'chitchat';
  isDirectResponse: boolean;
  totalLatencyMs: number;
  retrievalLatencyMs: number;
}

/**
 * Main Hybrid RAG Execution Pipeline (Query Processing -> Routing -> Hybrid Retrieval -> Rerank -> Context Construction)
 */
export async function executeHybridRAG(
  query: string,
  options: { enableReranker?: boolean; topK?: number } = {}
): Promise<HybridRAGExecutionResult> {
  const startTime = Date.now();
  const { enableReranker = true, topK = 4 } = options;

  // Step 1: Query Routing
  const route = routeQuery(query);

  // Step 1a: Fast Chitchat handler
  if (route.intent === 'chitchat') {
    const directGreeting = `Xin chào bạn! Mình là iBot - Trợ lý ảo giải đáp thông tin của Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU).
Mình có thể giúp bạn tra cứu về:
- Quy chế đào tạo, đăng ký tín chỉ, điểm thi, học cải thiện
- Chế độ miễn giảm học phí, học bổng, chính sách sinh viên
- Ký túc xá, điểm rèn luyện, chuẩn đầu ra và các thủ tục hành chính.

Bạn đang cần hỗ trợ thông tin gì về trường?`;

    return {
      systemPrompt: directGreeting,
      directAnswer: directGreeting,
      citations: [],
      intent: 'chitchat',
      isDirectResponse: true,
      totalLatencyMs: Date.now() - startTime,
      retrievalLatencyMs: 0,
    };
  }

  // Step 1b: Out-of-scope Fallback handler
  if (route.intent === 'fallback') {
    return {
      systemPrompt: buildFallbackPrompt(),
      directAnswer: FALLBACK_RESPONSE,
      citations: [],
      intent: 'fallback',
      isDirectResponse: true,
      totalLatencyMs: Date.now() - startTime,
      retrievalLatencyMs: 0,
    };
  }

  // Step 2: Hybrid Retrieval (Sparse + Dense with RRF)
  const retrievalStart = Date.now();
  const rawCandidates = await searchHybrid(query, {
    topK: Math.max(topK * 2, 8),
    department: route.detectedDepartments?.[0],
  });
  const retrievalLatencyMs = Date.now() - retrievalStart;

  if (rawCandidates.length === 0) {
    return {
      systemPrompt: buildFallbackPrompt(),
      citations: [],
      intent: route.intent,
      isDirectResponse: false,
      totalLatencyMs: Date.now() - startTime,
      retrievalLatencyMs,
    };
  }

  // Step 3: Reranking (Cross-Scoring / Filter)
  let reranked = rawCandidates;
  if (enableReranker && rawCandidates.length > 1) {
    try {
      reranked = await rerankCandidates(query, rawCandidates, {
        topN: topK,
        timeoutMs: 650,
      });
    } catch {
      reranked = rawCandidates.slice(0, topK);
    }
  } else {
    reranked = rawCandidates.slice(0, topK);
  }

  // Step 4: Context Construction
  const builtContext = buildGroundedContext(reranked);

  // Step 5: System Prompt Selection
  const systemPrompt = builtContext.citations.length > 0
    ? buildGroundedHybridPrompt(builtContext.formattedContext)
    : buildFallbackPrompt();

  return {
    systemPrompt,
    citations: builtContext.citations,
    intent: route.intent,
    isDirectResponse: false,
    totalLatencyMs: Date.now() - startTime,
    retrievalLatencyMs,
  };
}

