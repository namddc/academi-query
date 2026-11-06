// ============================================================
//  db.server.ts
//  Central SQLite Database connection and typed queries
//  Database file: src/Database/database.sqlite
// ============================================================

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db: Database.Database | null = null;

function resolveDbPath(): string {
  const isVercel = Boolean(process.env.VERCEL) || process.platform === "linux" || process.cwd().startsWith("/var/task");

  if (isVercel) {
    const tmpPath = path.join("/tmp", "database.sqlite");

    if (!fs.existsSync(tmpPath)) {
      const candidates = [
        path.resolve(process.cwd(), "src", "Database", "database.sqlite"),
        path.resolve(process.cwd(), "Database", "database.sqlite"),
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            fs.copyFileSync(cand, tmpPath);
            break;
          } catch {
            // Ignore copy failure
          }
        }
      }
    }
    return tmpPath;
  }

  const localPath = path.resolve(process.cwd(), "src", "Database", "database.sqlite");
  const localDir = path.dirname(localPath);
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      // Ignore
    }
  }
  return localPath;
}

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = resolveDbPath();
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch {
        // Ignore
      }
    }

    try {
      _db = new Database(dbPath);
      _db.pragma("journal_mode = WAL");
      _db.pragma("foreign_keys = ON");
    } catch (err) {
      console.warn("[DB] Could not open database file, using in-memory database fallback:", err);
      _db = new Database(":memory:");
    }

    // Initialize tables if they don't exist
    _db.exec(`
      CREATE TABLE IF NOT EXISTS faqs (
        id INTEGER PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(active);

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        doc_id TEXT,
        department TEXT,
        category TEXT,
        date TEXT,
        source TEXT,
        content TEXT NOT NULL,
        token_count INTEGER DEFAULT 0,
        checksum TEXT,
        enriched_content TEXT,
        doc_title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_department ON chunks(department);
      CREATE INDEX IF NOT EXISTS idx_chunks_category ON chunks(category);

      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_threads_user_updated ON threads(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        parts TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at ASC);

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        mssv TEXT,
        faculty TEXT,
        status TEXT DEFAULT 'active',
        blocked_reason TEXT,
        blocked_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        thread_id TEXT,
        value TEXT NOT NULL,
        reason TEXT,
        note TEXT,
        user_question TEXT,
        assistant_snippet TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chunk_vectors (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        vector_json TEXT NOT NULL,
        checksum TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_vectors_source_type ON chunk_vectors(source_type);
    `);

    // Migration: add new columns if they don't exist yet
    const chunkColumns = ["token_count INTEGER DEFAULT 0", "checksum TEXT", "enriched_content TEXT", "doc_title TEXT"];
    for (const col of chunkColumns) {
      try {
        _db.exec(`ALTER TABLE chunks ADD COLUMN ${col}`);
      } catch {
        // Column already exists, safe to ignore
      }
    }
  }
  return _db;
}

// ── Types ────────────────────────────────────────────────────

export interface DBFaq {
  id: number;
  question: string;
  answer: string;
  active: number;
  created_at: string;
}

export interface DBChunk {
  id: string;
  file_path: string;
  file_name: string;
  doc_id: string;
  department: string;
  category: string;
  date: string;
  source: string;
  content: string;
  token_count?: number;
  checksum?: string;
  enriched_content?: string;
  doc_title?: string;
  created_at: string;
}

export interface DBThread {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DBMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  parts: string; // JSON string of parts
  created_at: string;
}

export interface DBFeedback {
  id: number;
  message_id: string;
  thread_id?: string;
  value: "up" | "down";
  reason?: string;
  note?: string;
  user_question?: string;
  assistant_snippet?: string;
  created_at: string;
}

// ── Query Functions ──────────────────────────────────────────

export const dbService = {
  // ── FAQs ──────────────────────────────────────────────────
  getAllActiveFaqs(): DBFaq[] {
    const db = getDb();
    return db.prepare("SELECT * FROM faqs WHERE active = 1 ORDER BY id ASC").all() as DBFaq[];
  },

  getFaqById(id: number): DBFaq | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM faqs WHERE id = ?").get(id) as DBFaq | undefined;
  },

  searchFaqsByKeywords(keywords: string[]): DBFaq[] {
    if (keywords.length === 0) return this.getAllActiveFaqs();
    const db = getDb();
    // Build SQL query with LIKE for each keyword
    const clauses = keywords.map(() => "(question LIKE ? OR answer LIKE ?)").join(" OR ");
    const params = keywords.flatMap((k) => [`%${k}%`, `%${k}%`]);
    const stmt = db.prepare(`SELECT * FROM faqs WHERE active = 1 AND (${clauses}) LIMIT 40`);
    return stmt.all(...params) as DBFaq[];
  },

  // ── Chunks ────────────────────────────────────────────────
  getAllChunks(): DBChunk[] {
    const db = getDb();
    return db.prepare("SELECT * FROM chunks").all() as DBChunk[];
  },

  getChunksByDepartmentOrCategory(department?: string, category?: string): DBChunk[] {
    const db = getDb();
    if (department && category) {
      return db
        .prepare("SELECT * FROM chunks WHERE department = ? OR category = ?")
        .all(department, category) as DBChunk[];
    } else if (department) {
      return db.prepare("SELECT * FROM chunks WHERE department = ?").all(department) as DBChunk[];
    } else if (category) {
      return db.prepare("SELECT * FROM chunks WHERE category = ?").all(category) as DBChunk[];
    }
    return this.getAllChunks();
  },

  upsertChunks(chunks: Array<Omit<DBChunk, "created_at">>): void {
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO chunks (
        id, file_path, file_name, doc_id, department, category, date, source, content,
        token_count, checksum, enriched_content, doc_title
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        file_path = excluded.file_path,
        file_name = excluded.file_name,
        doc_id = excluded.doc_id,
        department = excluded.department,
        category = excluded.category,
        date = excluded.date,
        source = excluded.source,
        content = excluded.content,
        token_count = excluded.token_count,
        checksum = excluded.checksum,
        enriched_content = excluded.enriched_content,
        doc_title = excluded.doc_title
    `);

    const tx = db.transaction((items: Array<Omit<DBChunk, "created_at">>) => {
      for (const item of items) {
        insert.run(
          item.id,
          item.file_path,
          item.file_name,
          item.doc_id ?? "",
          item.department ?? "",
          item.category ?? "",
          item.date ?? "",
          item.source ?? "",
          item.content,
          item.token_count ?? 0,
          item.checksum ?? "",
          item.enriched_content ?? "",
          item.doc_title ?? ""
        );
      }
    });

    tx(chunks);
  },

  // ── Chunk Vectors ──────────────────────────────────────────
  getAllChunkVectors(): Array<{ id: string; source_type: string; vector_json: string; checksum: string }> {
    const db = getDb();
    return db.prepare("SELECT * FROM chunk_vectors").all() as any;
  },

  upsertChunkVectors(vectors: Array<{ id: string; source_type: string; vector_json: string; checksum?: string }>): void {
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO chunk_vectors (id, source_type, vector_json, checksum, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        source_type = excluded.source_type,
        vector_json = excluded.vector_json,
        checksum = excluded.checksum,
        updated_at = CURRENT_TIMESTAMP
    `);

    const tx = db.transaction((items: Array<{ id: string; source_type: string; vector_json: string; checksum?: string }>) => {
      for (const item of items) {
        insert.run(item.id, item.source_type, item.vector_json, item.checksum ?? "");
      }
    });

    tx(vectors);
  },

  // ── Threads ───────────────────────────────────────────────
  listThreads(userId: string): DBThread[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM threads WHERE user_id = ? ORDER BY updated_at DESC")
      .all(userId) as DBThread[];
  },

  getThread(id: string): DBThread | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM threads WHERE id = ?").get(id) as DBThread | undefined;
  },

  upsertThread(thread: DBThread): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO threads (id, user_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at
    `).run(thread.id, thread.user_id, thread.title, thread.created_at, thread.updated_at);
  },

  deleteThread(id: string): void {
    const db = getDb();
    db.prepare("DELETE FROM threads WHERE id = ?").run(id);
  },

  renameThread(id: string, title: string): void {
    const db = getDb();
    db.prepare("UPDATE threads SET title = ?, updated_at = ? WHERE id = ?").run(
      title,
      new Date().toISOString(),
      id
    );
  },

  // ── Messages ──────────────────────────────────────────────
  getMessages(threadId: string): DBMessage[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC")
      .all(threadId) as DBMessage[];
  },

  saveMessages(threadId: string, messages: DBMessage[]): void {
    const db = getDb();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO messages (id, thread_id, user_id, role, parts, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateThread = db.prepare(`
      UPDATE threads SET updated_at = ? WHERE id = ?
    `);

    const tx = db.transaction((msgs: DBMessage[]) => {
      for (const m of msgs) {
        insert.run(m.id, threadId, m.user_id, m.role, m.parts, m.created_at);
      }
      updateThread.run(new Date().toISOString(), threadId);
    });

    tx(messages);
  },

  // ── Feedbacks ─────────────────────────────────────────────
  saveFeedback(data: Omit<DBFeedback, "id">): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO feedbacks (message_id, thread_id, value, reason, note, user_question, assistant_snippet, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.message_id,
      data.thread_id ?? null,
      data.value,
      data.reason ?? null,
      data.note ?? null,
      data.user_question ?? null,
      data.assistant_snippet ?? null,
      data.created_at
    );
  },

  getFeedbacks(): DBFeedback[] {
    const db = getDb();
    return db.prepare("SELECT * FROM feedbacks ORDER BY created_at DESC").all() as DBFeedback[];
  },
};
