import { readFileSync, writeFileSync } from "fs";
const env = readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const match = line.match(/^([^#\s=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1');
}

import { generateText } from "ai";
import { nvidiaModel } from "./src/lib/ai-provider.server.ts";
import { aiService } from "./src/services/aiService.server.ts";

const questions = [
  // L1 / Thông tin chung
  "Trường có thư viện không?",
  "Em muốn đăng ký ở ký túc xá thì làm thế nào?",
  "Khi nào có lịch nghỉ Tết?",
  "Mật khẩu wifi của trường là gì?", // bẫy
  "Sinh viên năm nhất có được đem xe máy vào trường không?",
  
  // L2 / Quy chế, thông tư, nội quy
  "Thời gian đóng cửa ký túc xá vào buổi tối là mấy giờ?",
  "Nếu làm mất thẻ sinh viên lần 2 thì có bị kỷ luật không?",
  "Nộp giấy xác nhận hộ nghèo ở phòng nào để được miễn giảm học phí?",
  "Sinh viên bị cảnh cáo học vụ có được tiếp tục ở ký túc xá không?",
  "Tham gia nghiên cứu khoa học đạt giải thì được cộng bao nhiêu điểm rèn luyện?",
  "Bằng tốt nghiệp bị rách nát có được cấp lại bản chính không?",
  "Có được phép nhượng lại phòng ký túc xá cho người khác không?",
  "Điều kiện để sinh viên được cấp thẻ sinh viên miễn phí lần đầu là gì?",
  "Việc nộp học phí trễ hạn có dẫn đến việc bị cấm thi không?",
  "Ai là người có thẩm quyền ra quyết định kỷ luật buộc thôi học đối với sinh viên?",
  "Nếu sinh viên có khiếu nại về điểm rèn luyện thì phải nộp đơn trong thời hạn bao nhiêu ngày?",
  "Việc thành lập và hoạt động của các câu lạc bộ sinh viên do đơn vị nào quản lý?",
  "Sinh viên đóng học phí qua tài khoản ngân hàng nào?",
  "Có quy định nào cấm sinh viên mặc quần đùi lên giảng đường không?",
  "Sinh viên nước ngoài học tại trường có bắt buộc mua bảo hiểm y tế không?"
];

async function runEval() {
  console.log("🚀 Bắt đầu chạy test 20 câu hỏi...");
  let report = "# 🤖 Báo Cáo Đánh Giá Độ Chính Xác Của AI\n\n";
  let correct = 0;
  let hallu = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`Đang chạy câu ${i + 1}/${questions.length}: ${q}`);
    
    report += `## Câu ${i + 1}: ${q}\n`;
    
    try {
      // 1. Get Enhanced Prompt
      const enhanced = await aiService.getEnhancedPrompt(q);
      report += `**Layer xử lý:** \`${enhanced.layer}\`\n`;
      if (enhanced.hasKnowledge && enhanced.layer === "L2_CHUNK" && enhanced.l2Results) {
        report += `**Nguồn tài liệu:** ${enhanced.l2Results.chunks.map(c => c.fileName).join(", ")}\n`;
      }
      
      // 2. Generate response
      const { text } = await generateText({
        model: nvidiaModel,
        system: enhanced.systemPrompt,
        messages: [{ role: "user", content: q }],
        temperature: 0.1,
        topP: 0.5,
      });
      
      report += `**Bot trả lời:**\n> ${text.replace(/\n/g, "\n> ")}\n\n---\n\n`;
    } catch (e: any) {
      report += `**Lỗi:** ${e.message}\n\n---\n\n`;
    }
  }

  writeFileSync("C:\\Users\\G1\\.gemini\\antigravity-ide\\brain\\f5c30fd3-a23d-4fcf-ac9b-29f7a63a2abb\\eval_report.md", report, "utf8");
  console.log("✅ Hoàn thành! Đã xuất file eval_report.md");
}

runEval().catch(console.error);
