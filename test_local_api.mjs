async function testLocalApi() {
  console.log("Testing local API...");
  try {
    const res = await fetch("http://127.0.0.1:5173/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ id: "msg1", role: "user", content: "Thầy cô biên soạn giáo trình bị chậm tiến độ thì có bị làm sao không nhỉ?" }],
        threadId: "test-thread-123"
      }),
    });


    console.log("Status:", res.status);
    
    if (res.ok) {
      // It's a stream, so let's read the first few chunks
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        console.log("No stream reader found.");
        return;
      }
      
      let answer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse the AI SDK stream format (e.g. 0:"text")
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.substring(2));
              if (typeof text === 'string') answer += text;
            } catch (e) {}
          }
        }
      }
      console.log("\n--- TRẢ LỜI CỦA AI ---");
      console.log(answer);
      console.log("------------------------");
      console.log("\nFull output length:", received.length);
    } else {
      console.log("Error response:", await res.text());
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testLocalApi();
