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

/**
 * Create a per-request ExpSolution provider.
 * Must be called inside a server handler (not at module scope)
 * so that process.env reads happen at request time.
 */
export function createExpSolutionProvider() {
  const { apiKey, baseURL } = getExpSolutionConfig();

  if (!apiKey) {
    console.warn(
      "[AIProvider] EXPSOLUTION_API_KEY missing — falling back to NVIDIA.",
    );
    return null;
  }

  return createOpenAICompatible({
    name: "expsolution",
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    // Graceful error handling: log network failures instead of crashing
    fetch: async (input, init) => {
      try {
        const response = await fetch(input, init);
        if (!response.ok) {
          const errText = await response.clone().text();
          console.error(
            `[ExpSolution] HTTP ${response.status}: ${errText.slice(0, 200)}`,
          );
        }
        return response;
      } catch (err) {
        console.error("[ExpSolution] Network error:", err);
        throw err;
      }
    },
  });
}

// ── NVIDIA Provider (fallback) ───────────────────
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
 * Returns ExpSolution model when available, falls back to NVIDIA.
 */
export function getPrimaryModel() {
  const provider = createExpSolutionProvider();
  if (provider) {
    return provider("gemmatranslate-27b");
  }
  
  const nvidiaProvider = createNvidiaProvider();
  return nvidiaProvider("meta/llama-3.2-90b-vision-instruct");
}

export const primaryModelSettings = {
  maxTokens: 1024,
  temperature: 0.7,
  topP: 1,
} as const;
