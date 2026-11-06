// ============================================================
//  aiService.server.ts
//  Central AI Knowledge Orchestrator
//  Supports:
//    - Modern Hybrid RAG (Query Routing -> Hybrid Sparse+Dense -> Rerank -> Grounded Generation)
//    - Legacy L1/L2 Promise.all (Fallback toggle via RAG_MODE=legacy)
// ============================================================

import {
  knowledgeService,
  type KnowledgeResult,
} from "@/services/knowledgeService.server";
import { chunkService, type L2SearchResult } from "@/services/chunkService.server";
import {
  SYSTEM_PROMPT,
  buildFallbackPrompt,
} from "@/lib/system-prompt";
import { executeHybridRAG, type HybridRAGExecutionResult } from "./rag/hybridEngine.server";
import type { CitationInfo } from "./rag/contextBuilder.server";

// ── Types ────────────────────────────────────────────────────

export type RetrievalLayer = "L1_FAQ" | "L2_CHUNK" | "HYBRID" | "FALLBACK" | "CHITCHAT";

export interface EnhancedPromptResult {
  systemPrompt: string;
  knowledgeResults: KnowledgeResult[];
  l2Results: L2SearchResult | null;
  hasKnowledge: boolean;
  layer: RetrievalLayer;
  citations?: CitationInfo[];
  directAnswer?: string;
  isDirectResponse?: boolean;
}

// ── Public API ───────────────────────────────────────────────

export const aiService = {
  /**
   * Main entrypoint for RAG search.
   * If RAG_MODE is set to 'legacy', executes old keyword Promise.all L1/L2 flow.
   * Otherwise executes modern Hybrid RAG Engine.
   */
  async getEnhancedPrompt(userMessage: string): Promise<EnhancedPromptResult> {
    const isLegacy = process.env.RAG_MODE === "legacy";

    if (!isLegacy) {
      try {
        console.log(`[AIService] ⚡ Executing HYBRID RAG Engine for: "${userMessage.slice(0, 50)}"...`);
        const hybridResult: HybridRAGExecutionResult = await executeHybridRAG(userMessage);

        const hasKnowledge = hybridResult.citations.length > 0;
        let layer: RetrievalLayer = "FALLBACK";

        if (hybridResult.intent === "chitchat") {
          layer = "CHITCHAT";
        } else if (hasKnowledge) {
          layer = "HYBRID";
        }

        console.log(
          `[AIService] 🎯 HYBRID RAG Result: [${layer}] | Citations: ${hybridResult.citations.length} | Latency: ${hybridResult.totalLatencyMs}ms`
        );

        return {
          systemPrompt: hybridResult.systemPrompt,
          knowledgeResults: [],
          l2Results: null,
          hasKnowledge,
          layer,
          citations: hybridResult.citations,
          directAnswer: hybridResult.directAnswer,
          isDirectResponse: hybridResult.isDirectResponse,
        };
      } catch (err) {
        console.warn("[AIService] Hybrid RAG encountered an error, falling back to legacy pipeline:", err);
      }
    }

    // ── LEGACY FALLBACK FLOW ────────────────────────────────────
    console.log(`[AIService] ⏳ Running Legacy L1/L2 Promise.all for: "${userMessage.slice(0, 50)}"`);
    const [l1Results, l2Results] = await Promise.all([
      knowledgeService.searchKnowledge(userMessage),
      chunkService.searchL2(userMessage),
    ]);

    const hasL1 = l1Results.length > 0;
    const hasL2 = l2Results.chunks.length > 0;

    if (hasL1 || hasL2) {
      let combinedContext = "";
      if (hasL1) {
        combinedContext += "### TỪ FAQ:\n" + knowledgeService.buildContext(l1Results) + "\n\n";
      }
      if (hasL2) {
        combinedContext += "### TỪ VĂN BẢN QUY ĐỊNH:\n" + chunkService.buildL2Context(l2Results) + "\n\n";
      }

      const systemPrompt = `${SYSTEM_PROMPT}

---

## 📋 CƠ SỞ DỮ LIỆU TỔNG HỢP

> ⚠️ **Đây là nguồn dữ liệu DUY NHẤT bạn được phép dùng để trả lời.**
> Nếu nội dung FAQ quá ngắn, hãy DÙNG THÔNG TIN TỪ VĂN BẢN QUY ĐỊNH để trả lời chi tiết.
> Trích dẫn cả nguồn FAQ và văn bản nếu có.

${combinedContext}

---

**NHẮC LẠI:** Chỉ trả lời dựa trên dữ liệu bên trên. Không bịa đặt.`;

      return {
        systemPrompt,
        knowledgeResults: l1Results,
        l2Results,
        hasKnowledge: true,
        layer: hasL1 && hasL2 ? "L1_FAQ" : hasL1 ? "L1_FAQ" : "L2_CHUNK",
      };
    }

    return {
      systemPrompt: buildFallbackPrompt(),
      knowledgeResults: [],
      l2Results: null,
      hasKnowledge: false,
      layer: "FALLBACK",
    };
  },
};
