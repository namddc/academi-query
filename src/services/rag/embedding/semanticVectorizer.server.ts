import type { EmbeddingProvider } from './types';

export const VECTOR_DIMENSION = 256;

// Key ICTU semantic concept clusters for dense representation
const ICTU_CLUSTERS: Array<{ name: string; dimStart: number; dimEnd: number; terms: string[] }> = [
  {
    name: 'hoc_vu',
    dimStart: 0,
    dimEnd: 31,
    terms: [
      'tín chỉ', 'học phần', 'đăng ký', 'học cải thiện', 'học lại', 'điểm f', 'rút bớt',
      'cảnh báo học vụ', 'buộc thôi học', 'bảo lưu', 'chương trình đào tạo', 'tiên quyết',
      'song song', 'chuyển ngành', 'học kỳ phụ', 'thời gian đào tạo', 'kéo dài'
    ],
  },
  {
    name: 'tai_chinh',
    dimStart: 32,
    dimEnd: 63,
    terms: [
      'học phí', 'thu học phí', 'miễn giảm', 'trợ cấp xã hội', 'học bổng khuyến khích',
      'nộp học phí', 'hóa đơn', 'hoàn trả', 'lệ phí', 'chính sách', 'hộ nghèo', 'dân tộc'
    ],
  },
  {
    name: 'khao_thi',
    dimStart: 64,
    dimEnd: 95,
    terms: [
      'hoãn thi', 'vắng thi', 'phúc khảo', 'lịch thi', 'điểm thi', 'coi thi', 'kỳ thi',
      'đề thi', 'chấm thi', 'bảng điểm', 'chất lượng giáo dục', 'khảo thí'
    ],
  },
  {
    name: 'tot_nghiep',
    dimStart: 96,
    dimEnd: 127,
    terms: [
      'tốt nghiệp', 'bằng tốt nghiệp', 'chuẩn đầu ra', 'ngoại ngữ', 'tiếng anh', 'b1',
      'tin học', 'đồ án', 'khóa luận', 'xét tốt nghiệp', 'phôi bằng', 'chứng chỉ'
    ],
  },
  {
    name: 'sinh_vien',
    dimStart: 128,
    dimEnd: 159,
    terms: [
      'điểm rèn luyện', 'kỷ luật', 'khen thưởng', 'ký túc xá', 'nội trú', 'ngoại trú',
      'thẻ sinh viên', 'bảo hiểm y tế', 'cố vấn học tập', 'ban cán sự', 'hoạt động ngoại khóa'
    ],
  },
  {
    name: 'co_so_hanh_chinh',
    dimStart: 160,
    dimEnd: 191,
    terms: [
      'mượn phòng', 'giảng đường', 'phòng học', 'cơ sở vật chất', 'thiết bị', 'hành chính',
      'văn thư', 'giấy tờ', 'xác nhận', 'đóng dấu', 'nghiên cứu khoa học', 'hợp tác'
    ],
  },
];

/**
 * Normalizes Vietnamese text for semantic embedding
 */
export function normalizeSemanticText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[,\.!?:;()\[\]{}"'\-_\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 32-bit FNV-1a hash function
 */
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Ultra-fast dense vectorizer optimized for Vietnamese educational domain
 */
export class SemanticVectorizer implements EmbeddingProvider {
  name = 'ictu-semantic-dense-256';
  dimension = VECTOR_DIMENSION;

  /**
   * Generates a normalized 256-dimensional vector for input text
   */
  async embedQuery(text: string): Promise<number[]> {
    return this.vectorize(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vectorize(t));
  }

  /**
   * Core synchronous vectorization
   */
  public vectorize(text: string): number[] {
    const vec = new Float32Array(VECTOR_DIMENSION);
    const normalized = normalizeSemanticText(text);
    if (!normalized) return Array.from(vec);

    const words = normalized.split(' ').filter(Boolean);

    // 1. Concept Cluster Projection (dimensions 0..191)
    for (const cluster of ICTU_CLUSTERS) {
      const clusterLen = cluster.dimEnd - cluster.dimStart + 1;
      for (const term of cluster.terms) {
        if (normalized.includes(term)) {
          const hash = fnv1a(term);
          const targetDim = cluster.dimStart + (hash % clusterLen);
          // Boost matching conceptual keywords heavily
          vec[targetDim] += 3.5;
        }
      }
    }

    // 2. Word unigram & bigram projection (dimensions 192..255)
    const generalStart = 192;
    const generalLen = VECTOR_DIMENSION - generalStart;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.length >= 2) {
        const hash = fnv1a(word);
        const dim = generalStart + (hash % generalLen);
        const sign = (hash & 1) === 0 ? 1 : -1;
        vec[dim] += sign * 1.0;
      }

      // Word bigrams
      if (i < words.length - 1) {
        const bigram = `${word} ${words[i + 1]}`;
        const hash = fnv1a(bigram);
        const dim = generalStart + (hash % generalLen);
        const sign = (hash & 1) === 0 ? 1 : -1;
        vec[dim] += sign * 1.5;
      }
    }

    // 3. Subword 3-character n-grams for typo resilience
    for (let i = 0; i <= normalized.length - 3; i++) {
      const trigram = normalized.slice(i, i + 3);
      if (!trigram.includes(' ')) {
        const hash = fnv1a(trigram);
        const dim = generalStart + (hash % generalLen);
        vec[dim] += ((hash & 1) === 0 ? 0.3 : -0.3);
      }
    }

    // 4. L2 Normalization (||v|| = 1.0)
    let sumSq = 0;
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
      sumSq += vec[i] * vec[i];
    }

    if (sumSq > 0) {
      const norm = Math.sqrt(sumSq);
      for (let i = 0; i < VECTOR_DIMENSION; i++) {
        vec[i] /= norm;
      }
    }

    return Array.from(vec);
  }
}

/**
 * Fast Cosine Similarity between two L2-normalized vectors (dot product)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, Math.min(1, dot));
}

export const defaultVectorizer = new SemanticVectorizer();

