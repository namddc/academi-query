// ============================================================
//  knowledgeService.server.ts
//  2-Stage Hybrid FAQ Matching:
//  Stage 1 — Fast keyword pre-filter (top-40 candidates)
//  Stage 2 — LLM semantic re-ranking (understands meaning)
// ============================================================

import { generateText } from "ai";
import { getPrimaryModel } from "@/lib/ai-provider.server";
import {
  googleSheetsService,
  type FAQRow,
} from "@/services/googleSheetsService.server";

// ── Types ────────────────────────────────────────────────────

export interface KnowledgeResult {
  faqId: number;
  question: string;
  answer: string;
  confidence: number; // 0–100
}

// ── LRU Cache for match results ──────────────────────────────

const MAX_CACHE = 50;
const matchCache = new Map<string, { results: KnowledgeResult[]; ts: number }>();
const MATCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function normaliseKey(q: string): string {
  return q.toLowerCase().replace(/[?!.,;:\s]+/g, " ").trim();
}

function getCached(query: string): KnowledgeResult[] | null {
  const key = normaliseKey(query);
  const entry = matchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > MATCH_CACHE_TTL) {
    matchCache.delete(key);
    return null;
  }
  return entry.results;
}

function setCache(query: string, results: KnowledgeResult[]) {
  const key = normaliseKey(query);
  if (matchCache.size >= MAX_CACHE) {
    const oldest = matchCache.keys().next().value;
    if (oldest) matchCache.delete(oldest);
  }
  matchCache.set(key, { results, ts: Date.now() });
}

// ── Vietnamese text normalization ────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đ]/g, "d")
    .replace(/[Đ]/g, "d")
    .replace(/[?!.,;:()"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Vietnamese stopwords ──────────────────────────────────────
// Common words with low discriminative value — stripped before matching.

const STOPWORDS = new Set([
  "va", "la", "co", "the", "cua", "cho", "voi", "trong", "tren", "duoi",
  "khong", "duoc", "khi", "nhu", "cac", "nhung", "mot", "hay", "ma",
  "de", "tu", "bi", "boi", "qua", "lam", "nen", "se", "da", "dang",
  "thi", "nao", "gi", "ai", "dau", "bao", "nhieu", "rat", "hon", "nhat",
  "roi", "con", "them", "tiep", "sau", "truoc", "het", "xin", "hoi",
  "ban", "minh", "toi", "em", "anh", "chi", "tao", "may", "no", "ho",
  "oi", "nhi", "a", "nha", "nhe", "vay", "o", "nay", "do", "ay",
  "moi", "deu", "cung", "nhau", "kia", "muon", "can", "biet",
]);

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// ── Stage 1: Keyword Pre-filter ──────────────────────────────
// Scores ALL FAQs by token overlap, returns top-N.
// No hard threshold — we want candidates, not final answers.

function keywordPrefilter(
  query: string,
  faqs: FAQRow[],
  topN = 40,
): Array<{ faq: FAQRow; score: number }> {
  const queryTokens = tokenize(query);
  const queryNorm = normalize(query);

  if (queryTokens.length === 0) {
    return faqs.slice(0, topN).map((faq) => ({ faq, score: 0 }));
  }

  // Build bi-grams from query tokens
  const bigrams: string[] = [];
  for (let i = 0; i < queryTokens.length - 1; i++) {
    bigrams.push(`${queryTokens[i]} ${queryTokens[i + 1]}`);
  }

  const scored = faqs.map((faq) => {
    const faqNorm = normalize(faq.question + " " + faq.answer);

    // Exact phrase bonus
    const exactBonus = faqNorm.includes(queryNorm) ? 50 : 0;

    // Token hit ratio (weighted most)
    let tokenHits = 0;
    for (const t of queryTokens) {
      if (faqNorm.includes(t)) tokenHits++;
    }
    const tokenScore =
      queryTokens.length > 0 ? (tokenHits / queryTokens.length) * 40 : 0;

    // Bi-gram bonus
    let bigramHits = 0;
    for (const bg of bigrams) {
      if (faqNorm.includes(bg)) bigramHits++;
    }
    const bigramBonus =
      bigrams.length > 0 ? (bigramHits / bigrams.length) * 10 : 0;

    return { faq, score: Math.min(100, exactBonus + tokenScore + bigramBonus) };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

// ── Stage 2: LLM Semantic Re-ranking ────────────────────────
// Sends top-N candidates to LLM for semantic similarity scoring.
// This catches paraphrase, synonyms, and natural language variations.

const CONFIDENCE_THRESHOLD = 80;
const LLM_TIMEOUT_MS = 10000;

function buildMatchingPrompt(userQuery: string, faqs: FAQRow[]): string {
  const faqList = faqs
    .map((f, i) => `[${i + 1}] (id=${f.id}) "${f.question}"`)
    .join("\n");

  return `Bạn là hệ thống phân loại câu hỏi tiếng Việt. Tìm các câu FAQ có **ý nghĩa tương đồng** với câu hỏi của người dùng.

## Danh sách FAQ ứng viên:
${faqList}

## Câu hỏi người dùng:
"${userQuery}"

## Quy tắc:
- So sánh theo ý NGHĨA, KHÔNG phải từ ngữ.
- Hiểu tiếng lóng, từ đồng nghĩa, cách nói khác nhau.
- Ví dụ: "thầy đứng đầu trường" = "hiệu trưởng là ai".
- Confidence >= ${CONFIDENCE_THRESHOLD} mới trả về.
- CHỈ trả về JSON array thuần túy, KHÔNG có markdown hay giải thích.

## Format:
[{"faqIndex": 1, "confidence": 95}]`;
}

function parseMatchResponse(text: string, faqs: FAQRow[]): KnowledgeResult[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      faqIndex: number;
      confidence: number;
    }>;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (m) =>
          typeof m.faqIndex === "number" &&
          typeof m.confidence === "number" &&
          m.confidence >= CONFIDENCE_THRESHOLD,
      )
      .map((m) => {
        const faq = faqs[m.faqIndex - 1]; // 1-indexed
        if (!faq) return null;
        return {
          faqId: faq.id,
          question: faq.question,
          answer: faq.answer,
          confidence: m.confidence,
        };
      })
      .filter((r): r is KnowledgeResult => r !== null)
      .sort((a, b) => b.confidence - a.confidence);
  } catch (e) {
    console.error("[KnowledgeService] Failed to parse LLM match response:", e);
    return [];
  }
}

async function llmSemanticMatch(
  query: string,
  candidates: FAQRow[],
): Promise<KnowledgeResult[]> {
  if (candidates.length === 0) return [];

  const prompt = buildMatchingPrompt(query, candidates);

  // Race LLM against timeout to avoid blocking the response
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), LLM_TIMEOUT_MS),
  );

  const llmPromise = generateText({
    model: getPrimaryModel(),
    prompt,
    maxOutputTokens: 300,
  })
    .then((r) => r.text)
    .catch((e) => {
      console.error("[KnowledgeService] LLM semantic match failed:", e.message);
      return null;
    });

  const result = await Promise.race([llmPromise, timeoutPromise]);

  if (!result) {
    console.warn(
      "[KnowledgeService] LLM semantic match timed out or failed — falling through to L2.",
    );
    return [];
  }

  return parseMatchResponse(result, candidates);
}

// ── Exact Match Shortcut ─────────────────────────────────────
// Skip LLM if keyword already found a near-perfect match.

function extractExactMatches(
  candidates: Array<{ faq: FAQRow; score: number }>,
  threshold = 90,
): KnowledgeResult[] {
  return candidates
    .filter((c) => c.score >= threshold)
    .map((c) => ({
      faqId: c.faq.id,
      question: c.faq.question,
      answer: c.faq.answer,
      confidence: Math.round(c.score),
    }));
}

// ── Public API ───────────────────────────────────────────────

export const knowledgeService = {
  /**
   * Search FAQ by semantic meaning — 2-stage hybrid.
   *
   * Stage 1: Fast keyword pre-filter → top-40 candidates (no LLM)
   * Stage 2: LLM semantic re-ranking → understand intent & paraphrase
   *
   * This lets same-meaning but different-wording questions still match.
   */
  async searchKnowledge(query: string): Promise<KnowledgeResult[]> {
    if (!query.trim()) return [];

    const isDev = process.env.NODE_ENV === "development";

    if (!isDev) {
      const cached = getCached(query);
      if (cached) {
        console.log(
          `[KnowledgeService] Cache HIT for: "${query.slice(0, 50)}"`,
        );
        return cached;
      }
    }

    const faqs = googleSheetsService.getAllRows();
    if (faqs.length === 0) return [];

    // ── Stage 1: Keyword prefilter ─────────────────────────
    const candidates = keywordPrefilter(query, faqs, 40);

    if (candidates.length === 0) {
      console.log(
        `[KnowledgeService] No keyword candidates — skipping L1 for: "${query.slice(0, 50)}"`,
      );
      setCache(query, []);
      return [];
    }

    // Shortcut: very high keyword score → skip LLM call
    const exactMatches = extractExactMatches(candidates, 90);
    if (exactMatches.length > 0) {
      console.log(
        `[KnowledgeService] ⚡ Exact keyword match (${exactMatches.length}) for: "${query.slice(0, 50)}"`,
      );
      const top = exactMatches.slice(0, 5);
      setCache(query, top);
      return top;
    }

    // ── Stage 2: LLM semantic re-ranking ──────────────────
    console.log(
      `[KnowledgeService] 🧠 LLM semantic match on ${candidates.length} candidates for: "${query.slice(0, 50)}"`,
    );
    const candidateFaqs = candidates.map((c) => c.faq);
    const semanticResults = await llmSemanticMatch(query, candidateFaqs);

    if (semanticResults.length > 0) {
      console.log(
        `[KnowledgeService] ✅ Semantic match: ${semanticResults.length} FAQ(s) found`,
      );
      const top = semanticResults.slice(0, 5);
      setCache(query, top);
      return top;
    }

    // ── No L1 match → aiService will try L2 Chunk search
    console.log(
      `[KnowledgeService] ❌ No L1 match — falling through to L2 for: "${query.slice(0, 50)}"`,
    );
    setCache(query, []);
    return [];
  },

  /**
   * Build a context string from matched results for injection into system prompt.
   */
  buildContext(results: KnowledgeResult[]): string {
    if (results.length === 0) return "";

    const lines = results.map(
      (r, i) =>
        `### Kết quả ${i + 1} (Độ tin cậy: ${r.confidence}%)\n**Câu hỏi FAQ:** ${r.question}\n**Câu trả lời:** ${r.answer}\n*(Nguồn: FAQ #${r.faqId})*`,
    );

    return lines.join("\n\n");
  },
};
