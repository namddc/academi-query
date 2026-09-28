// ============================================================
//  threadService.ts  –  Mock chat thread management
//  Storage: localStorage only, no database
// ============================================================

const THREADS_KEY = "academi_threads";
const MESSAGES_PREFIX = "academi_msgs_";

// ── Types ────────────────────────────────────────────────────

export interface Thread {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: { type: "text"; text: string }[];
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function readThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    return raw ? (JSON.parse(raw) as Thread[]) : [];
  } catch {
    return [];
  }
}

function writeThreads(threads: Thread[]): void {
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

function messagesKey(threadId: string): string {
  return `${MESSAGES_PREFIX}${threadId}`;
}

function readMessages(threadId: string): StoredMessage[] {
  try {
    const raw = localStorage.getItem(messagesKey(threadId));
    return raw ? (JSON.parse(raw) as StoredMessage[]) : [];
  } catch {
    return [];
  }
}

function writeMessages(threadId: string, messages: StoredMessage[]): void {
  localStorage.setItem(messagesKey(threadId), JSON.stringify(messages));
}

// ── Public API ───────────────────────────────────────────────

export const threadService = {
  // ── Threads ──────────────────────────────────────────────

  /** List all threads for a user, newest first. */
  listThreads(userId: string): Thread[] {
    return readThreads()
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  /** Create a new empty thread. */
  createThread(userId: string, title = "Cuộc trò chuyện mới"): Thread {
    const thread: Thread = {
      id: genId(),
      title,
      userId,
      createdAt: now(),
      updatedAt: now(),
    };
    const threads = readThreads();
    threads.push(thread);
    writeThreads(threads);
    return thread;
  },

  /** Rename an existing thread. */
  renameThread(id: string, title: string): Thread | null {
    const threads = readThreads();
    const idx = threads.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    threads[idx] = { ...threads[idx], title: title.trim() || "Cuộc trò chuyện mới", updatedAt: now() };
    writeThreads(threads);
    return threads[idx];
  },

  /** Delete a thread and all its messages. */
  deleteThread(id: string): void {
    const threads = readThreads().filter((t) => t.id !== id);
    writeThreads(threads);
    localStorage.removeItem(messagesKey(id));
  },

  /** Get a single thread by id. */
  getThread(id: string): Thread | null {
    return readThreads().find((t) => t.id === id) ?? null;
  },

  /** Update the thread's `updatedAt` (called after adding a message). */
  touchThread(id: string): void {
    const threads = readThreads();
    const idx = threads.findIndex((t) => t.id === id);
    if (idx !== -1) {
      threads[idx].updatedAt = now();
      writeThreads(threads);
    }
  },

  // ── Auto-title ───────────────────────────────────────────

  /** Set thread title from the first user message (truncated to 60 chars). */
  autoTitleFromMessage(threadId: string, text: string): void {
    const threads = readThreads();
    const idx = threads.findIndex((t) => t.id === threadId);
    if (idx === -1) return;
    // Only auto-title if still at the default
    if (threads[idx].title !== "Cuộc trò chuyện mới") return;
    const title = text.slice(0, 60) + (text.length > 60 ? "…" : "");
    threads[idx] = { ...threads[idx], title, updatedAt: now() };
    writeThreads(threads);
  },

  // ── Messages ─────────────────────────────────────────────

  /** Get all messages for a thread. */
  getMessages(threadId: string): StoredMessage[] {
    return readMessages(threadId);
  },

  /** Append a message to a thread. */
  addMessage(
    threadId: string,
    role: StoredMessage["role"],
    text: string,
  ): StoredMessage {
    const message: StoredMessage = {
      id: genId(),
      role,
      parts: [{ type: "text", text }],
      createdAt: now(),
    };
    const messages = readMessages(threadId);
    messages.push(message);
    writeMessages(threadId, messages);
    this.touchThread(threadId);
    return message;
  },

  /** Replace all messages for a thread (used for streaming updates). */
  setMessages(threadId: string, messages: StoredMessage[]): void {
    writeMessages(threadId, messages);
    this.touchThread(threadId);
  },
};
