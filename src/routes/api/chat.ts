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

              // Call NVIDIA Llama Vision purely for OCR
              const ocrResult = await generateText({
                model: nvidiaModel,
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

        // Knowledge retrieval
        let systemPrompt = SYSTEM_PROMPT;

        try {
          if (userText) {
            const enhanced = await aiService.getEnhancedPrompt(userText);
            systemPrompt = enhanced.systemPrompt;

            if (enhanced.hasKnowledge) {
              const detail =
                enhanced.layer === "L1_FAQ"
                  ? `L1 FAQ: ${enhanced.knowledgeResults.length} matches (top confidence: ${enhanced.knowledgeResults[0]?.confidence ?? 0}%)`
                  : `L2 Chunk: ${enhanced.l2Results?.chunks.length ?? 0} chunks (${enhanced.l2Results?.matchedCategory ?? ""})`;
              console.log(
                `[API/Chat] ✅ [${enhanced.layer}] ${detail} for "${userText.slice(0, 50)}"`,
              );
            } else {
              console.log(
                `[API/Chat] ⚠️  Fallback for "${userText.slice(0, 50)}"`,
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

        // ── Primary: ExpSolution AI Gateway ─────────────────────
        // Falls back to NVIDIA automatically if key not set.
        const primaryModel = getPrimaryModel();
        const isExpSolution = primaryModel !== nvidiaModel;
        const modelSettings = isExpSolution
          ? primaryModelSettings
          : nvidiaModelSettings;

        console.log(
          `[API/Chat] Using model: ${isExpSolution ? "expsolution/gemmatranslate-27b" : "nvidia/llama-3.2-90b"}`,
        );

        try {
          const result = streamText({
            model: primaryModel,
            system: systemPrompt,
            messages: coreMessages,
            ...modelSettings,
          });

          return result.toUIMessageStreamResponse({
            headers: {
              "x-thread-id": threadId,
            },
          });
        } catch (e: any) {
          // ── Fallback: NVIDIA if ExpSolution fails ────────────────
          if (isExpSolution) {
            console.warn(
              "[API/Chat] ExpSolution failed, falling back to NVIDIA:",
              e?.message,
            );
            try {
              const fallback = streamText({
                model: nvidiaModel,
                system: systemPrompt,
                messages: coreMessages,
                ...nvidiaModelSettings,
              });
              return fallback.toUIMessageStreamResponse({
                headers: { "x-thread-id": threadId },
              });
            } catch (fe: any) {
              console.error("[API/Chat] NVIDIA fallback also failed:", fe);
              return new Response(
                "Runtime Error: " + (fe?.message || String(fe)),
                { status: 500 },
              );
            }
          }

          console.error("[API/Chat] Runtime error in streamText:", e);
          return new Response("Runtime Error: " + (e?.message || String(e)), {
            status: 500,
          });
        }
      },
    },
  },
});
