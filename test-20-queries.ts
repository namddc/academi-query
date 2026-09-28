import fs from "fs";

// Load .env if available
try {
  const env = fs.readFileSync(".env", "utf8");
  env.split("\n").forEach((line) => {
    const [key, ...vals] = line.split("=");
    if (key && vals.length) {
      let val = vals.join("=").trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key.trim()] = val;
    }
  });
} catch (e) {
  // Ignore
}

import { aiService } from "./src/services/aiService.server.ts";

const queries = [
  // --- MỨC ĐỘ DỄ (Cách hỏi phổ biến, gần giống từ khóa) ---
  "mình lỡ quên pass đăng nhập rồi thì phải làm sao?",
  "chỗ nào để đăng ký môn học vậy?",
  "xem điểm thi cuối kỳ ở trang web nào vậy?",
  "nửa đêm nhắn tin cho bot thì nó có rep không?",
  "hiện tại đại học ictu đang có tổng cộng bao nhiêu khoa?",

  // --- MỨC ĐỘ TRUNG BÌNH (Dùng từ đồng nghĩa, cấu trúc câu khác) ---
  "chưa có tiền nộp học phí thì trường có cho đăng ký môn không?",
  "bị kẹt lịch môn A với môn B lúc đăng ký thì giải quyết sao?",
  "muốn rút môn học đã đăng ký thì làm như thế nào?",
  "muốn chuyển sang lớp khác học cho tiện lịch thì có được phép không?",
  "rớt mất cái thẻ giữ xe trong bãi trường thì lấy xe kiểu gì?",
  "học bằng cử nhân thì tổng cộng phải tích lũy mấy tín chỉ?",
  "trường chấm điểm rèn luyện sinh viên theo tiêu chí gì?",
  
  // --- MỨC ĐỘ KHÓ (Hỏi tình huống, dùng ngôn ngữ tự nhiên, tiếng lóng) ---
  "nếu mình nộp dư tiền học kỳ này thì tiền đó có mất không?",
  "vắng mặt mấy bữa thì giảng viên không cho thi cuối kỳ?",
  "muốn tốt nghiệp ra trường thì cần đạt những tiêu chí nào?",
  "mới vào năm nhất mà muốn bảo lưu kết quả thì trường có chịu không?",
  "lên trường mà quên mang thẻ sinh viên thì có bị cấm vào lớp không?",

  // --- MỨC ĐỘ TÀI LIỆU (Cần tìm trong file Markdown L2) ---
  "môn lý luận chính trị có phải theo quy định biên soạn giáo trình của trường không?",
  "giáo trình với bài giảng có giống nhau không?",
  "nếu ông chủ biên không nộp giáo trình đúng hạn thì hiệu trưởng xử lý sao?",
];

async function run() {
  console.log("🚀 BẮT ĐẦU TEST 20 CÂU HỎI TỪ DỄ ĐẾN KHÓ\n");
  
  let successCount = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`\n--------------------------------------------------`);
    console.log(`❓ Câu ${i + 1}: "${q}"`);
    
    try {
      const res = await aiService.getEnhancedPrompt(q);
      
      if (res.hasKnowledge) {
        successCount++;
        if (res.layer === "L1_FAQ") {
          console.log(`✅ TÌM THẤY TRONG L1 FAQ (Độ tin cậy: ${res.knowledgeResults[0]?.confidence}%)`);
          console.log(`   📝 Khớp với câu: "${res.knowledgeResults[0]?.question}"`);
        } else if (res.layer === "L2_CHUNK") {
          console.log(`✅ TÌM THẤY TRONG L2 MARKDOWN`);
          console.log(`   📂 Danh mục: ${res.l2Results?.matchedCategory}`);
          console.log(`   📄 Nội dung tìm thấy: "${res.l2Results?.chunks[0]?.content.slice(0, 100)}..."`);
        }
      } else {
        console.log(`❌ KHÔNG TÌM THẤY THÔNG TIN (Fallback)`);
      }
    } catch (err) {
      console.log(`❌ LỖI TRONG QUÁ TRÌNH TÌM KIẾM:`, err);
    }
  }

  console.log(`\n==================================================`);
  console.log(`TỔNG KẾT: Tìm thấy thông tin ${successCount}/${queries.length} câu hỏi.`);
}

run();
