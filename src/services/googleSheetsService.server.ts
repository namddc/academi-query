// ============================================================
//  googleSheetsService.server.ts
//  Loads FAQ data directly from SQLite Database (table: faqs)
// ============================================================

import { dbService } from "@/lib/db.server";

// ── Types ────────────────────────────────────────────────────

export interface FAQRow {
  id: number;
  question: string;
  answer: string;
  active: boolean;
}

// ── Cache Layer ──────────────────────────────────────────────
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache in memory
let cachedRows: FAQRow[] | null = null;
let cacheTime = 0;

function loadFromDatabase(): FAQRow[] {
  try {
    const rows = dbService.getAllActiveFaqs();
    return rows.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      active: Boolean(r.active),
    }));
  } catch (e) {
    console.error("[GoogleSheetsService] Error loading FAQs from SQLite database:", e);
    return [];
  }
}

// ── Public API ───────────────────────────────────────────────

export const googleSheetsService = {
  /** Get all unique active FAQ rows from SQLite database (cached). */
  getAllRows(): FAQRow[] {
    const now = Date.now();
    if (!cachedRows || now - cacheTime > CACHE_TTL_MS) {
      cachedRows = loadFromDatabase();
      cacheTime = now;
      console.log(`[GoogleSheetsService] ✅ Loaded ${cachedRows.length} active FAQs from SQLite database.`);
    }
    return cachedRows;
  },

  /** Force refresh the cache. */
  refreshCache(): FAQRow[] {
    cachedRows = loadFromDatabase();
    cacheTime = Date.now();
    return cachedRows;
  },

  /** Get a single row by ID from SQLite database. */
  getById(id: number): FAQRow | undefined {
    return this.getAllRows().find((r) => r.id === id);
  },
};
