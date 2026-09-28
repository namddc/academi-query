// ============================================================
//  test-expsolution.mjs
//  Kiểm tra API key mới: https://ai.expsolution.io/v1
//  Chạy: node test-expsolution.mjs
// ============================================================

// Đọc từ env nếu có, fallback về hardcode để test trực tiếp
const API_KEY =
  process.env.EXPSOLUTION_API_KEY ?? "sk-fRu0xDIQ1TPiTILskwv3tQ";
const BASE_URL =
  process.env.EXPSOLUTION_BASE_URL ?? "https://ai.expsolution.io/v1";
const MODEL = "gemmatranslate-27b";

const SYSTEM_PROMPT = `Bạn là iBot – trợ lý sinh viên của Trường Đại học Công nghệ Thông tin và Truyền thông. Trả lời ngắn gọn bằng tiếng Việt.`;

// Các câu hỏi test lấy từ tài liệu hệ thống
const TEST_QUESTIONS = [
  "Xin chào iBot",
  "iBot là gì?",
  "Học phí kỳ này là bao nhiêu?",
  "Làm sao để đăng ký ký túc xá?",
  "Tôi cần liên hệ phòng Đào tạo ở đâu?",
];

async function testQuestion(question, index) {
  const start = Date.now();
  console.log(`\n[${index + 1}/${TEST_QUESTIONS.length}] Câu hỏi: "${question}"`);

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
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
        temperature: 0.7,
        max_tokens: 300,
        stream: false,
      }),
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      console.log(`  ❌ HTTP ${res.status} (${elapsed}ms): ${errText.slice(0, 300)}`);
      return { ok: false, status: res.status };
    }

    const data = await res.json();
    const answer =
      data.choices?.[0]?.message?.content ?? "(không có nội dung)";
    const tokens = data.usage?.completion_tokens ?? "?";
    const totalTokens = data.usage?.total_tokens ?? "?";

    console.log(`  ✅ ${elapsed}ms | completion: ${tokens} tokens | total: ${totalTokens}`);
    console.log(
      `  📝 ${answer.slice(0, 200)}${answer.length > 200 ? "..." : ""}`,
    );
    return { ok: true, elapsed, tokens };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`  ❌ Network error (${elapsed}ms): ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function testConnectivity() {
  console.log("── Kiểm tra kết nối endpoint ──");
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (res.ok) {
      const data = await res.json();
      const models = data.data?.map((m) => m.id) ?? [];
      console.log(`  ✅ Endpoint OK — ${models.length} model(s) available`);
      if (models.length > 0) console.log(`  📋 Models: ${models.join(", ")}`);
    } else {
      const text = await res.text();
      console.log(`  ⚠️  GET /models → HTTP ${res.status}: ${text.slice(0, 150)}`);
    }
  } catch (err) {
    console.log(`  ❌ Không thể kết nối: ${err.message}`);
  }
}

async function main() {
  console.log("=== TEST ExpSolution AI Gateway ===");
  console.log(`Endpoint: ${BASE_URL}`);
  console.log(`Model: ${MODEL}`);
  console.log(`API Key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}\n`);

  await testConnectivity();

  const results = [];
  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const result = await testQuestion(TEST_QUESTIONS[i], i);
    results.push(result);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log("\n=== KẾT QUẢ ===");
  console.log(`✅ Thành công: ${passed}/${results.length}`);
  if (failed > 0) console.log(`❌ Thất bại: ${failed}/${results.length}`);

  if (passed === results.length) {
    console.log("\n🎉 API key hoạt động ổn định. Sẵn sàng tích hợp!");
  } else {
    console.log(
      "\n⚠️  Một số câu hỏi thất bại — kiểm tra lỗi ở trên để debug.",
    );
    process.exit(1);
  }
}

main();
