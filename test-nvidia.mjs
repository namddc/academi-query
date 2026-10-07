const API_KEY = "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";
const MODEL = "meta/llama-3.2-90b-vision-instruct";

async function test() {
  console.log("=== TEST NVIDIA Llama 3.2 90B ===");
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "Bạn là iBot đại học CNTT. Hãy trả lời cực kỳ ngắn gọn." },
          { role: "user", content: "có mấy loại học bổng?" }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });
    
    if (!res.ok) {
      console.log("LỖI HTTP:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log("AI TRẢ LỜI:", data.choices[0].message.content);
  } catch (err) {
    console.log("LỖI KẾT NỐI:", err.message);
  }
}
test();
