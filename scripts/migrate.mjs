// ============================================================
//  scripts/migrate.mjs
//  Migrate CSV FAQs + MD Chunks + Default Users into SQLite Database
// ============================================================

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "src", "Database", "database.sqlite");

console.log(`[Migrate] Target database: ${dbPath}`);
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// ── 1. Create Tables ──────────────────────────────────────────
db.exec(`
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
`);

console.log("[Migrate] ✅ Tables created/verified.");

// ── 2. Import CSV FAQs ────────────────────────────────────────
const csvPath = path.join(rootDir, "src", "Database", "ibot_faq_100.csv");
if (fs.existsSync(csvPath)) {
  const rawCsv = fs.readFileSync(csvPath, "utf-8");

  function parseCSV(raw) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') {
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
    if (field || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  const rows2d = parseCSV(rawCsv);
  if (rows2d.length > 1) {
    const header = rows2d[0].map((h) => h.trim().toLowerCase());
    const idIdx = 0;
    const qIdx = header.findIndex((h) => h.startsWith("question"));
    const aIdx = header.findIndex((h) => h.startsWith("answer"));
    const activeIdx = header.findIndex((h) => h.startsWith("active"));

    const insertFaq = db.prepare(`
      INSERT OR REPLACE INTO faqs (id, question, answer, active)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = db.transaction((rows) => {
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const fields = rows[i];
        if (!fields || fields.length < 3) continue;
        const id = parseInt(String(fields[idIdx] ?? "").trim(), 10) || i;
        const question = String(fields[qIdx] ?? "").trim();
        const answer = String(fields[aIdx] ?? "").trim();
        const activeRaw = String(fields[activeIdx] ?? "1").trim();
        const active = activeRaw !== "0" && activeRaw.toLowerCase() !== "false" ? 1 : 0;
        if (!question) continue;
        insertFaq.run(id, question, answer, active);
        count++;
      }
      return count;
    });

    const faqCount = insertMany(rows2d);
    console.log(`[Migrate] ✅ Imported ${faqCount} FAQs into 'faqs' table.`);
  }
} else {
  console.warn(`[Migrate] ⚠️ FAQ CSV not found at: ${csvPath}`);
}

// ── 3. Import Markdown Chunks ─────────────────────────────────
const chunkDir = path.join(rootDir, "src", "Database", "chunk");
if (fs.existsSync(chunkDir)) {
  function getAllMdFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllMdFiles(fullPath));
      } else if (file.endsWith(".md")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const mdFiles = getAllMdFiles(chunkDir);
  console.log(`[Migrate] Found ${mdFiles.length} Markdown files in chunks directory.`);

  const insertChunk = db.prepare(`
    INSERT OR REPLACE INTO chunks (id, file_path, file_name, doc_id, department, category, date, source, content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertChunksTx = db.transaction((files) => {
    let total = 0;
    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const raw = fs.readFileSync(filePath, "utf-8");
      const sections = raw.split(/\n---+\n/);
      let chunkIdx = 0;

      for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        const metaMatch = trimmed.match(/##\s*Metadata\s*\n([\s\S]*?)(?=##\s*Nội dung|$)/i);
        const contentMatch = trimmed.match(/##\s*Nội dung\s*\n([\s\S]*?)$/i);
        if (!contentMatch) continue;

        const content = contentMatch[1].trim();
        if (!content || content.length < 20) continue;

        let doc_id = "";
        let department = "";
        let category = "";
        let date = "";
        let source = "";

        if (metaMatch) {
          const metaBlock = metaMatch[1];
          const extract = (key) => {
            const m = metaBlock.match(new RegExp(`\\*\\*${key}\\*\\*:\\s*(.+)`, "i"));
            return m ? m[1].trim() : "";
          };
          doc_id = extract("doc_id");
          department = extract("department");
          category = extract("category");
          date = extract("date");
          source = extract("source");
        }

        const id = `${fileName}::${chunkIdx++}`;
        const relPath = path.relative(rootDir, filePath).replace(/\\/g, "/");
        insertChunk.run(id, relPath, fileName, doc_id, department, category, date, source, content);
        total++;
      }
    }
    return total;
  });

  const totalChunks = insertChunksTx(mdFiles);
  console.log(`[Migrate] ✅ Imported ${totalChunks} chunks into 'chunks' table.`);
}

// ── 4. Seed Default Users ─────────────────────────────────────
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, name, email, password, avatar, mssv, faculty, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertUser.run(
  "1",
  "Sinh viên Demo",
  "admin@student.edu",
  "123456",
  null,
  "23020001",
  "Công nghệ Thông tin",
  "active",
  "2026-09-01T08:00:00.000Z"
);

insertUser.run(
  "2",
  "Admin Quản Trị",
  "admin@edu.vn",
  "admin123",
  null,
  "GV001",
  "Phòng Đào Tạo",
  "active",
  "2026-09-01T08:00:00.000Z"
);

console.log("[Migrate] ✅ Seeded users into 'users' table.");

// Summary counts
const faqCount = db.prepare("SELECT COUNT(*) as count FROM faqs").get().count;
const chunkCount = db.prepare("SELECT COUNT(*) as count FROM chunks").get().count;
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;

console.log(`\n========================================`);
console.log(`🎉 MIGRATION THÀNH CÔNG!`);
console.log(`- Database path: ${dbPath}`);
console.log(`- FAQs in database: ${faqCount}`);
console.log(`- Document Chunks in database: ${chunkCount}`);
console.log(`- Users in database: ${userCount}`);
console.log(`========================================\n`);

db.close();
