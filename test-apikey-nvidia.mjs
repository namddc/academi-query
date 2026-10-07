const API_KEY = "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";
const MODEL = "meta/llama-3.2-90b-vision-instruct";
const URL = "https://integrate.api.nvidia.com/v1/chat/completions";

async function testApiKey() {
  console.log("Đang kiểm tra API Key NVIDIA...");
  
  const payload = {
    model: MODEL,
    messages: [
      {
        role: "user",
        content: "Trả lời tôi bằng tiếng Việt: Khóa API này còn hoạt động không? Trả lời thật ngắn gọn."
      }
    ],
    temperature: 0.7,
    max_tokens: 100
  };

  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.log("❌ LỖI KẾT NỐI:", res.status);
      const text = await res.text();
      console.log("Chi tiết lỗi:", text);
    } else {
      const data = await res.json();
      console.log("✅ API KEY HOẠT ĐỘNG TỐT!");
      console.log("AI trả lời:", data.choices[0].message.content);
    }
  } catch (error) {
    console.log("❌ LỖI MẠNG HOẶC HỆ THỐNG:", error.message);
  }
}

testApiKey();
