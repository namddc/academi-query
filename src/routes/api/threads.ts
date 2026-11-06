// ============================================================
//  src/routes/api/threads.ts
//  API endpoints for syncing threads and messages with SQLite
// ============================================================

import { createFileRoute } from "@tanstack/react-router";
import { dbService, type DBMessage } from "@/lib/db.server";

export const Route = createFileRoute("/api/threads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const threadId = url.searchParams.get("threadId");
        const userId = url.searchParams.get("userId");

        // 1. Fetch single thread with messages
        if (threadId) {
          const thread = dbService.getThread(threadId);
          const rawMsgs = dbService.getMessages(threadId);

          const messages = rawMsgs.map((m) => {
            let parsedParts = [];
            try {
              parsedParts = JSON.parse(m.parts);
            } catch {
              parsedParts = [{ type: "text", text: m.parts }];
            }
            return {
              id: m.id,
              role: m.role,
              parts: parsedParts,
              createdAt: m.created_at,
            };
          });

          return new Response(JSON.stringify({ thread, messages }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // 2. Fetch list of threads
        const threads = dbService.listThreads(userId || "1");
        return new Response(JSON.stringify(threads), {
          headers: { "Content-Type": "application/json" },
        });
      },

      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { action, thread, messages, threadId, title, id } = body;

          if (action === "upsertThread" && thread) {
            dbService.upsertThread(thread);
            return new Response(JSON.stringify({ success: true }));
          }

          if (action === "saveMessages" && threadId && Array.isArray(messages)) {
            const dbMsgs: DBMessage[] = messages.map((m: any) => ({
              id: m.id,
              thread_id: threadId,
              user_id: m.userId || "1",
              role: m.role,
              parts: typeof m.parts === "string" ? m.parts : JSON.stringify(m.parts),
              created_at: m.createdAt || new Date().toISOString(),
            }));
            dbService.saveMessages(threadId, dbMsgs);
            return new Response(JSON.stringify({ success: true }));
          }

          if (action === "rename" && id && title) {
            dbService.renameThread(id, title);
            return new Response(JSON.stringify({ success: true }));
          }

          if (action === "delete" && id) {
            dbService.deleteThread(id);
            return new Response(JSON.stringify({ success: true }));
          }

          return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
        } catch (e: any) {
          console.error("[API/Threads] Error handling POST:", e);
          return new Response(JSON.stringify({ error: e?.message || String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
