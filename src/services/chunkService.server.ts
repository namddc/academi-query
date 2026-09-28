// ============================================================
//  chunkService.server.ts
//  L2 Knowledge Retrieval — reads .md chunk files from
//  src/Database/chunk/, indexes by category, and searches
//  by keyword + LLM ranking.
//
//  Called ONLY when L1 FAQ returns no results.
// ============================================================

const mdFilesRaw = import.meta.glob('../Database/chunk/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
import { generateText } from "ai";
import { getPrimaryModel } from "@/lib/ai-provider.server";

// ── Types ────────────────────────────────────────────────────

export interface ChunkMetadata {
  doc_id: string;
  department: string;
  category: string;
  date: string;
  source: string;
}

export interface Chunk {
  id: string;
  filePath: string;
  fileName: string;
  metadata: ChunkMetadata;
  content: string;
}

export interface L2SearchResult {
  chunks: Chunk[];
  matchedCategory: string;
  keywords: string[];
}

// ── Category & Folder Mapping ────────────────────────────────

/**
 * Maps folder names to the categories they contain.
 * Used for heuristic pre-filtering before keyword search.
 */
const FOLDER_CATEGORY_MAP: Record<string, string[]> = {
  "01_Phong_Dao_Tao": [
    "postgraduate_training",
    "undergraduate_training",
    "doctoral_training",
    "textbook_regulation",
    "distance_training",
    "physical_education",
    "foreign_language_training",
    "internship",
    "credit_transfer",
  ],
  "02_Phong_Cong_Tac_Hoc_Sinh_Sinh_Vien": [
    "student_affairs",
    "scholarship",
    "tuition",
    "dormitory",
    "academic_regulation",
    "graduation",
    "conduct",
    "student_card",
    "class_advisor",
    "social_support",
    "student_records",
    "foreign_student",
  ],
  "03_Phong_Khao_Thi_va_Dam_Bao_Chat_Luong_Giao_Duc": [
    "exam",
    "quality_assurance",
    "academic_integrity",
  ],
  "04_Phong_Quan_Ly_Co_So_Vat_Chat": ["facility", "infrastructure"],
  "05_Phong_Hanh_Chinh_To_Chuc": [
    "administration",
    "organization",
    "human_resources",
  ],
  "06_Khoa_Hoc_Cong_Nghe_va_Hop_Tac_Quoc_Te": [
    "research",
    "international_cooperation",
    "science_technology",
  ],
  "07_Phong_Ke_Hoach_Tai_Chinh": ["finance", "budget", "planning"],
};

/**
 * Keyword heuristics to determine which folders/categories
 * to search first WITHOUT an extra LLM call.
 *
 * Keys are Vietnamese keyword patterns; values are ordered
 * lists of folder names (highest priority first).
 */
const KEYWORD_FOLDER_HINTS: Array<{
  patterns: string[];
  folders: string[];
}> = [
  {
    patterns: [
      "thạc sĩ",
      "cao học",
      "tiến sĩ",
      "nghiên cứu sinh",
      "sau đại học",
      "postgraduate",
      "master",
      "phd",
      "doctoral",
    ],
    folders: ["01_Phong_Dao_Tao"],
  },
  {
    patterns: [
      "đại học",
      "tín chỉ",
      "học phần",
      "chương trình đào tạo",
      "giáo trình",
      "bài giảng",
      "thực tập",
      "đồ án",
      "khóa luận",
      "tốt nghiệp đại học",
      "đăng ký môn",
      "học từ xa",
      "e-learning",
      "thể chất",
      "gdtc",
    ],
    folders: ["01_Phong_Dao_Tao"],
  },
  {
    patterns: [
      "học bổng",
      "học phí",
      "miễn giảm",
      "hỗ trợ",
      "trợ cấp",
      "ký túc xá",
      "nội trú",
      "sinh viên",
      "rèn luyện",
      "điểm rèn luyện",
      "thẻ sinh viên",
      "cố vấn học tập",
      "khen thưởng",
      "kỷ luật",
      "ngoại khóa",
      "ứng xử",
      "nội quy",
      "hồ sơ",
      "văn bằng",
      "chứng chỉ",
      "tốt nghiệp",
      "bằng tốt nghiệp",
      "an ninh mạng",
      "mạng xã hội",
    ],
    folders: [
      "02_Phong_Cong_Tac_Hoc_Sinh_Sinh_Vien",
      "01_Phong_Dao_Tao",
    ],
  },
  {
    patterns: ["thi", "kiểm tra", "đánh giá", "chất lượng", "khảo thí"],
    folders: [
      "03_Phong_Khao_Thi_va_Dam_Bao_Chat_Luong_Giao_Duc",
      "01_Phong_Dao_Tao",
      "02_Phong_Cong_Tac_Hoc_Sinh_Sinh_Vien",
    ],
  },
  {
    patterns: ["cơ sở vật chất", "phòng học", "thiết bị", "ký túc xá"],
    folders: [
      "04_Phong_Quan_Ly_Co_So_Vat_Chat",
      "02_Phong_Cong_Tac_Hoc_Sinh_Sinh_Vien",
    ],
  },
  {
    patterns: ["nghiên cứu khoa học", "hợp tác quốc tế", "đề tài", "dự án"],
    folders: ["06_Khoa_Hoc_Cong_Nghe_va_Hop_Tac_Quoc_Te"],
  },
  {
    patterns: ["tài chính", "kế hoạch", "ngân sách", "kinh phí"],
    folders: ["07_Phong_Ke_Hoach_Tai_Chinh"],
  },
];

// ── Chunk Parser ─────────────────────────────────────────────

/**
 * Parse a single .md file string into multiple Chunk objects.
 * Each chunk is separated by "---" and contains a Metadata block + Nội dung block.
 */
function parseChunkString(raw: string, filePath: string, fileName: string): Chunk[] {

  // Split on horizontal rules (--- on its own line)
  const sections = raw.split(/\n---+\n/);
  const chunks: Chunk[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Extract metadata block
    const metaMatch = trimmed.match(
      /##\s*Metadata\s*\n([\s\S]*?)(?=##\s*Nội dung|$)/i,
    );
    const contentMatch = trimmed.match(/##\s*Nội dung\s*\n([\s\S]*?)$/i);

    if (!contentMatch) continue;

    const content = contentMatch[1].trim();
    if (!content || content.length < 20) continue;

    // Parse metadata fields
    const metadata: ChunkMetadata = {
      doc_id: "",
      department: "",
      category: "",
      date: "",
      source: "",
    };

    if (metaMatch) {
      const metaBlock = metaMatch[1];
      const extract = (key: string): string => {
        const m = metaBlock.match(
          new RegExp(`\\*\\*${key}\\*\\*:\\s*(.+)`, "i"),
        );
        return m ? m[1].trim() : "";
      };
      metadata.doc_id = extract("doc_id");
      metadata.department = extract("department");
      metadata.category = extract("category");
      metadata.date = extract("date");
      metadata.source = extract("source");
    }

    const id = `${fileName}::${chunks.length}`;
    chunks.push({ id, filePath, fileName, metadata, content });
  }

  return chunks;
}

// ── In-Memory Index ──────────────────────────────────────────

interface FolderIndex {
  folder: string;
  chunks: Chunk[];
}

let _index: Map<string, FolderIndex> | null = null; // folder → FolderIndex

function buildIndex(): Map<string, FolderIndex> {
  const index = new Map<string, FolderIndex>();
  let totalChunks = 0;
  
  const filesByFolder = new Map<string, number>();

  for (const [path, raw] of Object.entries(mdFilesRaw)) {
    // path is something like "../Database/chunk/01_Phong_Dao_Tao/QĐ 1016...md"
    const parts = path.split('/');
    const fileName = parts.pop() || '';
    const folder = parts.pop() || '';

    const chunks = parseChunkString(raw, path, fileName);
    
    if (!index.has(folder)) {
      index.set(folder, { folder, chunks: [] });
    }
    index.get(folder)!.chunks.push(...chunks);
    
    filesByFolder.set(folder, (filesByFolder.get(folder) || 0) + 1);
    totalChunks += chunks.length;
  }

  for (const [folder, count] of filesByFolder.entries()) {
    const chunkCount = index.get(folder)?.chunks.length || 0;
    console.log(
      `[ChunkService] Indexed folder "${folder}": ${count} files → ${chunkCount} chunks`,
    );
  }

  console.log(`[ChunkService] Total chunks indexed: ${totalChunks}`);
  return index;
}

/** Lazy singleton — built on first access. */
function getIndex(): Map<string, FolderIndex> {
  if (!_index) {
    _index = buildIndex();
  }
  return _index;
}

// ── Category / Folder Selection ──────────────────────────────

/**
 * Use keyword heuristics to determine which folders to search first.
 * Returns folders in priority order.
 * Falls back to ALL folders if no pattern matches.
 */
function selectFolders(query: string): string[] {
  const q = query.toLowerCase();

  const matched: string[] = [];
  for (const hint of KEYWORD_FOLDER_HINTS) {
    if (hint.patterns.some((p) => q.includes(p))) {
      for (const folder of hint.folders) {
        if (!matched.includes(folder)) matched.push(folder);
      }
    }
  }

  if (matched.length > 0) return matched;

  // Global search — return all folders
  return Object.keys(FOLDER_CATEGORY_MAP);
}

// ── Keyword Extraction ───────────────────────────────────────

const STOP_WORDS = new Set([
  "là",
  "và",
  "của",
  "trong",
  "có",
  "không",
  "được",
  "các",
  "này",
  "đó",
  "với",
  "từ",
  "để",
  "cho",
  "về",
  "theo",
  "tại",
  "trên",
  "ra",
  "vào",
  "thì",
  "khi",
  "nếu",
  "như",
  "tôi",
  "bạn",
  "cho",
  "hỏi",
  "muốn",
  "biết",
  "gì",
  "nào",
  "bao",
  "nhiêu",
  "thế",
  "làm",
  "sao",
  "ơi",
  "nhé",
  "ạ",
  "mình",
]);

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[?!.,;:()"']/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// ── Chunk Keyword Scoring ────────────────────────────────────

function scoreChunk(chunk: Chunk, keywords: string[]): number {
  if (keywords.length === 0) return 0;

  const haystack =
    (chunk.metadata.source + " " + chunk.content).toLowerCase();

  let hits = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) hits++;
  }

  const baseScore = (hits / keywords.length) * 100;

  // Bonus: exact phrase match
  const phrase = keywords.join(" ");
  const phraseBonus = haystack.includes(phrase) ? 15 : 0;

  // Bonus: keyword appears in source/doc_id (more relevant)
  const metaStr =
    (chunk.metadata.source + " " + chunk.metadata.doc_id).toLowerCase();
  const metaBonus = keywords.some((kw) => metaStr.includes(kw)) ? 10 : 0;

  return Math.min(100, baseScore + phraseBonus + metaBonus);
}

// ── LLM Re-ranking (optional, used when API key is available) ─

const L2_RERANK_THRESHOLD = 40; // minimum keyword score to include a chunk

async function rerankWithLLM(
  query: string,
  candidates: Array<{ chunk: Chunk; score: number }>,
): Promise<Array<{ chunk: Chunk; score: number }>> {
  if (candidates.length <= 1) return candidates;

  try {
    const chunkList = candidates
      .slice(0, 8) // limit to 8 candidates for LLM reranking
      .map(
        (c, i) =>
          `[${i + 1}] Nguồn: ${c.chunk.metadata.source || c.chunk.metadata.doc_id}\n${c.chunk.content.slice(0, 300)}...`,
      )
      .join("\n\n");

    const prompt = `Bạn là hệ thống xếp hạng thông tin. Câu hỏi của sinh viên: "${query}"

Dưới đây là ${candidates.slice(0, 8).length} đoạn văn bản từ quy định của trường:

${chunkList}

Hãy xếp hạng các đoạn văn theo mức độ liên quan đến câu hỏi. Trả về JSON array với format:
[{"index": 1, "score": 90}, {"index": 2, "score": 70}]
CHỈ trả về JSON, không giải thích. Score từ 0-100.`;

    const { text } = await generateText({
      model: getPrimaryModel(),
      prompt,
      temperature: 0.1,
      maxOutputTokens: 1024,
    });

    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return candidates;

    const ranked = JSON.parse(jsonMatch[0]) as Array<{
      index: number;
      score: number;
    }>;

    // Apply LLM scores back
    const reranked = [...candidates];
    for (const r of ranked) {
      const idx = r.index - 1;
      if (idx >= 0 && idx < reranked.length) {
        reranked[idx].score = r.score;
      }
    }

    return reranked.sort((a, b) => b.score - a.score);
  } catch (e) {
    console.warn("[ChunkService] LLM reranking failed, using keyword scores:", e);
    return candidates;
  }
}

// ── Public API ───────────────────────────────────────────────

const TOP_K = 5; // number of chunks to return
const MIN_KEYWORD_SCORE = 15; // minimum score to include in results

export const chunkService = {
  /**
   * Search L2 chunk knowledge base.
   * Steps:
   *   1. Select folders by keyword heuristic
   *   2. Extract keywords from query
   *   3. Score all chunks in selected folders
   *   4. Re-rank top candidates with LLM (optional)
   *   5. Return top K chunks
   */
  async searchL2(query: string): Promise<L2SearchResult> {
    if (!query.trim()) {
      return { chunks: [], matchedCategory: "", keywords: [] };
    }

    const index = getIndex();
    const targetFolders = selectFolders(query);
    const keywords = extractKeywords(query);

    console.log(
      `[ChunkService] L2 search: "${query.slice(0, 60)}" → folders: [${targetFolders.join(", ")}] | keywords: [${keywords.join(", ")}]`,
    );

    // Score all chunks in targeted folders
    const candidates: Array<{ chunk: Chunk; score: number }> = [];

    for (const folder of targetFolders) {
      const folderIndex = index.get(folder);
      if (!folderIndex || folderIndex.chunks.length === 0) continue;

      for (const chunk of folderIndex.chunks) {
        const score = scoreChunk(chunk, keywords);
        if (score >= MIN_KEYWORD_SCORE) {
          candidates.push({ chunk, score });
        }
      }
    }

    if (candidates.length === 0) {
      console.log("[ChunkService] No candidates found above threshold.");
      return { chunks: [], matchedCategory: "", keywords };
    }

    // Sort by keyword score first
    candidates.sort((a, b) => b.score - a.score);

    // Skip LLM reranking to avoid API latency and hallucination timeouts.
    // Keyword scoring is highly accurate for these documents.
    const topChunks = candidates
      .slice(0, TOP_K)
      .map((c) => c.chunk);

    const matchedCategory =
      topChunks[0]?.metadata.category || targetFolders[0] || "";

    console.log(
      `[ChunkService] L2 results: ${topChunks.length} chunks | category: "${matchedCategory}"`,
    );

    return { chunks: topChunks, matchedCategory, keywords };
  },

  /**
   * Build a formatted context string from L2 chunks
   * for injection into the system prompt.
   */
  buildL2Context(result: L2SearchResult): string {
    if (result.chunks.length === 0) return "";

    const lines = result.chunks.map(
      (chunk, i) =>
        `### Tài liệu ${i + 1}\n**Nguồn:** ${chunk.metadata.doc_id || chunk.fileName} — ${chunk.metadata.source}\n**Danh mục:** ${chunk.metadata.category}\n**Ngày:** ${chunk.metadata.date}\n\n${chunk.content}`,
    );

    return lines.join("\n\n---\n\n");
  },

  /** Force re-build the index (useful for hot reload in dev). */
  resetIndex() {
    _index = null;
  },
};
