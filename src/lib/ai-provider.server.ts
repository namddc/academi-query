import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getExpSolutionConfig } from "@/lib/config.server";

// ── NVIDIA Provider (legacy / fallback) ──────────────────────
export const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization:
      "Bearer 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",
  },
});

export const nvidiaModel = nvidia("meta/llama-3.2-90b-vision-instruct");

export const nvidiaModelSettings = {
  maxTokens: 512,
  temperature: 1,
  topP: 1,
} as const;

// ── ExpSolution AI Gateway (primary) ────────────────────────
// OpenAI-compatible endpoint — key loaded per-request from env
// to support Cloudflare Workers runtime env binding pattern.

// ── NVIDIA Provider (primary) ────────────────────────
export function createNvidiaProvider() {
  const apiKey = process.env.NVIDIA_API_KEY || "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";
  return createOpenAICompatible({
    name: "nvidia",
    baseURL: "https://integrate.api.nvidia.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

/**
 * The primary model for chat & LLM tasks.
 * Uses NVIDIA Llama-3.2-90B for excellent RAG instruction following.
 */
export function getPrimaryModel() {
  const provider = createNvidiaProvider();
  return provider("meta/llama-3.2-90b-vision-instruct");
}

export const primaryModelSettings = {
  maxTokens: 1024,
  temperature: 0.7,
  topP: 1,
} as const;
