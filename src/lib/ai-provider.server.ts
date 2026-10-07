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
    console.error(
      "[AIProvider] EXPSOLUTION_API_KEY is not set in environment variables. Please add it to Vercel Settings > Environment Variables.",
    );
    return null;
  }

  return createOpenAICompatible({
    name: "expsolution",
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
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
 * The primary model: ExpSolution gemmatranslate-27b
 */
export function getPrimaryModel() {
  const provider = createExpSolutionProvider();
  if (!provider) {
    throw new Error(
      "AI provider not configured. Please set EXPSOLUTION_API_KEY in Vercel environment variables.",
    );
  }
  return provider("gemmatranslate-27b");
}

// ── Model settings ────────────────────────────────────────────

export const primaryModelSettings = {
  maxTokens: 512,
  temperature: 0.7,
  topP: 1,
} as const;

// Keep nvidiaModel exported for OCR calls (vision model)
// but use a null-safe wrapper so it only fails at call time
export const nvidia = createOpenAICompatible({
  name: "nvidia-vision",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.NVIDIA_API_KEY ?? ""}`,
  },
});

export const nvidiaModel = nvidia("meta/llama-3.2-90b-vision-instruct");

export const nvidiaModelSettings = {
  maxTokens: 512,
  temperature: 1,
  topP: 1,
} as const;

