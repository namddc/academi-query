import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { threadService, type StoredMessage } from "@/services/threadService";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Loader2 } from "lucide-react";
import type { UIMessage } from "ai";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const [messages, setMessages] = useState<StoredMessage[] | null>(null);
  const [activeThreadId, setActiveThreadId] = useState(threadId);

  // Force reset messages state when navigating to a new thread
  if (threadId !== activeThreadId) {
    setActiveThreadId(threadId);
    setMessages(null);
  }

  // Load stored history for logged-in user
  useEffect(() => {
    const stored = threadService.getMessages(threadId);
    setMessages(stored);
  }, [threadId]);

  if (messages === null) {
    return (
      <div className="flex-1 grid place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  // Convert StoredMessage → UIMessage shape expected by ChatWindow
  const initialMessages: UIMessage[] = messages.map((m) => {
    const textContent = m.parts
      .filter((p) => p.type === "text")
      .map((p: any) => p.text || "")
      .join("");

    return {
      id: m.id,
      role: m.role,
      parts: m.parts as any,
      content: textContent,
      createdAt: new Date(m.createdAt),
    };
  });

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={initialMessages}
    />
  );
}
