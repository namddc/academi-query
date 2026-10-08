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

        // ── QUERY REWRITING (EXPANSION) ───────────────────────────
        // Use LLM to rewrite slang or abbreviations into formal terms for better DB search
        let searchKeyword = userText;
        // Only rewrite if it's a short text (likely a query, not a big document)
        if (searchKeyword && searchKeyword.length < 150) {
          try {
            console.log(`[API/Chat] 🔄 Rewriting query: "${searchKeyword}"`);
            const rewriteResult = await generateText({
              model: primaryModel,
              system: "Bạn là trợ lý giúp tối ưu hóa từ khóa tìm kiếm. Hãy chuẩn hóa câu hỏi của sinh viên thành một câu truy vấn rõ ràng, đầy đủ từ ngữ chuyên môn hành chính. \nVí dụ:\n- 'giấy hoãn đi lính' -> 'thủ tục xin giấy xác nhận tạm hoãn nghĩa vụ quân sự'\n- 'nvqs' -> 'nghĩa vụ quân sự'\n- 'rút hs' -> 'rút hồ sơ sinh viên'\n\nCHỈ trả về đúng 1 câu truy vấn đã chuẩn hoá. KHÔNG giải thích. KHÔNG trả lời câu hỏi.",
              prompt: searchKeyword,
            });
            if (rewriteResult.text) {
              // We append the rewritten query so the DB can match either original or rewritten keywords
              searchKeyword = `${searchKeyword} ${rewriteResult.text.trim()}`;
              console.log(`[API/Chat] 📝 Rewritten search keyword: "${searchKeyword}"`);
            }
          } catch (e) {
            console.error("[API/Chat] Query rewriting failed:", e);
          }
        }

        // Knowledge retrieval
        let systemPrompt = SYSTEM_PROMPT;

        try {
          if (searchKeyword) {
            const enhanced = await aiService.getEnhancedPrompt(searchKeyword);
            systemPrompt = enhanced.systemPrompt;

            if (enhanced.hasKnowledge) {
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
