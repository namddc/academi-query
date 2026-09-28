const API_KEY = "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";
const BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "meta/llama-3.2-90b-vision-instruct";

async function main() {
  console.log("Sending request...");
  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: "hi" }],
        frequency_penalty: 0,
        max_tokens: 512,
        presence_penalty: 0,
        stream: false,
        temperature: 1,
        top_p: 1
      }),
    });

    if (!res.ok) {
      console.log(`Error ${res.status}:`, await res.text());
      return;
    }
    
    console.log(await res.json());
  } catch (err) {
    console.log("Error:", err);
  }
}

main();
