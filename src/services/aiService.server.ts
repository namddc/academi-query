// ============================================================
//  aiService.server.ts
//  Orchestrates: user question → L1 FAQ → L2 Chunk → fallback
// ============================================================

import {
  knowledgeService,
  type KnowledgeResult,
} from "@/services/knowledgeService.server";
import { chunkService, type L2SearchResult } from "@/services/chunkService.server";
import {
  SYSTEM_PROMPT,
  buildSystemPromptWithContext,
  buildSystemPromptWithL2Context,
  buildFallbackPrompt,
} from "@/lib/system-prompt";

// ── Types ────────────────────────────────────────────────────

export type RetrievalLayer = "L1_FAQ" | "L2_CHUNK" | "FALLBACK";

export interface EnhancedPromptResult {
  systemPrompt: string;
  knowledgeResults: KnowledgeResult[];
  l2Results: L2SearchResult | null;
  hasKnowledge: boolean;
  layer: RetrievalLayer;
}


// ── Public API ───────────────────────────────────────────────

export const aiService = {
  /**
   * Given the latest user message, search knowledge layers in order:
   *   1. L1 FAQ  (Google Sheets semantic match)
   *   2. L2 Chunks (regulation document keyword + LLM re-rank)
   *   3. Fallback (no knowledge found)
   *
   * Returns an enhanced system prompt with the found context injected.
   */
  async getEnhancedPrompt(userMessage: string): Promise<EnhancedPromptResult> {
    // ── LAYER 1 & 2: CONCURRENT SEARCH ──────────────────────
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
> Nếu nội dung FAQ quá ngắn (ví dụ: "xem file quy định"), hãy DÙNG THÔNG TIN TỪ VĂN BẢN QUY ĐỊNH để trả lời chi tiết.
> Trích dẫn cả nguồn FAQ và văn bản nếu có.

${combinedContext}

---

**NHẮC LẠI:** Chỉ trả lời dựa trên dữ liệu bên trên. Không bịa đặt.`;

      console.log(
        `[AIService] ✅ HIT — L1: ${l1Results.length} FAQs | L2: ${l2Results.chunks.length} chunks`,
      );

      return {
        systemPrompt,
        knowledgeResults: l1Results,
        l2Results,
        hasKnowledge: true,
        layer: hasL1 && hasL2 ? "L1_FAQ" : (hasL1 ? "L1_FAQ" : "L2_CHUNK"),
      };
    }

    console.log(
      `[AIService] ❌ FALLBACK — no knowledge found for: "${userMessage.slice(0, 50)}"`,
    );

    // ── LAYER 3: FALLBACK ─────────────────────────────────────
    return {
      systemPrompt: buildFallbackPrompt(),
      knowledgeResults: [],
      l2Results: null,
      hasKnowledge: false,
      layer: "FALLBACK",
    };
  },
};
