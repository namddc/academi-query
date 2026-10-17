/**
 * Academic Text Normalizer for iBot Text-to-Speech (TTS)
 * Chuẩn hóa văn bản học vụ, loại bỏ icon/emoji gây nhiễu, dịch số văn bản pháp quy,
 * chuẩn hóa tiêu đề/đáp án (A, Bê, Cê, Dê), tạo khoảng ngắt nhịp khi xuống dòng
 * và khi có dấu chấm, phẩy.
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
 */
export function stripEmojisAndIcons(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{FE0F}\u{200D}]/gu, "")
    .replace(/[📚📌💡⭐🎯⚖️🏛️📋🔍🚀👨‍🎓👩‍🎓🗓️⏰💰🎓⚠️✅❌🔔📞🌐🙏😊👍👎🔄]/gu, "")
    .replace(/[•●▪️▫️▶️◀️ℹ️]/g, "");
}

/**
 * 3. CHUẨN HÓA CÁC ĐÁP ÁN & TIÊU ĐỀ: ĐỌC A, BÊ, CÊ, DÊ, ĐÊ THAY VÌ A, BỜ, CỜ
 * Xử lý: A., B., C., D. hoặc A), B), C), D) hoặc "Đáp án A", "Điểm a"
 */
export function normalizeAnswerOptionsAndHeaders(text: string): string {
  const letterMap: Record<string, string> = {
    "A": "A",
    "a": "A",
    "B": "Bê",
    "b": "Bê",
    "C": "Cê",
    "c": "Cê",
    "D": "Dê",
    "d": "Dê",
    "Đ": "Đê",
    "đ": "Đê",
    "E": "E",
    "e": "E",
    "F": "Ép",
    "f": "Ép",
    "G": "Gờ",
    "g": "Gờ",
    "H": "Hát",
    "h": "Hát",
  };

  // 1. Tiêu đề mục / đáp án đầu dòng: "\nA." hoặc "\nB)" hoặc bắt đầu văn bản "A."
  text = text.replace(/(?:^|\n)\s*([A-HĐa-hđ])\s*([.)\u2013\u2014:-])\s+/g, (_match, letter) => {
    const sound = letterMap[letter] || letter;
    return `\n${sound}, `;
  });

  // 2. Gạch đầu dòng kèm chữ cái: "- A.", "* B.", "- c)"
  text = text.replace(/(?:^|\n)\s*[-*•]\s*([A-HĐa-hđ])\s*([.)\u2013\u2014:-])\s+/g, (_match, letter) => {
    const sound = letterMap[letter] || letter;
    return `\n${sound}, `;
  });

  // 3. Khớp cụm từ "Đáp án A", "Phương án B", "Lựa chọn C", "Mục D"
  text = text.replace(/\b(Đáp án|Phương án|Lựa chọn|Câu hỏi|Mục|Phần)\s+([A-HĐa-hđ])\b/gi, (_match, prefix, letter) => {
    const sound = letterMap[letter] || letter;
    return `${prefix} ${sound}`;
  });

  // 4. Khớp cụm từ quy định văn bản: "Điểm a", "Điểm b", "Điểm c", "Điểm d", "Điểm đ"
  text = text.replace(/\bĐiểm\s+([A-HĐa-hđ])\b/gi, (_match, letter) => {
    const sound = letterMap[letter] || letter;
    return `Điểm ${sound}`;
  });

  return text;
}

/**
 * 4. CHUẨN HÓA VĂN BẢN PHÁP QUY & TRÍCH DẪN ĐIỀU KHOẢN
 */
export function normalizeLegalCitations(text: string): string {
  text = text.replace(/(?:^|\n)\s*(?:\*\*)?Nguồn(?:\s*:\s*|\s*:\s*:\s*|\s*)/gi, "\nNguồn trích dẫn: ");
  text = text.replace(/(?:^|\n)\s*(?:\*\*)?Bạn có thể hỏi thêm(?:\s*:\s*|\s*)/gi, "\nGợi ý câu hỏi thêm:\n");
  text = text.replace(/:\s*:/g, ":");

  // Quyết định trường ĐHCNTT&TT / ICTU
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/QĐ-(?:ĐHCNTT&TT|ĐHCNTT-TT|ICTU)\b/gi,
    "Quyết định số $1 của Trường Đại học Công nghệ Thông tin và Truyền thông",
  );

  // Quyết định Đại học Thái Nguyên
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/QĐ-(?:ĐHTN)\b/gi,
    "Quyết định số $1 của Đại học Thái Nguyên",
  );

  // Nghị định Chính phủ
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/NĐ-CP\b/gi,
    "Nghị định số $1 của Chính phủ",
  );

  // Thông tư Bộ GD&ĐT
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)(?:\/(\d{4}))?\/TT-(?:BGDĐT|BGD&ĐT)\b/gi,
    (_m, num, year) => year ? `Thông tư số ${num} năm ${year} của Bộ Giáo dục và Đào tạo` : `Thông tư số ${num} của Bộ Giáo dục và Đào tạo`,
  );

  // Thông báo của trường
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/TB-(?:ĐHCNTT&TT|ĐHCNTT-TT|ICTU)\b/gi,
    "Thông báo số $1 của Trường Đại học Công nghệ Thông tin và Truyền thông",
  );

  // Quyết định tổng quát
  text = text.replace(
    /(?:Số\s*:?\s*)?(\d+)\/QĐ-([A-ZÀ-Ỹ0-9&_-]+)\b/gi,
    "Quyết định số $1",
  );

  // Dấu gạch nối dài trong trích dẫn
  text = text.replace(/\s*[—–]\s*(?=Điều|Khoản|Điểm|Mục|Chương)/gi, ", ");

  // Điều X, Khoản Y
  text = text.replace(/\bĐiều\s+(\d+)\s*,\s*Khoản\s+(\d+)\b/gi, "Điều $1, Khoản $2");
  text = text.replace(/\bKhoản\s+(\d+)\s*,\s*Điểm\s+([a-zđA-ZĐ])\b/gi, "Khoản $1, Điểm $2");

  return text;
}

/**
 * 5. CHUYỂN ĐỔI TIỀN TỆ HỌC PHÍ
 */
export function normalizeCurrency(text: string): string {
  text = text.replace(
    /(\d+)\.([1-9]\d{2})\.000\s*(VNĐ|VND|vnđ|vnd|đ|đồng)\b/gi,
    "$1 triệu $2 nghìn đồng",
  );
  text = text.replace(
    /(\d+)\.000\.000\s*(VNĐ|VND|vnđ|vnd|đ|đồng)\b/gi,
    "$1 triệu đồng",
  );
  text = text.replace(
    /(\d+)\.000\s*(VNĐ|VND|vnđ|vnd|đ|đồng)\b/gi,
    "$1 nghìn đồng",
  );
  text = text.replace(
    /(\d+)\.([1-9]\d{2})\s*(VNĐ|VND|vnđ|vnd|đ|đồng)\b/gi,
    "$1 nghìn $2 đồng",
  );
  text = text.replace(/(\d+)\s*(VNĐ|VND|vnđ|vnd)\b/gi, "$1 đồng");

  return text;
}

/**
 * 6. CHUẨN HÓA NGÀY THÁNG VÀ GIỜ
 */
export function normalizeDateTime(text: string): string {
  text = text.replace(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
    "ngày $1 tháng $2 năm $3",
  );
  text = text.replace(
    /(?<=\s|^)(\d{1,2})\/(\d{1,2})(?=\s|[.,;:!?]|$)/g,
    "ngày $1 tháng $2",
  );
  text = text.replace(
    /\b(\d{1,2})h(\d{2})\b/gi,
    "$1 giờ $2 phút",
  );
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
 * 7. CHUẨN HÓA THANG ĐIỂM
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
 * 8. TẠO ĐỘ NGHỈ TỰ NHIÊN CHO DANH SÁCH ĐẦU DÒNG SỐ: 1., 2., 3.
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

  text = text.replace(/(?:^|\n)\s*(\d{1,2})\.\s+/g, (_match, num) => {
    return `\n${ordinalMap[num] || `Mục ${num},`} `;
  });

  text = text.replace(/(?:^|\n)\s*[-*•]\s+/g, "\nÝ tiếp theo: ");

  return text;
}

/**
 * 9. THAY THẾ TỪ VIẾT TẮT HỌC VỤ
 */
export function normalizeAbbreviations(text: string): string {
  const sortedKeys = Object.keys(ACADEMIC_DICTIONARY).sort(
    (a, b) => b.length - a.length,
  );

  for (const abbr of sortedKeys) {
    const full = ACADEMIC_DICTIONARY[abbr];
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<=^|[\\s.,;:!?()""''—–-])${escaped}(?=$|[\\s.,;:!?()""''—–-])`, "g");
    text = text.replace(regex, full);
  }

  return text;
}

/**
 * 10. LÀM SẠCH MARKDOWN VÀ BẢO TOÀN DÒNG XUỐNG DÒNG
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
    // Chuẩn hóa dấu xuống dòng thành \n đơn giản, bảo toàn xuống dòng
    .replace(/\r\n|\r/g, "\n")
    .trim();
}

/**
 * 11. ĐẢM BẢO DẤU CHẤM VÀ PHẨY CÓ KHOẢNG NGHỈ ĐÚNG TIẾNG VIỆT
 */
export function polishPunctuationPacing(text: string): string {
  // Đảm bảo sau dấu phẩy luôn có khoảng trắng để tạo nhịp ngắt (VD: "khoản,điểm" -> "khoản, điểm")
  text = text.replace(/,(?=[^\s\d])/g, ", ");
  
  // Đảm bảo sau dấu hai chấm có khoảng trắng
  text = text.replace(/:(?=[^\s\d])/g, ": ");
  
  // Đảm bảo sau dấu chấm câu có khoảng trắng hoặc xuống dòng
  text = text.replace(/\.(?=[A-ZÀ-Ỹa-zà-ỹ0-9])/g, ". ");

  // Dọn dẹp dấu câu trùng lặp: ",," -> ",", ".." -> "."
  text = text.replace(/,\s*,/g, ", ");
  text = text.replace(/\.\s*\./g, ".");
  text = text.replace(/,\s*\./g, ".");
  text = text.replace(/\.\s*,/g, ".");

  // Dọn dẹp khoảng trắng dư thừa trên mỗi dòng
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return text;
}

/**
 * HÀM CHÍNH TOÀN DIỆN: Chuẩn hóa toàn bộ văn bản cho Text-To-Speech
 */
export function normalizeForSpeech(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  let result = rawText;

  // Bước 1: Xóa sạch toàn bộ emoji và biểu tượng đồ họa
  result = stripEmojisAndIcons(result);

  // Bước 2: Chuẩn hóa số văn bản pháp quy trước
  result = normalizeLegalCitations(result);

  // Bước 3: Làm sạch định dạng markdown và code (giữ nguyên cấu trúc dòng \n)
  result = cleanMarkdownForSpeech(result);

  // Bước 4: Chuẩn hóa tiêu đề & đáp án: A, Bê, Cê, Dê, Đê thay vì A Bờ Cờ
  result = normalizeAnswerOptionsAndHeaders(result);

  // Bước 5: Chuẩn hóa danh sách đầu dòng số: 1., 2., 3. -> Thứ nhất,, Thứ hai,
  result = normalizeListBullets(result);

  // Bước 6: Chuẩn hóa tiền tệ học phí
  result = normalizeCurrency(result);

  // Bước 7: Chuẩn hóa ngày tháng và giờ
  result = normalizeDateTime(result);

  // Bước 8: Chuẩn hóa thang điểm
  result = normalizeGrading(result);

  // Bước 9: Thay thế các từ viết tắt học vụ
  result = normalizeAbbreviations(result);

  // Bước 10: Tối ưu khoảng ngắt dấu chấm, dấu phẩy
  result = polishPunctuationPacing(result);

  return result;
}

/**
 * Chia nhỏ văn bản thành các câu riêng biệt (Sentence Chunking)
 * Tách độc lập theo từng dòng (xuống dòng) và từng câu có dấu chấm, hỏi, than
 * để giọng đọc ngắt quãng rõ ràng từng dòng một.
 */
export function splitIntoSpeechSentences(text: string): string[] {
  if (!text) return [];

  // Tách văn bản theo các dòng xuống dòng (\n)
  const lines = text.split(/\n+/);
  const chunks: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Trong mỗi dòng, tách tiếp theo dấu chấm câu: . ! ?
    const sentences = trimmedLine.split(/(?<=[.!?])\s+/);

    for (const sent of sentences) {
      let s = sent.trim();
      if (!s) continue;

      // Đảm bảo cuối câu có dấu chấm hoặc dấu phẩy để trình duyệt ngắt hơi chuẩn
      if (!/[.,;:!?]$/.test(s)) {
        s += ".";
      }

      chunks.push(s);
    }
  }

  return chunks;
}
