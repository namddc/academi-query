import type { QueryContext } from './types';
import { normalizeText } from './retrievers/sparseRetriever.server';

const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  '01_Phong_Dao_Tao': [
    'đào tạo', 'tín chỉ', 'học phần', 'đăng ký môn', 'rút môn', 'hủy môn',
    'chương trình đào tạo', 'giáo trình', 'học cải thiện', 'học lại', 'điểm f',
    'thạc sĩ', 'tiến sĩ', 'sau đại học', 'chuẩn đầu ra', 'ngoại ngữ', 'tin học'
  ],
  '02_Phong_Cong_Tac_Hoc_Sinh_Sinh_Vien': [
    'học bổng', 'miễn giảm học phí', 'trợ cấp', 'điểm rèn luyện', 'kỷ luật',
    'thẻ sinh viên', 'chính sách', 'hộ nghèo', 'nội trú', 'ngoại trú', 'cố vấn học tập',
    'hoạt động ngoại khóa', 'việc làm', 'khởi nghiệp'
  ],
  '03_Phong_Khao_Thi_va_Dam_Bao_Chat_Luong_Giao_Duc': [
    'hoãn thi', 'vắng thi', 'phúc khảo', 'lịch thi', 'phòng thi', 'chấm thi',
    'điểm thi', 'bảng điểm', 'chất lượng', 'khảo thí'
  ],
  '04_Phong_Quan_Ly_Co_So_Vat_Chat': [
    'ký túc xá', 'phòng ở', 'mượn phòng', 'giảng đường', 'hội trường', 'thiết bị', 'điều hòa', 'máy chiếu'
  ],
  '05_Phong_Hanh_Chinh_To_Chuc': [
    'hành chính', 'văn thư', 'công văn', 'giấy giới thiệu', 'đóng dấu', 'xác nhận'
  ],
  '06_Khoa_Hoc_Cong_Nghe_va_Hop_Tac_Quoc_Te': [
    'nghiên cứu khoa học', 'sinh viên nước ngoài', 'hợp tác quốc tế', 'trao đổi sinh viên'
  ],
  '07_Phong_Ke_Hoach_Tai_Chinh': [
    'nộp học phí', 'học phí bao nhiêu', 'hóa đơn', 'hoàn tiền', 'kế hoạch tài chính'
  ],
};

const CHITCHAT_PATTERNS = [
  /^xin chào/i,
  /^chào bạn/i,
  /^hello/i,
  /^hi bot/i,
  /^bạn là ai/i,
  /^mày là ai/i,
  /^tên bạn là gì/i,
  /^tạm biệt/i,
  /^cảm ơn/i,
  /^thanks/i,
];

const OUT_OF_SCOPE_PATTERNS = [
  /quán ăn/i,
  /quán cà phê/i,
  /quán net/i,
  /trà sữa/i,
  /thời tiết/i,
  /mua bán/i,
  /xem bói/i,
  /chơi game/i,
];

/**
 * Fast Rule-based Query Router with Semantic Intent Detection
 */
export function routeQuery(rawQuery: string): QueryContext {
  const normalized = normalizeText(rawQuery);

  // 1. Check for Chitchat
  for (const pat of CHITCHAT_PATTERNS) {
    if (pat.test(rawQuery.trim())) {
      return {
        rawQuery,
        normalizedQuery: normalized,
        standaloneQuery: rawQuery,
        intent: 'chitchat',
      };
    }
  }

  // 2. Check for Out-of-scope / Fallback
  for (const pat of OUT_OF_SCOPE_PATTERNS) {
    if (pat.test(normalized)) {
      return {
        rawQuery,
        normalizedQuery: normalized,
        standaloneQuery: rawQuery,
        intent: 'fallback',
      };
    }
  }

  // 3. Detect Department affinities
  const detectedDepts: string[] = [];
  for (const [dept, kws] of Object.entries(DEPARTMENT_KEYWORDS)) {
    if (kws.some((kw) => normalized.includes(kw))) {
      detectedDepts.push(dept);
    }
  }

  // 4. Determine Intent: FAQ vs Document vs Hybrid
  let intent: QueryContext['intent'] = 'hybrid';

  const isShortQuestion = rawQuery.trim().split(/\s+/).length <= 7;
  const hasSpecificKeyword = normalized.includes('điều') || normalized.includes('quy chế') || normalized.includes('quy định') || normalized.includes('quyết định') || normalized.includes('thông tư');

  if (hasSpecificKeyword) {
    intent = 'document';
  } else if (isShortQuestion && !normalized.includes('như thế nào') && !normalized.includes('quy trình')) {
    intent = 'faq';
  } else {
    intent = 'hybrid';
  }

  return {
    rawQuery,
    normalizedQuery: normalized,
    standaloneQuery: rawQuery,
    intent,
    detectedDepartments: detectedDepts.length > 0 ? detectedDepts : undefined,
  };
}
