// ============================================================
//  googleSheetsService.server.ts
//  Loads FAQ data from local CSV file, deduplicates, caches in-memory.
//  No external dependencies — pure Node.js CSV parsing.
// ============================================================

import faqCsvRaw from "../Database/ibot_faq_100.csv?raw";

// ── Types ────────────────────────────────────────────────────

export interface FAQRow {
  id: number;
  question: string;
  answer: string;
  active: boolean;
}

// ── CSV Parser ───────────────────────────────────────────────
// Handles quoted fields with commas and newlines inside them.

function parseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Normalise line endings
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        // Escaped quote
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }

  // Last field / row
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ── Deduplication ────────────────────────────────────────────

function dedup(rows: FAQRow[]): FAQRow[] {
  const seen = new Map<string, FAQRow>();
  for (const row of rows) {
    const key = row.question
      .toLowerCase()
      .replace(/[?!.,;:]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!seen.has(key)) {
      seen.set(key, row);
    }
  }
  return Array.from(seen.values());
}

// ── Cache Layer ──────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedRows: FAQRow[] | null = null;
let cacheTime = 0;

function loadFromDisk(): FAQRow[] {
  try {
    const raw = faqCsvRaw;
    const rows2d = parseCSV(raw);

    if (rows2d.length < 2) {
      console.warn("[GoogleSheetsService] CSV file has no data rows.");
      return [];
    }

    // Row 0 is the header — detect column indices dynamically
    const header = rows2d[0].map((h) => h.trim().toLowerCase());
    const idIdx = 0;
    const qIdx = header.findIndex((h) => h.startsWith("question"));
    const aIdx = header.findIndex((h) => h.startsWith("answer"));
    const activeIdx = header.findIndex((h) => h.startsWith("active"));

    if (qIdx === -1 || aIdx === -1) {
      console.warn("[GoogleSheetsService] Could not detect question/answer columns in CSV header:", header);
      return [];
    }

    const rows: FAQRow[] = [];
    for (let i = 1; i < rows2d.length; i++) {
      const fields = rows2d[i];
      if (!fields || fields.length < 3) continue;

      const id = parseInt(String(fields[idIdx] ?? "").trim(), 10) || i;
      const question = String(fields[qIdx] ?? "").trim();
      const answer = String(fields[aIdx] ?? "").trim();
      const activeRaw = String(fields[activeIdx] ?? "1").trim();
      const active = activeRaw !== "0" && activeRaw.toLowerCase() !== "false";

      if (!question) continue;
      rows.push({ id, question, answer, active });
    }

    const unique = dedup(rows.filter((r) => r.active));
    console.log(
      `[GoogleSheetsService] ✅ Loaded ${rows.length} rows → ${unique.length} unique active FAQs from CSV`,
    );
    return unique;
  } catch (e) {
    console.error(`[GoogleSheetsService] Error parsing CSV:`, e);
  }

  console.warn("[GoogleSheetsService] ❌ Could not parse FAQ CSV file. Using empty dataset.");
  return [];
}

// ── Public API ───────────────────────────────────────────────

export const googleSheetsService = {
  /** Get all unique active FAQ rows (cached). */
  getAllRows(): FAQRow[] {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      return loadFromDisk();
    }

    const now = Date.now();
    if (!cachedRows || now - cacheTime > CACHE_TTL_MS) {
      cachedRows = loadFromDisk();
      cacheTime = now;
    }
    return cachedRows;
  },


  /** Force refresh the cache. */
  refreshCache(): FAQRow[] {
    cachedRows = null;
    cacheTime = 0;
    return this.getAllRows();
  },

  /** Get a single row by ID. */
  getById(id: number): FAQRow | undefined {
    return this.getAllRows().find((r) => r.id === id);
  },
};
