import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { threadService, type StoredMessage } from "@/services/threadService";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Loader2 } from "lucide-react";
import type { UIMessage } from "ai";
import { Route as AuthenticatedRoute } from "@/routes/_authenticated/route";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { isGuest } = AuthenticatedRoute.useRouteContext();
  const [messages, setMessages] = useState<StoredMessage[] | null>(null);
  const [activeThreadId, setActiveThreadId] = useState(threadId);

  // Force reset messages state when navigating to a new thread
  if (threadId !== activeThreadId) {
    setActiveThreadId(threadId);
    setMessages(null);
  }

  // Load messages: guests always start fresh (no localStorage), logged-in users load saved history
  useEffect(() => {
    if (isGuest) {
      // Guest mode: start with empty messages — nothing is persisted
      setMessages([]);
    } else {
      const stored = threadService.getMessages(threadId);
      setMessages(stored);
    }
  }, [threadId, isGuest]);

  if (messages === null) {
    return (
      <div className="flex-1 grid place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  // Convert StoredMessage → UIMessage shape expected by ChatWindow
  const initialMessages: UIMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
    content: m.parts.map((p) => p.text).join(""),
    createdAt: new Date(m.createdAt),
  }));

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={initialMessages}
      guestMode={isGuest}
      onAfterFirstSend={() => {
        // Auto-title is handled by ChatWindow calling threadService.autoTitleFromMessage
        // Sidebar refreshes via the useThreads hook's storage event listener
      }}
    />
  );
}
