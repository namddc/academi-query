/**
 * Academic Text Normalizer for iBot Text-to-Speech (TTS)
 * Chuẩn hóa văn bản học vụ, dịch từ viết tắt, số tiền, ngày tháng sang ngữ âm tiếng Việt tự nhiên.
 */

// 1. BẢNG TỪ ĐIỂN TỪ VIẾT TẮT HỌC ĐƯỜNG & HÀNH CHÍNH
export const ACADEMIC_DICTIONARY: Record<string, string> = {
  // Sinh viên & Đào tạo
  "SV": "sinh viên",
  "MSSV": "mã số sinh viên",
  "HSSV": "học sinh sinh viên",
  "GV": "giảng viên",
  "GVCN": "giảng viên chủ nhiệm",
  "HP": "học phần",
  "TC": "tín chỉ",
  "ĐTB": "điểm trung bình",
  "ĐTBCHT": "điểm trung bình chung học tập",
  "ĐTBTL": "điểm trung bình tích lũy",
  "ĐRL": "điểm rèn luyện",
  "NCKH": "nghiên cứu khoa học",
  "NVQS": "nghĩa vụ quân sự",
  "BHYT": "bảo hiểm y tế",
  "BHXH": "bảo hiểm xã hội",
  "CCCD": "căn cước công dân",
  "CMND": "chứng minh nhân dân",
  "KTX": "ký túc xá",
  "KLTN": "khóa luận tốt nghiệp",
  "ĐATN": "đồ án tốt nghiệp",
  "TLTN": "tiểu luận tốt nghiệp",
  "TTTN": "thực tập tốt nghiệp",

  // Phòng ban & Đơn vị
  "P.CTSV": "phòng công tác sinh viên",
  "PCTSV": "phòng công tác sinh viên",
  "CTSV": "công tác sinh viên",
  "P.ĐT": "phòng đào tạo",
  "PĐT": "phòng đào tạo",
  "P.KHTC": "phòng kế hoạch tài chính",
  "KHTC": "kế hoạch tài chính",
  "P.QLCL": "phòng quản lý chất lượng",
  "QLCL": "quản lý chất lượng",
  "ĐH": "đại học",
  "CĐ": "cao đẳng",
  "BGH": "ban giám hiệu",
  "ĐTN": "đoàn thanh niên",
  "HSV": "hội sinh viên",
  "UBND": "ủy ban nhân dân",
  "GD&ĐT": "giáo dục và đào tạo",
  "BGD&ĐT": "bộ giáo dục và đào tạo",

  // Chuyên ngành
  "CNTT": "công nghệ thông tin",
  "KTPM": "kỹ thuật phần mềm",
  "HTTT": "hệ thống thông tin",
  "KHMT": "khoa học máy tính",
  "ATTT": "an toàn thông tin",
  "DTVT": "điện tử viễn thông",
  "QTKD": "quản trị kinh doanh",
  "TMĐT": "thương mại điện tử",
  "NNA": "ngôn ngữ Anh",

  // Kỳ học & Thang điểm
  "HK1": "học kỳ một",
  "HK2": "học kỳ hai",
  "HK3": "học kỳ ba",
  "HKI": "học kỳ một",
  "HKII": "học kỳ hai",
  "HKIII": "học kỳ ba",
  "GPA": "điểm trung bình tích lũy",

  // Chứng chỉ & Tin học ngoại ngữ
  "TOEIC": "Tô ích",
  "IELTS": "Ai eo",
  "VSTEP": "Vê xờ tép",
  "TOEFL": "Tô phô",
  "MOS": "Mót",
  "IC3": "Ai xi ba",
  "PDF": "bản pê đê ép",
  "DOCX": "tệp văn bản Uốt",
  "XLSX": "tệp Ếch xen",
  "PPTX": "tệp bài giảng Pao o pôi",

  // Thuật ngữ thường gặp trong quy chế
  "KBVP": "kỷ luật bãi nhiệm",
  "XLHT": "xử lý học tập",
  "CĐR": "chuẩn đầu ra",
  "TKB": "thời khóa biểu",
  "KĐCL": "kiểm định chất lượng",
};

/**
 * Chuyển số tiền dạng chuỗi sang đọc tiếng Việt tự nhiên
 * Ví dụ: 50.000 VNĐ -> 50 nghìn đồng
 * 1.500.000 VNĐ -> 1 triệu 500 nghìn đồng
 */
export function normalizeCurrency(text: string): string {
  // 1. Triệu + Nghìn: 1.500.000 đ
  text = text.replace(
    /(\d+)\.([1-9]\d{2})\.000\s*(VNĐ|VND|vnđ|vnd|đ|đồng)\b/gi,
    "$1 triệu $2 nghìn đồng",
  );
  // 2. Chẵn triệu: 5.000.000 đ
  text = text.replace(
    /(\d+)\.000\.000\s*(VNĐ|VND|vnđ|vnd|đ|đồng)\b/gi,
    "$1 triệu đồng",
  );
  // 3. Chẵn trăm nghìn hoặc chục nghìn: 50.000 đ -> 50 nghìn đồng
  text = text.replace(
    /(\d+)\.000\s*(VNĐ|VND|vnđ|vnd|đ|đồng)\b/gi,
    "$1 nghìn đồng",
  );
  // 4. Các mức lẻ nghìn: 15.500 đ -> 15 nghìn 500 đồng
  text = text.replace(
    /(\d+)\.([1-9]\d{2})\s*(VNĐ|VND|vnđ|vnd|đ|đồng)\b/gi,
    "$1 nghìn $2 đồng",
  );
  // 5. VNĐ đơn lẻ đứng sau số: 500 VNĐ -> 500 đồng
  text = text.replace(/(\d+)\s*(VNĐ|VND|vnđ|vnd)\b/gi, "$1 đồng");

  return text;
}

/**
 * Chuẩn hóa định dạng Ngày tháng và Giờ học vụ
 * 28/02/2025 -> ngày 28 tháng 2 năm 2025
 * 17h30 -> 17 giờ 30 phút
 */
export function normalizeDateTime(text: string): string {
  // Ngày/Tháng/Năm
  text = text.replace(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
    "ngày $1 tháng $2 năm $3",
  );
  // Ngày/Tháng
  text = text.replace(
    /\b(\d{1,2})\/(\d{1,2})\b/g,
    "ngày $1 tháng $2",
  );
  // Giờ có phút: 17h30 -> 17 giờ 30 phút
  text = text.replace(
    /\b(\d{1,2})h(\d{2})\b/gi,
    "$1 giờ $2 phút",
  );
  // Giờ chẵn: 17h hoặc 17h00 -> 17 giờ
  text = text.replace(
    /\b(\d{1,2})h00\b/gi,
    "$1 giờ",
  );
  text = text.replace(
    /\b(\d{1,2})h\b/gi,
    "$1 giờ",
  );

  return text;
}

/**
 * Chuẩn hóa thang điểm và phân số
 * 4.0/4.0 -> 4 chấm không trên 4 chấm không
 * 8.5/10 -> 8 phẩy 5 trên 10
 */
export function normalizeGrading(text: string): string {
  // Điểm trên thang: 3.5/4.0 hoặc 8.5/10
  text = text.replace(
    /(\d+)[.,](\d+)\/(\d+(?:[.,]\d+)?)/g,
    "$1 phẩy $2 trên $3",
  );
  text = text.replace(
    /\b(\d+)\/(\d+)\b(?=\s*(?:điểm|tín chỉ|môn))/gi,
    "$1 trên $2",
  );
  return text;
}

/**
 * Chuyển các ký hiệu danh sách đánh số hoặc gạch đầu dòng thành từ chuyển tiếp êm tai
 * 1. -> Thứ nhất,
 * 2. -> Thứ hai,
 * 3. -> Thứ ba,
 */
export function normalizeListBullets(text: string): string {
  const ordinalMap: Record<string, string> = {
    "1": "Thứ nhất,",
    "2": "Thứ hai,",
    "3": "Thứ ba,",
    "4": "Thứ tư,",
    "5": "Thứ năm,",
    "6": "Thứ sáu,",
    "7": "Thứ bảy,",
    "8": "Thứ tám,",
    "9": "Thứ chín,",
    "10": "Thứ mười,",
  };

  // Thay số thứ tự đầu câu: 1. 2. 3.
  text = text.replace(/(?:^|\n)\s*(\d{1,2})\.\s+/g, (_match, num) => {
    return `\n${ordinalMap[num] || `Mục ${num},`} `;
  });

  // Gạch đầu dòng: - hoặc *
  text = text.replace(/(?:^|\n)\s*[-*•]\s+/g, "\nÝ tiếp theo: ");

  return text;
}

/**
 * Thay thế từ điển viết tắt học vụ
 * Chú ý: dùng word boundary \b và bảo vệ trường hợp chữ hoa
 */
export function normalizeAbbreviations(text: string): string {
  // Sắp xếp các từ theo độ dài giảm dần để ưu tiên từ dài trước (VD: ĐTBCHT trước ĐTB)
  const sortedKeys = Object.keys(ACADEMIC_DICTIONARY).sort(
    (a, b) => b.length - a.length,
  );

  for (const abbr of sortedKeys) {
    const full = ACADEMIC_DICTIONARY[abbr];
    // Thoát các ký tự đặc biệt trong từ viết tắt như dấu chấm (P.CTSV, P.ĐT) hoặc dấu & (GD&ĐT)
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    // Nếu từ có dấu chấm hoặc ký tự đặc biệt, không dùng \b ở đầu/cuối một cách tùy tiện
    const regex = new RegExp(`(?<=^|\\s|[.,;:!?()])${escaped}(?=$|\\s|[.,;:!?()])`, "g");
    text = text.replace(regex, full);
  }

  return text;
}

/**
 * Làm sạch văn bản Markdown, thẻ HTML, bảng biểu và ký tự kỹ thuật
 */
export function cleanMarkdownForSpeech(text: string): string {
  return text
    // Bỏ code block
    .replace(/```[\s\S]*?```/g, " đoạn mã lập trình ")
    // Bỏ inline code
    .replace(/`([^`]+)`/g, "$1")
    // Bỏ markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Bỏ markdown images ![alt](url) -> ""
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // Xử lý bảng biểu markdown: thay ký tự | bằng dấu phẩy để tạo ngắt nhịp
    .replace(/\|/g, ", ")
    .replace(/[-:]{3,}/g, "") // Bỏ đường kẻ ngang bảng
    // Bỏ các ký tự định dạng markdown #, *, _, ~, >, =
    .replace(/[#*_~>=]/g, "")
    // Bỏ thẻ HTML
    .replace(/<[^>]*>/g, "")
    // Thay đổi nhiều dấu cách/xuống dòng thành 1 dấu cách
    .replace(/\r\n|\r|\n/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .trim();
}

/**
 * HÀM CHÍNH: Chuẩn hóa toàn diện văn bản trước khi đưa vào Text-To-Speech
 */
export function normalizeForSpeech(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  let result = rawText;

  // Bước 1: Làm sạch markdown và ký tự cấu trúc
  result = cleanMarkdownForSpeech(result);

  // Bước 2: Chuẩn hóa danh sách đầu dòng để có nhịp nghỉ tự nhiên
  result = normalizeListBullets(result);

  // Bước 3: Chuẩn hóa tiền tệ học phí
  result = normalizeCurrency(result);

  // Bước 4: Chuẩn hóa ngày tháng và giờ
  result = normalizeDateTime(result);

  // Bước 5: Chuẩn hóa thang điểm
  result = normalizeGrading(result);

  // Bước 6: Thay thế từ viết tắt học vụ
  result = normalizeAbbreviations(result);

  // Bước 7: Dọn dẹp khoảng trắng dư thừa và dấu câu liền nhau
  result = result
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.,;:!?])\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return result;
}

/**
 * Chia nhỏ văn bản thành các câu riêng biệt (Sentence Chunking)
 * Giải quyết triệt để lỗi Web Speech API tự ngắt sau 15 giây trên Google Chrome
 */
export function splitIntoSpeechSentences(text: string): string[] {
  if (!text) return [];

  // Tách theo dấu kết thúc câu: . ! ? hoặc dấu chấm lửng
  const rawSentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];

  let currentChunk = "";
  const MAX_CHUNK_LENGTH = 160; // Số ký tự tối ưu cho 1 utterance (khoảng 10-15 từ)

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + " " + trimmed).trim().length <= MAX_CHUNK_LENGTH) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // Nếu bản thân câu đó quá dài (>160 ký tự), tiếp tục tách theo dấu phẩy hoặc chấm phẩy
      if (trimmed.length > MAX_CHUNK_LENGTH) {
        const subParts = trimmed.split(/(?<=[,;])\s+/);
        let subChunk = "";
        for (const part of subParts) {
          if ((subChunk + " " + part).trim().length <= MAX_CHUNK_LENGTH) {
            subChunk = subChunk ? `${subChunk} ${part}` : part;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = part;
          }
        }
        if (subChunk) chunks.push(subChunk);
        currentChunk = "";
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
