import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdownFile, DEPARTMENT_NAME_MAP } from './markdownParser.server';
import { dbService, type DBChunk } from '@/lib/db.server';
import type { ChunkItem } from '../types';

export interface IngestionStats {
  scannedFiles: number;
  totalChunks: number;
  totalTokens: number;
  byDepartment: Record<string, { files: number; chunks: number; tokens: number }>;
  generatedTemplates: number;
}

/**
 * Standard department informational templates for empty folders
 */
const DEPARTMENT_TEMPLATES: Array<{
  folder: string;
  fileName: string;
  docId: string;
  title: string;
  category: string;
  content: string;
  source: string;
}> = [
  {
    folder: '03_Phong_Khao_Thi_va_Dam_Bao_Chat_Luong_Giao_Duc',
    fileName: 'Thong_tin_chuc_nang_Phong_Khao_thi_va_DBCLGD.md',
    docId: 'KT-DBCLGD/ICTU',
    title: 'Quy định chức năng và hỗ trợ sinh viên Phòng Khảo thí & Đảm bảo chất lượng giáo dục',
    category: 'exam_quality',
    source: 'Quy định công tác khảo thí',
    content: `Phòng Khảo thí và Đảm bảo chất lượng giáo dục có nhiệm vụ:
- Tổ chức các kỳ thi kết thúc học phần, thi lại, thi cải thiện cho sinh viên.
- Tiếp nhận và xử lý đơn xin hoãn thi, vắng thi có lý do chính đáng (ốm đau, tai nạn, lý do bất khả kháng). Sinh viên phải nộp đơn trong vòng 03 ngày làm việc kể từ ngày thi kèm minh chứng hợp lệ.
- Giải quyết thắc mắc về điểm thi, tiếp nhận đơn xin phúc khảo bài thi của sinh viên trong thời hạn 07 ngày làm việc kể từ ngày công bố điểm thi.
- Địa điểm liên hệ: Phòng Khảo thí và ĐBCLGD - Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU).`,
  },
  {
    folder: '04_Phong_Quan_Ly_Co_So_Vat_Chat',
    fileName: 'Thong_tin_ho_tro_co_so_vat_chat_va_phong_hoc.md',
    docId: 'CSVC/ICTU',
    title: 'Quy định mượn phòng học, quản lý cơ sở vật chất và ký túc xá',
    category: 'facilities',
    source: 'Quy chế quản lý cơ sở vật chất',
    content: `Phòng Quản lý Cơ sở vật chất phụ trách:
- Quản lý giảng đường, hệ thống phòng học lý thuyết, phòng thực hành máy tính và các trang thiết bị phục vụ dạy học.
- Tiếp nhận đăng ký mượn phòng học, hội trường phục vụ sinh hoạt câu lạc bộ, hội thảo sinh viên (phải có giấy giới thiệu của Đoàn Thanh niên hoặc Phòng CTHSSV).
- Quản lý, tiếp nhận đăng ký phòng ở Ký túc xá và duy trì điều kiện sinh hoạt trong khu nội trú của nhà trường.
- Địa điểm liên hệ: Phòng Quản lý Cơ sở vật chất - Tầng 1 Nhà Hành chính ICTU.`,
  },
  {
    folder: '05_Phong_Hanh_Chinh_To_Chuc',
    fileName: 'Thong_tin_chuc_nang_Phong_Hanh_chinh_To_chuc.md',
    docId: 'HCTC/ICTU',
    title: 'Quy định công tác hành chính, văn thư và tiếp nhận công văn',
    category: 'administration',
    source: 'Quy định hành chính tổ chức',
    content: `Phòng Hành chính - Tổ chức có nhiệm vụ:
- Tiếp nhận, xử lý và phát hành các văn bản hành chính, công văn đi/đến của nhà trường.
- Xác nhận các thủ tục hành chính chung, đóng dấu văn bản theo đúng thẩm quyền.
- Hướng dẫn khách và sinh viên liên hệ công tác tới các phòng ban chức năng trong trường.
- Địa điểm liên hệ: Bộ phận Văn thư - Phòng Hành chính Tổ chức, Tầng 1 Tòa nhà C1.`,
  },
  {
    folder: '07_Phong_Ke_Hoach_Tai_Chinh',
    fileName: 'Thong_tin_thu_hoc_phi_va_tai_chinh_sinh_vien.md',
    docId: 'KHTC/ICTU',
    title: 'Quy định về thu nộp học phí và chế độ chính sách tài chính sinh viên',
    category: 'finance',
    source: 'Quy định thu nộp học phí',
    content: `Phòng Kế hoạch - Tài chính phụ trách:
- Thu học phí, lệ phí thi, lệ phí ký túc xá và các khoản thu dịch vụ đào tạo theo quy định.
- Hướng dẫn quy trình nộp học phí qua cổng thanh toán trực tuyến hoặc tài khoản ngân hàng chính thức của Trường ĐH CNTT&TT.
- Phối hợp với Phòng CTHSSV thực hiện chi trả trợ cấp xã hội, miễn giảm học phí và học bổng khuyến khích học tập cho sinh viên.
- Xử lý các trường hợp sinh viên nộp thừa học phí, bảo lưu kết quả hoặc thôi học để giải quyết hoàn trả kinh phí theo quy chế.
- Địa điểm liên hệ: Phòng Kế hoạch - Tài chính, Tầng 1 Tòa nhà Trung tâm ICTU.`,
  },
];

/**
 * Ensures template markdown files are present in empty department directories
 */
export function ensureDepartmentTemplates(baseDir: string): number {
  let createdCount = 0;
  try {
    for (const tpl of DEPARTMENT_TEMPLATES) {
      const folderPath = path.join(baseDir, tpl.folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const filePath = path.join(folderPath, tpl.fileName);
      if (!fs.existsSync(filePath)) {
        const templateContent = `---
doc_id: ${tpl.docId}
doc_title: ${tpl.title}
department: ${tpl.folder}
category: ${tpl.category}
source_ref: ${tpl.source}
keywords: [chức năng, thủ tục, liên hệ, giải quyết]
---

## Nội dung
${tpl.content}
`;
        fs.writeFileSync(filePath, templateContent, 'utf-8');
        createdCount++;
      }
    }
  } catch (err) {
    console.warn("[Ingestion] Read-only filesystem, skipping template generation:", err);
  }
  return createdCount;
}

/**
 * Scans all chunks from disk, parses metadata and syncs into SQLite DB
 */
export async function runIngestionPipeline(baseDir = 'src/Database/chunk'): Promise<{
  stats: IngestionStats;
  chunks: ChunkItem[];
}> {
  const resolvedBase = path.resolve(process.cwd(), baseDir);
  if (!fs.existsSync(resolvedBase)) {
    throw new Error(`Chunks base directory does not exist: ${resolvedBase}`);
  }

  // 1. Ensure empty department folders have reference templates
  const generatedTemplates = ensureDepartmentTemplates(resolvedBase);

  // 2. Discover all .md files
  const allFiles: string[] = [];
  function scan(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scan(full);
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        allFiles.push(full);
      }
    }
  }
  scan(resolvedBase);

  const stats: IngestionStats = {
    scannedFiles: allFiles.length,
    totalChunks: 0,
    totalTokens: 0,
    byDepartment: {},
    generatedTemplates,
  };

  const parsedChunks: ChunkItem[] = [];

  for (const file of allFiles) {
    try {
      const chunks = parseMarkdownFile(file);
      for (const ch of chunks) {
        parsedChunks.push(ch);
        stats.totalChunks++;
        stats.totalTokens += ch.tokenCount;

        const dept = ch.folder;
        if (!stats.byDepartment[dept]) {
          stats.byDepartment[dept] = { files: 0, chunks: 0, tokens: 0 };
        }
        stats.byDepartment[dept].chunks++;
        stats.byDepartment[dept].tokens += ch.tokenCount;
      }

      const fileFolder = path.basename(path.dirname(file));
      if (stats.byDepartment[fileFolder]) {
        stats.byDepartment[fileFolder].files++;
      }
    } catch (err) {
      console.warn(`[Ingestion] Failed to parse ${file}:`, err);
    }
  }

  // 3. Batch sync to SQLite database
  const dbPayload: Array<Omit<DBChunk, 'created_at'>> = parsedChunks.map((c) => ({
    id: c.id,
    file_path: c.filePath,
    file_name: c.fileName,
    doc_id: c.metadata.doc_id || '',
    department: c.folder,
    category: c.metadata.category || '',
    date: c.metadata.date || '',
    source: c.metadata.source || '',
    content: c.cleanContent,
    token_count: c.tokenCount,
    checksum: c.checksum,
    enriched_content: c.enrichedContent,
    doc_title: c.metadata.doc_title || c.fileName,
  }));

  dbService.upsertChunks(dbPayload);

  return { stats, chunks: parsedChunks };
}

