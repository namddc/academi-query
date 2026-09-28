import { google } from "@ai-sdk/google";

/**
 * The primary model for chat & LLM tasks.
 * Uses Google Gemini 1.5 Flash because it's extremely fast and excellent at Vietnamese RAG.
 */
export function getPrimaryModel() {
  return google("gemini-1.5-flash");
}

export const primaryModelSettings = {
  maxTokens: 1024,
  temperature: 0.7,
  topP: 1,
} as const;
