/**
 * Academic Text Normalizer for iBot Text-to-Speech (TTS)
 * Chuẩn hóa văn bản học vụ, loại bỏ icon/emoji gây nhiễu, dịch số văn bản pháp quy,
 * từ viết tắt, số tiền, ngày tháng sang ngữ âm tiếng Việt tự nhiên và êm tai.
 */

// 1. BẢNG TỪ ĐIỂN TỪ VIẾT TẮT HỌC ĐƯỜNG & HÀNH CHÍNH
export const ACADEMIC_DICTIONARY: Record<string, string> = {
  // Tên Trường & Đại học
  "ĐHCNTT&TT": "Đại học Công nghệ Thông tin và Truyền thông",
  "ĐHCNTT-TT": "Đại học Công nghệ Thông tin và Truyền thông",
  "ICTU": "I C T U",
  "ĐHTN": "Đại học Thái Nguyên",
  "ĐHQG": "Đại học Quốc gia",
  "ĐHBK": "Đại học Bách khoa",
  "ĐHSP": "Đại học Sư phạm",
  "ĐHKT": "Đại học Kinh tế",
  "ĐHYD": "Đại học Y Dược",
  "ĐH": "đại học",
  "CĐ": "cao đẳng",

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

  // Văn bản & Pháp quy
  "QĐ": "quyết định",
  "NĐ": "nghị định",
  "NQ": "nghị quyết",
  "TB": "thông báo",
  "KH": "kế hoạch",
  "HD": "hướng dẫn",
  "CT": "chỉ thị",
  "TTg": "Thủ tướng",
  "CP": "Chính phủ",

  // Phòng ban & Đơn vị
  "P.CTSV": "phòng công tác sinh viên",
  "PCTSV": "phòng công tác sinh viên",
  "CTSV": "công tác sinh viên",
  "P.CTHSSV": "phòng công tác học sinh sinh viên",
  "PCTHSSV": "phòng công tác học sinh sinh viên",
  "CTHSSV": "công tác học sinh sinh viên",
  "P.ĐT": "phòng đào tạo",
  "PĐT": "phòng đào tạo",
  "P.KHTC": "phòng kế hoạch tài chính",
  "KHTC": "kế hoạch tài chính",
  "P.QLCL": "phòng quản lý chất lượng",
  "QLCL": "quản lý chất lượng",
  "P.HC": "phòng hành chính",
  "BGH": "ban giám hiệu",
  "ĐTN": "đoàn thanh niên",
  "HSV": "hội sinh viên",
  "UBND": "ủy ban nhân dân",
  "HĐND": "hội đồng nhân dân",
  "GD&ĐT": "giáo dục và đào tạo",
  "BGD&ĐT": "bộ giáo dục và đào tạo",
  "BGDĐT": "bộ giáo dục và đào tạo",

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
 * 2. LỌC BỎ TOÀN BỘ EMOJI VÀ ICON GÂY NHIỄU
 * Trình duyệt thường đọc tên mã emoji (ví dụ "chồng sách", "đinh ghim", "bóng đèn").
 * Hàm này loại bỏ 100% emoji và biểu tượng đồ họa.
 */
export function stripEmojisAndIcons(text: string): string {
  return text
    // Các dải Unicode Emoji & Pictographs chính
    .replace(/[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{FE0F}\u{200D}]/gu, "")
    // Các biểu tượng cụ thể hay dùng trong chatbot
    .replace(/[📚📌💡⭐🎯⚖️🏛️📋🔍🚀👨‍🎓👩‍🎓🗓️⏰💰🎓⚠️✅❌🔔📞🌐🙏😊👍👎🔄]/gu, "")
    .replace(/[•●▪️▫️▶️◀️ℹ️]/g, "");
}

/**
 * 3. CHUẨN HÓA VĂN BẢN PHÁP QUY & TRÍCH DẪN ĐIỀU KHOẢN
 * Ví dụ: 429/QĐ-ĐHCNTT&TT — Điều 8, Khoản 3
 * -> Quyết định số 429 của Trường Đại học Công nghệ Thông tin và Truyền thông, Điều 8, Khoản 3
 */
export function normalizeLegalCitations(text: string): string {
  // Chuẩn hóa tiêu đề Nguồn: và Gợi ý câu hỏi:
  text = text.replace(/(?:^|\n)\s*(?:\*\*)?Nguồn(?:\s*:\s*|\s*:\s*:\s*|\s*)/gi, "\nNguồn trích dẫn: ");
  text = text.replace(/(?:^|\n)\s*(?:\*\*)?Bạn có thể hỏi thêm(?:\s*:\s*|\s*)/gi, "\nGợi ý câu hỏi thêm:\n");

  // Xóa các chuỗi dấu hai chấm liên tiếp ": :" hoặc ":  :"
  text = text.replace(/:\s*:/g, ":");

  // 1. Quyết định của trường ĐHCNTT&TT / ICTU
  // Ví dụ: 429/QĐ-ĐHCNTT&TT hoặc 429/QĐ-ICTU hoặc Số 429/QĐ-ĐHCNTT&TT
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/QĐ-(?:ĐHCNTT&TT|ĐHCNTT-TT|ICTU)\b/gi,
    "Quyết định số $1 của Trường Đại học Công nghệ Thông tin và Truyền thông",
  );

  // 2. Quyết định của Đại học Thái Nguyên
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/QĐ-(?:ĐHTN)\b/gi,
    "Quyết định số $1 của Đại học Thái Nguyên",
  );

  // 3. Nghị định Chính phủ: 123/NĐ-CP
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/NĐ-CP\b/gi,
    "Nghị định số $1 của Chính phủ",
  );

  // 4. Thông tư Bộ GD&ĐT: 08/2021/TT-BGDĐT
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)(?:\/(\d{4}))?\/TT-(?:BGDĐT|BGD&ĐT)\b/gi,
    (_m, num, year) => year ? `Thông tư số ${num} năm ${year} của Bộ Giáo dục và Đào tạo` : `Thông tư số ${num} của Bộ Giáo dục và Đào tạo`,
  );

  // 5. Thông báo của trường: 12/TB-ĐHCNTT&TT
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/TB-(?:ĐHCNTT&TT|ĐHCNTT-TT|ICTU)\b/gi,
    "Thông báo số $1 của Trường Đại học Công nghệ Thông tin và Truyền thông",
  );

  // 6. Các quyết định tổng quát khác: (\d+)/QĐ-XYZ
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/QĐ-([A-ZÀ-Ỹ0-9&_-]+)\b/gi,
    "Quyết định số $1",
  );

  // 7. Xử lý dấu gạch nối dài (em-dash, en-dash) trong trích dẫn
  // Ví dụ: "Trường Đại học Công nghệ Thông tin và Truyền thông — Điều 8, Khoản 3"
  text = text.replace(/\s*[—–]\s*(?=Điều|Khoản|Điểm|Mục|Chương)/gi, ", ");

  // 8. Chuẩn hóa "Điều X, Khoản Y, Điểm Z"
  text = text.replace(/\bĐiều\s+(\d+)\s*,\s*Khoản\s+(\d+)\b/gi, "Điều $1, Khoản $2");
  text = text.replace(/\bKhoản\s+(\d+)\s*,\s*Điểm\s+([a-zđA-ZĐ])\b/gi, "Khoản $1, Điểm $2");

  return text;
}

/**
 * 4. CHUYỂN ĐỔI TIỀN TỆ HỌC PHÍ SANG TIẾNG VIỆT TỰ NHIÊN
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
 * 5. CHUẨN HÓA NGÀY THÁNG VÀ GIỜ HỌC VỤ
 * 28/02/2025 -> ngày 28 tháng 2 năm 2025
 * 17h30 -> 17 giờ 30 phút
 */
export function normalizeDateTime(text: string): string {
  // Ngày/Tháng/Năm
  text = text.replace(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
    "ngày $1 tháng $2 năm $3",
  );
  // Ngày/Tháng (tránh nhầm với số văn bản như 429/QĐ đã được normalize trước đó)
  text = text.replace(
    /(?<=\s|^)(\d{1,2})\/(\d{1,2})(?=\s|[.,;:!?]|$)/g,
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
 * 6. CHUẨN HÓA THANG ĐIỂM
 * 4.0/4.0 -> 4 chấm không trên 4 chấm không
 * 8.5/10 -> 8 phẩy 5 trên 10
 */
export function normalizeGrading(text: string): string {
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
 * 7. TẠO ĐỘ NGHỈ TỰ NHIÊN CHO DANH SÁCH ĐẦU DÒNG
 * 1. -> Thứ nhất,
 * 2. -> Thứ hai,
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
 * 8. THAY THẾ TỪ VIẾT TẮT HỌC VỤ
 */
export function normalizeAbbreviations(text: string): string {
  // Sắp xếp các từ theo độ dài giảm dần để ưu tiên từ dài trước (VD: ĐHCNTT&TT trước CNTT)
  const sortedKeys = Object.keys(ACADEMIC_DICTIONARY).sort(
    (a, b) => b.length - a.length,
  );

  for (const abbr of sortedKeys) {
    const full = ACADEMIC_DICTIONARY[abbr];
    // Thoát ký tự đặc biệt
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    // Khớp từ độc lập, không dính liền với từ khác
    const regex = new RegExp(`(?<=^|[\\s.,;:!?()""''—–-])${escaped}(?=$|[\\s.,;:!?()""''—–-])`, "g");
    text = text.replace(regex, full);
  }

  return text;
}

/**
 * 9. LÀM SẠCH CÁC THẺ MARKDOWN VÀ KÝ TỰ KỸ THUẬT
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
    // Bảng biểu markdown: thay ký tự | bằng dấu phẩy
    .replace(/\|/g, ", ")
    .replace(/[-:]{3,}/g, "")
    // Bỏ các ký tự định dạng markdown #, *, _, ~, >, =
    .replace(/[#*_~>=]/g, "")
    // Bỏ thẻ HTML
    .replace(/<[^>]*>/g, "")
    // Chuyển dòng mới thành dấu chấm tạo khoảng nghỉ
    .replace(/\r\n|\r|\n/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .trim();
}

/**
 * HÀM CHÍNH TOÀN DIỆN: Chuẩn hóa toàn bộ văn bản cho Text-To-Speech
 */
export function normalizeForSpeech(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  let result = rawText;

  // Bước 1: Xóa sạch toàn bộ emoji và biểu tượng đồ họa
  result = stripEmojisAndIcons(result);

  // Bước 2: Chuẩn hóa số văn bản pháp quy, số quyết định, thông tư trước
  result = normalizeLegalCitations(result);

  // Bước 3: Làm sạch định dạng markdown và code
  result = cleanMarkdownForSpeech(result);

  // Bước 4: Chuẩn hóa danh sách đầu dòng để có nhịp nghỉ tự nhiên
  result = normalizeListBullets(result);

  // Bước 5: Chuẩn hóa tiền tệ học phí
  result = normalizeCurrency(result);

  // Bước 6: Chuẩn hóa ngày tháng và giờ
  result = normalizeDateTime(result);

  // Bước 7: Chuẩn hóa thang điểm
  result = normalizeGrading(result);

  // Bước 8: Thay thế các từ viết tắt học vụ
  result = normalizeAbbreviations(result);

  // Bước 9: Dọn dẹp dấu câu liền nhau và khoảng trắng
  result = result
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.,;:!?])\1+/g, "$1")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
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

  const rawSentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];

  let currentChunk = "";
  const MAX_CHUNK_LENGTH = 160;

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + " " + trimmed).trim().length <= MAX_CHUNK_LENGTH) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
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
