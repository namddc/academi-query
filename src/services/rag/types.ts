/**
 * Core type definitions for iBot Hybrid RAG Engine.
 * Supports both legacy and modern hierarchical metadata.
 */

export type DepartmentCode =
  | '01_Phong_Dao_Tao'
  | '02_Phong_Cong_Tac_Hoc_Sinh_Sinh_Vien'
  | '03_Phong_Khao_Thi_va_Dam_Bao_Chat_Luong_Giao_Duc'
  | '04_Phong_Quan_Ly_Co_So_Vat_Chat'
  | '05_Phong_Hanh_Chinh_To_Chuc'
  | '06_Khoa_Hoc_Cong_Nghe_va_Hop_Tac_Quoc_Te'
  | '07_Phong_Ke_Hoach_Tai_Chinh'
  | 'Other';

export interface ChunkMetadata {
  doc_id: string;
  doc_title?: string;
  department: string;
  department_name_vi?: string;
  category: string;
  date?: string;
  source: string;
  doc_type?: 'QuyChe' | 'QuyDinh' | 'HuongDan' | 'ThongBao' | 'QuyetDinh' | 'Khac';
  keywords?: string[];
  hierarchy?: {
    chapter?: string;
    article?: string;
    clause?: string;
  };
}

export interface ChunkItem {
  id: string;
  filePath: string;
  fileName: string;
  folder: string;
  metadata: ChunkMetadata;
  content: string;
  cleanContent: string;
  enrichedContent: string; // Context-enriched content for embeddings and search
  tokenCount: number;
  checksum: string;
}

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
  active: boolean;
  score?: number;
}

export interface RetrievalResult<T = ChunkItem> {
  item: T;
  score: number;
  matchType: 'sparse' | 'dense' | 'hybrid' | 'exact';
  highlights?: string[];
  rank?: number;
}

export interface QueryContext {
  rawQuery: string;
  normalizedQuery: string;
  standaloneQuery: string;
  intent: 'faq' | 'document' | 'hybrid' | 'fallback' | 'chitchat';
  detectedDepartments?: string[];
  detectedKeywords?: string[];
}

