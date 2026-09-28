import { readFileSync } from "fs";
const env = readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const match = line.match(/^([^#\s=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1');
}

import { chunkService } from "./src/services/chunkService.server.ts";
import { aiService } from "./src/services/aiService.server.ts";

const queries = [
  "Điều kiện xét học bổng khuyến khích học tập",
  "Hồ sơ xét học bổng gồm những gì",
  "Điều kiện dự tuyển thạc sĩ",
  "Học phí học thạc sĩ",
  "Thời gian đào tạo tiến sĩ là bao lâu",
  "Điều kiện tốt nghiệp đại học",
  "Quy định về việc đăng ký học phần",
  "Quy định đánh giá điểm rèn luyện",
  "Các mức kỷ luật sinh viên",
  "Quy trình xin bảo lưu kết quả học tập",
  "Sinh viên nội trú ký túc xá cần tuân thủ gì",
  "Quy tắc ứng xử trên mạng xã hội của sinh viên",
  "Điều kiện miễn giảm học phí",
  "Trợ cấp xã hội cho sinh viên",
  "Quy định về việc làm khóa luận tốt nghiệp"
];

async function runTests() {
  console.log("=== BẮT ĐẦU TEST L2 (15 CÂU HỎI) ===");
  
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`\n--- Câu ${i + 1}: "${q}" ---`);
    
    // Test L2 trực tiếp
    const l2Result = await chunkService.searchL2(q);
    
    console.log(`[L2 Direct] Tìm thấy: ${l2Result.chunks.length} chunks`);
    if (l2Result.chunks.length > 0) {
      console.log(`   + Category: ${l2Result.matchedCategory}`);
      console.log(`   + Keywords: [${l2Result.keywords.join(", ")}]`);
      l2Result.chunks.forEach((c, idx) => {
        console.log(`     - Chunk ${idx+1}: ${c.metadata.source} (${c.fileName})`);
      });
    }

    // Test qua aiService (để xem có bị L1 chặn không)
    const enhanced = await aiService.getEnhancedPrompt(q);
    console.log(`[AIService] Layer trả về: ${enhanced.layer}`);
    if (enhanced.layer === "L1_FAQ") {
      console.log(`   ⚠️ LƯU Ý: Câu này bị L1 (Google Sheets) bắt, nên L2 KHÔNG ĐƯỢC CHẠY trong luồng chat!`);
    }
  }
}

runTests().catch(console.error);
