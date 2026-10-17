import { createFileRoute } from "@tanstack/react-router";
import { streamText, generateText, type UIMessage } from "ai";
import {
  getPrimaryModel,
  primaryModelSettings,
  nvidiaModel,
  nvidiaModelSettings,
} from "@/lib/ai-provider.server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { aiService } from "@/services/aiService.server";


export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.json();

        // ── Fast path: Generate Thread Title using LLM ───────────
        if (rawBody?.action === "generate-title") {
          const userMessage = (rawBody?.message ?? "") as string;
          if (!userMessage.trim()) {
            return new Response(JSON.stringify({ title: "Cuộc trò chuyện mới" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          try {
            const prompt = `Bạn là trợ lý đặt tên ngắn gọn cho cuộc trò chuyện sinh viên. Hãy tóm tắt câu hỏi sau thành một tiêu đề ngắn gọn từ 3 đến 6 từ.
Quy tắc:
- Chỉ trả lời duy nhất tiêu đề tiếng Việt.
- Không dấu ngoặc kép, không dấu chấm, không từ chào hỏi.
- Thể hiện rõ chủ đề (ví dụ: "Học bổng khuyến khích HK2", "Quy trình xin bảo lưu", "Hạn nộp học phí").

Câu hỏi: "${userMessage.slice(0, 250)}"`;

            const primaryModel = getPrimaryModel();
            const titleRes = await generateText({
              model: primaryModel,
              prompt,
            });

            let cleanedTitle = titleRes.text
              .replace(/["'“”«»]/g, "")
              .replace(/^Tiêu đề[:\s]*/i, "")
              .replace(/[.\n\r]+$/, "")
              .trim();

            if (!cleanedTitle || cleanedTitle.length > 50) {
              const words = userMessage.trim().split(/\s+/).slice(0, 7).join(" ");
              cleanedTitle = words + (userMessage.split(/\s+/).length > 7 ? "..." : "");
            }

            return new Response(JSON.stringify({ title: cleanedTitle }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } catch (e) {
            console.warn("[API/Chat] generate-title fallback:", e);
            const words = userMessage.trim().split(/\s+/).slice(0, 7).join(" ");
            return new Response(JSON.stringify({ title: words }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        const messages = rawBody?.messages as UIMessage[] | undefined;
        const threadId = (rawBody?.threadId ?? rawBody?.id) as
          | string
          | undefined;

        if (!Array.isArray(messages) || !threadId) {
          console.error(
            "[API/Chat] Invalid body keys:",
            Object.keys(rawBody ?? {}),
          );
          return new Response("messages và threadId là bắt buộc", {
            status: 400,
          });
        }

        // Auth check
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }

        // ── Helper: extract plain text from any message format ──
        function extractText(m: any): string {

          // AI SDK often sets content="" when using parts
          let text = "";
          if (m.parts && Array.isArray(m.parts)) {
            text = m.parts
              .filter((p: any) => p.type === "text")
              .map((p: any) => p.text ?? "")
              .join(" ")
              .trim();
          }
          if (text) return text;

          if (Array.isArray(m.content)) {
            text = m.content
              .filter((p: any) => p.type === "text")
              .map((p: any) => p.text ?? "")
              .join(" ")
              .trim();
          } else if (typeof m.content === "string") {
            text = m.content.trim();
          }
          return text;
        }

        // Extract latest user message text using the robust extractText helper
        const lastUser = [...messages].reverse().find((m) => m.role === "user") as any;
        let userText: string = lastUser ? extractText(lastUser) : "";

        // ── Primary: ExpSolution AI Gateway ─────────────────────
        let primaryModel;
        try {
          primaryModel = getPrimaryModel();
        } catch (configErr: any) {
          console.error("[API/Chat] Model config error:", configErr.message);
          return new Response(
            JSON.stringify({ error: "AI chưa được cấu hình. Vui lòng liên hệ quản trị viên để cài đặt API key." }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }

        console.log("[API/Chat] Using model: expsolution/gemmatranslate-27b");

        // ── PRE-RETRIEVAL OCR FOR IMAGES ──────────────────────────
        // If the user sent images, the RAG system needs to "read" them FIRST 
        // to have keywords to search for in the database.
        if (lastUser) {
          const imageParts: any[] = (lastUser.parts ?? []).filter(
            (p: any) => p.type === "file" && p.mediaType?.startsWith("image/"),
          );

          if (imageParts.length > 0) {
            console.log(`[API/Chat] 🖼️ Vision OCR pre-retrieval triggered for ${imageParts.length} images...`);
            try {
              const ocrContentParts: any[] = [
                { type: "text", text: "Trích xuất chính xác tất cả các chữ, câu hỏi và văn bản xuất hiện trong hình ảnh này. Chỉ trả về văn bản, KHÔNG giải thích thêm. Nếu là câu hỏi, hãy chép lại đúng câu hỏi đó." }
              ];
              for (const img of imageParts) {
                ocrContentParts.push({ type: "image", image: img.url });
              }

              // Call ExpSolution model for OCR (gemmatranslate-27b supports vision)
              const ocrResult = await generateText({
                model: primaryModel,
                messages: [{ role: "user", content: ocrContentParts }],
              });

              if (ocrResult.text) {
                console.log(`[API/Chat] 📝 OCR Extracted Text: "${ocrResult.text}"`);
                // Append extracted text to userText so RAG can search it
                userText = userText ? `${userText}\n${ocrResult.text}` : ocrResult.text;
              }
            } catch (ocrError) {
              console.error("[API/Chat] Pre-retrieval OCR failed:", ocrError);
            }
          }
        }

        // ── Helper: build conversation context for query rewriting ──
        function buildConversationContext(allMessages: UIMessage[], limit = 4): string {
          const history = allMessages.slice(0, -1).slice(-limit);
          if (history.length === 0) return "";
          return history
            .map((m) => {
              const roleName = m.role === "user" ? "Sinh viên" : "iBot";
              const text = extractText(m);
              const truncated = text.length > 300 ? text.slice(0, 300) + "..." : text;
              return `${roleName}: ${truncated}`;
            })
            .filter((line) => line.split(": ")[1]?.trim())
            .join("\n");
        }

        // ── CONTEXT-AWARE QUERY REWRITING (EXPANSION) ─────────────
        // If there's conversation history or slang, rewrite the question into a standalone, complete query
        // so that RAG (FAQ & Document Chunks) can search accurately with context.
        let searchKeyword = userText;
        const conversationContext = buildConversationContext(messages);

        if (searchKeyword && searchKeyword.length < 300) {
          try {
            console.log(`[API/Chat] 🔄 Rewriting query with context. Original: "${searchKeyword}"`);

            const systemPromptRewriter = conversationContext
              ? `Bạn là trợ lý giúp tối ưu hóa từ khóa tìm kiếm cho hệ thống RAG trường đại học.
Nhiệm vụ: Dựa vào lịch sử hội thoại gần đây và câu hỏi mới của sinh viên, hãy viết lại câu hỏi thành 1 câu truy vấn hoàn chỉnh, độc lập, rõ nghĩa, làm rõ các đại từ thay thế (như "nó", "đó", "thế còn...", "bao nhiêu", "ở đâu", "ai").
Nếu câu hỏi đã đủ rõ ràng hoặc hỏi chủ đề mới không liên quan ngữ cảnh cũ, chỉ cần chuẩn hóa từ ngữ chuyên môn (ví dụ: 'nvqs' -> 'nghĩa vụ quân sự', 'rút hs' -> 'rút hồ sơ sinh viên').

Quy tắc:
- CHỈ trả về đúng 1 câu truy vấn độc lập hoàn chỉnh.
- KHÔNG trả lời câu hỏi.
- KHÔNG giải thích thêm.`
              : `Bạn là trợ lý giúp tối ưu hóa từ khóa tìm kiếm cho hệ thống RAG trường đại học. Hãy chuẩn hóa câu hỏi của sinh viên thành một câu truy vấn rõ ràng, đầy đủ từ ngữ chuyên môn hành chính (ví dụ: 'giấy hoãn đi lính' -> 'thủ tục xin giấy xác nhận tạm hoãn nghĩa vụ quân sự', 'nvqs' -> 'nghĩa vụ quân sự', 'rút hs' -> 'rút hồ sơ sinh viên').
CHỈ trả về đúng 1 câu truy vấn đã chuẩn hoá. KHÔNG giải thích. KHÔNG trả lời câu hỏi.`;

            const userPromptRewriter = conversationContext
              ? `[Lịch sử hội thoại gần đây]:\n${conversationContext}\n\n[Câu hỏi hiện tại của sinh viên]:\n${searchKeyword}`
              : searchKeyword;

            const rewriteResult = await generateText({
              model: primaryModel,
              system: systemPromptRewriter,
              prompt: userPromptRewriter,
            });

            if (rewriteResult.text) {
              const rewritten = rewriteResult.text.trim().replace(/^["']|["']$/g, "");
              // Append rewritten query so DB can match both original keywords and contextual terms
              searchKeyword = `${searchKeyword} ${rewritten}`;
              console.log(`[API/Chat] 📝 Rewritten search keyword: "${searchKeyword}"`);
            }
          } catch (e) {
            console.error("[API/Chat] Context-aware query rewriting failed:", e);
          }
        }

        // Knowledge retrieval
        let systemPrompt = SYSTEM_PROMPT;
        let detectedRagLayer = "none";

        try {
          if (searchKeyword) {
            const enhanced = await aiService.getEnhancedPrompt(searchKeyword);
            systemPrompt = enhanced.systemPrompt;

            if (enhanced.hasKnowledge) {
              detectedRagLayer = enhanced.layer;
              const detail =
                enhanced.layer === "L1_FAQ"
                  ? `L1 FAQ: ${enhanced.knowledgeResults.length} matches (top confidence: ${enhanced.knowledgeResults[0]?.confidence ?? 0}%)`
                  : `L2 Chunk: ${enhanced.l2Results?.chunks.length ?? 0} chunks (${enhanced.l2Results?.matchedCategory ?? ""})`;
              console.log(
                `[API/Chat] ✅ [${enhanced.layer}] ${detail} for "${searchKeyword.slice(0, 50)}"`,
              );
            } else {
              console.log(
                `[API/Chat] ⚠️  Fallback for "${searchKeyword.slice(0, 50)}"`,
              );
            }
          }
        } catch (e) {
          console.error("[API/Chat] Knowledge retrieval failed:", e);
        }

        // Normalize messages to CoreMessage format — STRIP IMAGES because GemmaTranslate is text-only.
        const coreMessages: any[] = [];
        for (let i = 0; i < (messages?.length || 0); i++) {
          const m = messages![i];
          const isLast = i === messages!.length - 1;

          if (m.role === "user") {
            // For the last message, we already appended the OCR text into `userText`. Use it directly.
            if (isLast && userText) {
              coreMessages.push({ role: "user" as const, content: userText });
            } else {
              // For historical messages, strip out images to avoid crashing the text model.
              const textContent = extractText(m as any);
              coreMessages.push({ role: "user" as const, content: textContent || "" });
            }
          } else {
            // assistant / system — text only
            coreMessages.push({ role: m.role as any, content: extractText(m as any) || "" });
          }
        }

        try {
          const result = streamText({
            model: primaryModel,
            system: systemPrompt,
            messages: coreMessages,
            ...primaryModelSettings,
          });

          return result.toUIMessageStreamResponse({
            headers: {
              "x-thread-id": threadId,
              "x-rag-layer": detectedRagLayer,
              "Access-Control-Expose-Headers": "x-thread-id, x-rag-layer",
            },
          });

        } catch (e: any) {
          console.error("[API/Chat] Runtime error in streamText:", e);
          return new Response("Runtime Error: " + (e?.message || String(e)), {
            status: 500,
          });
        }
      },
    },
  },
});
