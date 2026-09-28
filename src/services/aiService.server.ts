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
    // ── LAYER 1: FAQ ─────────────────────────────────────────
    const l1Results = await knowledgeService.searchKnowledge(userMessage);

    if (l1Results.length > 0) {
      const context = knowledgeService.buildContext(l1Results);
      const systemPrompt = buildSystemPromptWithContext(context);

      console.log(
        `[AIService] ✅ L1 HIT — ${l1Results.length} FAQ matches for: "${userMessage.slice(0, 50)}"`,
      );

      return {
        systemPrompt,
        knowledgeResults: l1Results,
        l2Results: null,
        hasKnowledge: true,
        layer: "L1_FAQ",
      };
    }

    console.log(
      `[AIService] ⬇️  L1 MISS — trying L2 chunks for: "${userMessage.slice(0, 50)}"`,
    );

    // ── LAYER 2: CHUNK ────────────────────────────────────────
    const l2Results = await chunkService.searchL2(userMessage);

    if (l2Results.chunks.length > 0) {
      const context = chunkService.buildL2Context(l2Results);
      const systemPrompt = buildSystemPromptWithL2Context(context);

      console.log(
        `[AIService] ✅ L2 HIT — ${l2Results.chunks.length} chunks | category: "${l2Results.matchedCategory}"`,
      );

      return {
        systemPrompt,
        knowledgeResults: [],
        l2Results,
        hasKnowledge: true,
        layer: "L2_CHUNK",
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
