import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
  };
}

/**
 * ExpSolution AI Gateway — OpenAI-compatible endpoint.
 * Supports primary key and backup/fallback key for high availability.
 * Keys must NEVER reach the client (no VITE_ prefix).
 */
export function getExpSolutionConfig() {
  const primaryKey = process.env.EXPSOLUTION_API_KEY?.trim() ?? "";
  const backupKey = (
    process.env.EXPSOLUTION_API_KEY_BACKUP ??
    process.env.EXPSOLUTION_API_KEY_FALLBACK ??
    ""
  ).trim();

  // Support comma-separated list or separate env vars
  const allKeys: string[] = [];
  if (primaryKey) {
    if (primaryKey.includes(",")) {
      allKeys.push(...primaryKey.split(",").map((k) => k.trim()).filter(Boolean));
    } else {
      allKeys.push(primaryKey);
    }
  }
  if (backupKey && !allKeys.includes(backupKey)) {
    allKeys.push(backupKey);
  }

  const baseURL =
    process.env.EXPSOLUTION_BASE_URL ?? "https://ai.expsolution.io/v1";

  if (allKeys.length === 0) {
    console.warn(
      "[Config] EXPSOLUTION_API_KEY not set — ExpSolution provider disabled.",
    );
  }

  return {
    apiKey: allKeys[0] ?? "",
    backupKey: allKeys[1],
    allKeys,
    baseURL,
  };
}
