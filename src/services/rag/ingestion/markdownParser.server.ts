import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ChunkItem, ChunkMetadata, DepartmentCode } from '../types';

/**
 * Mapping between internal folder names and standard Vietnamese department names
 */
export const DEPARTMENT_NAME_MAP: Record<string, { code: DepartmentCode; nameVi: string }> = {
  '01_Phong_Dao_Tao': { code: '01_Phong_Dao_Tao', nameVi: 'Phòng Đào tạo' },
  '02_Phong_Cong_Tac_Hoc_Sinh_Sinh_Vien': { code: '02_Phong_Cong_Tac_Hoc_Sinh_Sinh_Vien', nameVi: 'Phòng Công tác Học sinh Sinh viên' },
  '03_Phong_Khao_Thi_va_Dam_Bao_Chat_Luong_Giao_Duc': { code: '03_Phong_Khao_Thi_va_Dam_Bao_Chat_Luong_Giao_Duc', nameVi: 'Phòng Khảo thí và Đảm bảo chất lượng giáo dục' },
  '04_Phong_Quan_Ly_Co_So_Vat_Chat': { code: '04_Phong_Quan_Ly_Co_So_Vat_Chat', nameVi: 'Phòng Quản lý Cơ sở vật chất' },
  '05_Phong_Hanh_Chinh_To_Chuc': { code: '05_Phong_Hanh_Chinh_To_Chuc', nameVi: 'Phòng Hành chính - Tổ chức' },
  '06_Khoa_Hoc_Cong_Nghe_va_Hop_Tac_Quoc_Te': { code: '06_Khoa_Hoc_Cong_Nghe_va_Hop_Tac_Quoc_Te', nameVi: 'Phòng Khoa học Công nghệ và Hợp tác Quốc tế' },
  '07_Phong_Ke_Hoach_Tai_Chinh': { code: '07_Phong_Ke_Hoach_Tai_Chinh', nameVi: 'Phòng Kế hoạch - Tài chính' },
};

/**
 * Calculates SHA-256 checksum for string content
 */
export function calculateChecksum(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Estimates token count for Vietnamese / multilingual text.
 * Rule of thumb: ~1 token per word (split by whitespace/punctuation) or ~3.5 chars for Vietnamese.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  return Math.max(words, Math.ceil(chars / 3.8));
}

/**
 * Cleans markdown formatting, removes excess whitespace and normalizes quotes.
 */
export function cleanMarkdownContent(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parses a single Markdown file containing either:
 * 1. YAML frontmatter: --- \n meta \n --- \n content
 * 2. Legacy format: ## Metadata ... ## Nội dung ... separated by ---
 */
export function parseMarkdownFile(filePath: string): ChunkItem[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const folderName = path.basename(path.dirname(filePath));
  const deptInfo = DEPARTMENT_NAME_MAP[folderName] || { code: 'Other', nameVi: folderName };

  const sections = raw.split(/\n---+\n/);
  const chunks: ChunkItem[] = [];

  for (let index = 0; index < sections.length; index++) {
    const section = sections[index].trim();
    if (!section) continue;

    let metadata: ChunkMetadata = {
      doc_id: '',
      department: folderName,
      department_name_vi: deptInfo.nameVi,
      category: '',
      date: '',
      source: '',
      doc_title: fileName.replace(/\.md$/i, ''),
      keywords: [],
    };
    let content = '';

    // Check for YAML Frontmatter (Format 1: Modern)
    if (section.startsWith('---')) {
      const parts = section.slice(3).split(/\n---+\n/);
      if (parts.length >= 2) {
        const yamlBlock = parts[0];
        content = parts.slice(1).join('\n---\n').trim();
        metadata = parseYamlMetadata(yamlBlock, metadata);
      }
    }

    // Check for Legacy Format (Format 2: ## Metadata ... ## Nội dung ...)
    if (!content) {
      const metaMatch = section.match(/##\s*Metadata\s*\n([\s\S]*?)(?=##\s*Nội dung|$)/i);
      const contentMatch = section.match(/##\s*Nội dung\s*\n([\s\S]*?)$/i);

      if (contentMatch) {
        content = contentMatch[1].trim();
      } else {
        // Fallback: If no explicit headers, treat the entire section as content
        content = section;
      }

      if (metaMatch) {
        const metaBlock = metaMatch[1];
        const extract = (key: string): string => {
          const m = metaBlock.match(new RegExp(`\\*\\*${key}\\*\\*:\\s*(.+)`, 'i'));
          return m ? m[1].trim() : '';
        };

        metadata.doc_id = extract('doc_id') || metadata.doc_id;
        const rawDept = extract('department');
        if (rawDept) {
          metadata.department = rawDept;
        }
        metadata.category = extract('category');
        metadata.date = extract('date');
        metadata.source = extract('source');
      }
    }

    if (!content || content.length < 15) continue;

    const cleanContent = cleanMarkdownContent(content);
    const checksum = calculateChecksum(cleanContent);
    const tokenCount = estimateTokenCount(cleanContent);

    // Build context-enriched content for dense vector search and sparse matching
    // Injects document title, source, department so the chunk preserves semantic context
    const enrichedHeader = [
      `[Tài liệu: ${metadata.doc_title || fileName}]`,
      metadata.doc_id ? `[Số hiệu: ${metadata.doc_id}]` : '',
      `[Đơn vị: ${metadata.department_name_vi || metadata.department}]`,
      metadata.source ? `[Trích đoạn: ${metadata.source}]` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const enrichedContent = `${enrichedHeader}\n\n${cleanContent}`;
    const chunkId = `${fileName}::chunk_${index + 1}`;

    chunks.push({
      id: chunkId,
      filePath,
      fileName,
      folder: folderName,
      metadata,
      content,
      cleanContent,
      enrichedContent,
      tokenCount,
      checksum,
    });
  }

  return chunks;
}

/**
 * Basic YAML-like parser for frontmatter key-values
 */
function parseYamlMetadata(yamlBlock: string, base: ChunkMetadata): ChunkMetadata {
  const result = { ...base };
  const lines = yamlBlock.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');

    switch (key) {
      case 'doc_id':
        result.doc_id = val;
        break;
      case 'doc_title':
      case 'title':
        result.doc_title = val;
        break;
      case 'department':
        result.department = val;
        break;
      case 'department_name_vi':
        result.department_name_vi = val;
        break;
      case 'category':
        result.category = val;
        break;
      case 'date':
      case 'effective_date':
        result.date = val;
        break;
      case 'source':
      case 'source_ref':
        result.source = val;
        break;
      case 'keywords':
        if (val.startsWith('[') && val.endsWith(']')) {
          result.keywords = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        }
        break;
    }
  }

  return result;
}

