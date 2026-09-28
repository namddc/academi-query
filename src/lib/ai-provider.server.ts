import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getExpSolutionConfig } from "@/lib/config.server";

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

/**
 * The primary model for chat & LLM tasks.
 * Uses ExpSolution gemmatranslate-27b.
 */
export function getPrimaryModel() {
  const provider = createExpSolutionProvider();
  if (provider) {
    return provider("gemmatranslate-27b");
  }
  // Fallback to NVIDIA if ExpSolution config is missing
  const nvidiaProvider = createOpenAICompatible({
    name: "nvidia",
    baseURL: "https://integrate.api.nvidia.com/v1",
    headers: {
      Authorization: `Bearer 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`,
    },
  });
  return nvidiaProvider("meta/llama-3.2-90b-vision-instruct");
}

export const primaryModelSettings = {
  maxTokens: 350,
  temperature: 0.7,
  topP: 1,
} as const;
