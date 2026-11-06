import Database from 'better-sqlite3';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'src/Database/database.sqlite');
const db = new Database(dbPath);

const chunks = db
  .prepare(
    'SELECT id, file_path, file_name, doc_id, department, category, date, source, content, token_count, checksum, enriched_content, doc_title FROM chunks'
  )
  .all();

const faqs = db.prepare('SELECT id, question, answer, active FROM faqs').all();

console.log(`Exporting ${chunks.length} chunks and ${faqs.length} FAQs...`);

const jsonStr = JSON.stringify({ chunks, faqs });
const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8')).toString('base64');

const outputTs = `// Auto-generated seed data for Vercel Serverless environment
import zlib from "node:zlib";

const GZIPPED_DATA = "${compressed}";

export interface SeedPayload {
  chunks: Array<{
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
  }>;
  faqs: Array<{
    id: number;
    question: string;
    answer: string;
    active: number;
  }>;
}

let cachedSeed: SeedPayload | null = null;

export function getSeedData(): SeedPayload {
  if (!cachedSeed) {
    const buf = Buffer.from(GZIPPED_DATA, "base64");
    const json = zlib.gunzipSync(buf).toString("utf-8");
    cachedSeed = JSON.parse(json);
  }
  return cachedSeed!;
}
`;

fs.writeFileSync(path.resolve(process.cwd(), 'src/Database/seedData.server.ts'), outputTs);
console.log('Successfully written src/Database/seedData.server.ts!');
