// Test script: 5 câu L1 FAQ với nvidia/nemotron-3-super-120b-a12b
// Chạy: node test-l1.mjs

const API_KEY = "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";
const BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "meta/llama-3.2-90b-vision-instruct";

const TEST_QUESTIONS = [
  "Xin chào iBot",
  "iBot là gì?",
  "Học phí kỳ này là bao nhiêu?",
  "Làm sao để đăng ký ký túc xá?",
  "Tôi cần liên hệ phòng Đào tạo ở đâu?",
];

const SYSTEM_PROMPT = `Bạn là iBot – trợ lý sinh viên của Trường Đại học Công nghệ Thông tin và Truyền thông. Trả lời ngắn gọn bằng tiếng Việt.`;

async function testQuestion(question, index) {
  const start = Date.now();
  console.log(`\n[${index + 1}/5] Câu hỏi: "${question}"`);

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
        temperature: 0.5,
        top_p: 1,
        max_tokens: 200,
        stream: false,
      }),
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      console.log(`  ❌ Lỗi HTTP ${res.status}: ${errText}`);
      return;
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content ?? "(không có nội dung)";
    const tokens = data.usage?.completion_tokens ?? "?";

    console.log(`  ✅ ${elapsed}ms | ${tokens} tokens`);
    console.log(`  📝 ${answer.slice(0, 150)}${answer.length > 150 ? "..." : ""}`);
  } catch (err) {
    console.log(`  ❌ Lỗi: ${err.message}`);
  }
}

async function main() {
  console.log("=== TEST L1 FAQ — nvidia/nemotron-3-super-120b-a12b ===");
  console.log(`API: ${BASE_URL}`);
  console.log(`Model: ${MODEL}\n`);

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    await testQuestion(TEST_QUESTIONS[i], i);
  }

  console.log("\n=== XONG ===");
}

main();
