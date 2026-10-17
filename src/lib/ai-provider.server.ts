import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getExpSolutionConfig } from "@/lib/config.server";

// Track which key is currently performing well (0 = primary, 1 = backup)
let activeKeyIndex = 0;

/**
 * Create a per-request ExpSolution provider with High-Availability Auto-Failover.
 * If the primary key fails (HTTP 401/403/429/5xx or network drop),
 * it seamlessly and automatically retries with the backup key.
 */
export function createExpSolutionProvider() {
  const { allKeys, baseURL } = getExpSolutionConfig();

  if (allKeys.length === 0) {
    console.error(
      "[AIProvider] EXPSOLUTION_API_KEY is not set in environment variables. Please add it to Vercel Settings > Environment Variables.",
    );
    return null;
  }

  // Ensure activeKeyIndex is within bounds
  if (activeKeyIndex >= allKeys.length) {
    activeKeyIndex = 0;
  }

  const primaryKey = allKeys[activeKeyIndex];

  return createOpenAICompatible({
    name: "expsolution",
    baseURL,
    headers: {
      Authorization: `Bearer ${primaryKey}`,
    },
    fetch: async (input, init) => {
      const keys = allKeys;
      let keyIdx = activeKeyIndex;

      // Helper to execute request with a specific API key
      const tryFetchWithKey = async (idx: number) => {
        const key = keys[idx];
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${key}`);
        return fetch(input, {
          ...init,
          headers,
        });
      };

      try {
        let response = await tryFetchWithKey(keyIdx);

        // Failover if HTTP error indicates key exhaustion, invalid auth, or rate limit
        if (
          !response.ok &&
          (response.status === 401 ||
            response.status === 403 ||
            response.status === 429 ||
            response.status >= 500)
        ) {
          const errText = await response.clone().text().catch(() => "");
          const maskedCurrent = keys[keyIdx].slice(0, 15) + "...";
          console.warn(
            `[ExpSolution] Key #${keyIdx + 1} (${maskedCurrent}) failed with HTTP ${response.status}: ${errText.slice(0, 150)}`,
          );

          // If we have a backup key available, failover immediately!
          if (keys.length > 1) {
            const nextIdx = (keyIdx + 1) % keys.length;
            const maskedBackup = keys[nextIdx].slice(0, 15) + "...";
            console.log(
              `[ExpSolution] 🔄 Automatically failing over to Backup Key #${nextIdx + 1} (${maskedBackup})...`,
            );

            const fallbackResponse = await tryFetchWithKey(nextIdx);

            if (fallbackResponse.ok) {
              console.log(
                `[ExpSolution] ✅ Backup Key #${nextIdx + 1} succeeded! Switched active key for future queries.`,
              );
              activeKeyIndex = nextIdx; // Remember working key
              return fallbackResponse;
            } else {
              const fallbackErr = await fallbackResponse.clone().text().catch(() => "");
              console.error(
                `[ExpSolution] ❌ Backup Key #${nextIdx + 1} also failed with HTTP ${fallbackResponse.status}: ${fallbackErr.slice(0, 150)}`,
              );
              return fallbackResponse;
            }
          }
        }

        return response;
      } catch (err) {
        console.error(`[ExpSolution] Network error with key #${keyIdx + 1}:`, err);
        // Failover on network error if multiple keys exist
        if (keys.length > 1) {
          const nextIdx = (keyIdx + 1) % keys.length;
          console.log(`[ExpSolution] 🔄 Retrying with Backup Key #${nextIdx + 1}...`);
          try {
            const retryRes = await tryFetchWithKey(nextIdx);
            if (retryRes.ok) {
              activeKeyIndex = nextIdx;
              return retryRes;
            }
          } catch (e2) {
            console.error("[ExpSolution] Backup key also threw error:", e2);
          }
        }
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
