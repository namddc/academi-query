// ============================================================
//  threadService.ts  –  Mock chat thread management
//  Storage: localStorage only, no database
// ============================================================

import { authService } from "@/services/authService";

const THREADS_KEY = "academi_threads";
const MESSAGES_PREFIX = "academi_msgs_";

// ── Types ────────────────────────────────────────────────────

export interface Thread {
  id: string;
  title: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessagePartText {
  type: "text";
  text: string;
}

export interface StoredMessagePartFile {
  type: "file";
  mediaType: string;
  url: string;
  filename?: string;
}

export type StoredMessagePart = StoredMessagePartText | StoredMessagePartFile;

export interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: StoredMessagePart[];
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
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("academi_threads_updated"));
    }
  } catch (e) {
    console.warn("Failed to write threads to localStorage:", e);
  }
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
  try {
    localStorage.setItem(messagesKey(threadId), JSON.stringify(messages));
  } catch (e) {
    console.warn("Storage error when saving thread messages, trying fallback:", e);
    try {
      // If quota exceeded, preserve text and only retain images for latest 10 messages
      const fallback = messages.map((m, idx) => {
        if (idx < messages.length - 10) {
          return {
            ...m,
            parts: m.parts.filter((p) => p.type === "text"),
          };
        }
        return m;
      });
      localStorage.setItem(messagesKey(threadId), JSON.stringify(fallback));
    } catch {
      // Suppress error to avoid breaking chat UI
    }
  }
}

// ── Public API ───────────────────────────────────────────────

export const threadService = {
  // ── Threads ──────────────────────────────────────────────

  /** List all threads for a user (or all if not specified), newest first. */
  listThreads(userId?: string): Thread[] {
    const all = readThreads();
    return (userId ? all.filter((t) => t.userId === userId) : all)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  /** Create a new empty thread or return an existing empty one to prevent spam. */
  createThread(userId: string, title = "Cuộc trò chuyện mới"): Thread {
    const threads = readThreads();
    
    // Check if there's already a thread for this user with 0 messages
    const emptyThread = threads.find(
      (t) => t.userId === userId && readMessages(t.id).length === 0
    );
    if (emptyThread) {
      return emptyThread; // Reuse the empty thread instead of creating a new one
    }

    const currentUser = typeof window !== "undefined" ? authService.getCurrentUser() : null;
    const thread: Thread = {
      id: genId(),
      title,
      userId,
      userName: currentUser?.id === userId ? currentUser.name : undefined,
      userEmail: currentUser?.id === userId ? currentUser.email : undefined,
      createdAt: now(),
      updatedAt: now(),
    };
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

  // ── Search & Grouping ────────────────────────────────────

  /** Search threads by title AND message content, returning match snippets */
  searchThreads(
    userId: string,
    query: string,
  ): Array<Thread & { matchSnippet?: string }> {
    const userThreads = this.listThreads(userId);
    const q = query.trim().toLowerCase();
    if (!q) return userThreads;

    const results: Array<Thread & { matchSnippet?: string }> = [];

    for (const thread of userThreads) {
      // 1. Match by title
      if (thread.title.toLowerCase().includes(q)) {
        results.push(thread);
        continue;
      }

      // 2. Match inside messages content
      const messages = readMessages(thread.id);
      let foundSnippet: string | undefined;

      for (const msg of messages) {
        for (const part of msg.parts) {
          if (part.type === "text") {
            const idx = part.text.toLowerCase().indexOf(q);
            if (idx !== -1) {
              const start = Math.max(0, idx - 25);
              const end = Math.min(part.text.length, idx + q.length + 35);
              foundSnippet =
                (start > 0 ? "..." : "") +
                part.text.slice(start, end).trim() +
                (end < part.text.length ? "..." : "");
              break;
            }
          }
        }
        if (foundSnippet) break;
      }

      if (foundSnippet) {
        results.push({ ...thread, matchSnippet: foundSnippet });
      }
    }

    return results;
  },

  /** Group threads into timeline categories */
  groupThreadsByDate(threads: Thread[]): Record<string, Thread[]> {
    const groups: Record<string, Thread[]> = {
      "Hôm nay": [],
      "Hôm qua": [],
      "7 ngày trước": [],
      "30 ngày trước": [],
      "Cũ hơn": [],
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = startOfToday - 30 * 24 * 60 * 60 * 1000;

    for (const thread of threads) {
      const time = new Date(thread.updatedAt || thread.createdAt).getTime();

      if (time >= startOfToday) {
        groups["Hôm nay"].push(thread);
      } else if (time >= startOfYesterday) {
        groups["Hôm qua"].push(thread);
      } else if (time >= sevenDaysAgo) {
        groups["7 ngày trước"].push(thread);
      } else if (time >= thirtyDaysAgo) {
        groups["30 ngày trước"].push(thread);
      } else {
        groups["Cũ hơn"].push(thread);
      }
    }

    // Filter out empty groups
    const result: Record<string, Thread[]> = {};
    for (const [key, list] of Object.entries(groups)) {
      if (list.length > 0) {
        result[key] = list;
      }
    }
    return result;
  },

  /**
   * Khởi tạo các cuộc hội thoại mẫu từ nhiều sinh viên khác nhau cho Admin kiểm tra.
   */
  seedSampleThreads(): void {
    const sampleStudents = [
      { id: "stu_1", name: "Lê Minh Quân", email: "quan.lm21@student.edu.vn", avatar: null },
      { id: "stu_2", name: "Trần Thị Phương Thảo", email: "thao.ttp22@student.edu.vn", avatar: null },
      { id: "stu_3", name: "Vũ Đức Anh", email: "anh.vd20@student.edu.vn", avatar: null },
      { id: "stu_4", name: "Hoàng Gia Huy", email: "huy.hg23@student.edu.vn", avatar: null },
    ];
    authService.seedSampleUsers(sampleStudents);

    const existingThreads = readThreads();
    const nowTs = Date.now();

    const sampleData = [
      {
        threadId: "sample_thread_1",
        title: "Điều kiện xét học bổng khuyến khích học tập kỳ 2",
        userId: "stu_1",
        userName: "Lê Minh Quân",
        userEmail: "quan.lm21@student.edu.vn",
        daysAgo: 0.5,
        messages: [
          {
            role: "user" as const,
            text: "Chào bot, điều kiện để được xét học bổng khuyến khích học tập của trường mình là gì vậy ạ?",
          },
          {
            role: "assistant" as const,
            text: "Chào bạn Lê Minh Quân! Theo Quy chế Đào tạo & Công tác Sinh viên của Trường, điều kiện để xét học bổng khuyến khích học tập gồm:\n\n1. **Điểm học tập:** Điểm trung bình chung học tập (ĐTBCHT) đạt từ 8.0 trở lên trong học kỳ xét.\n2. **Điểm rèn luyện:** Đạt từ 80 điểm (loại Tốt hoặc Xuất sắc) trở lên.\n3. **Số tín chỉ:** Đăng ký tối thiểu 15 tín chỉ trong học kỳ chính.\n4. **Kỷ luật:** Không bị kỷ luật từ mức khiển trách trở lên trong kỳ học.\n\nHọc bổng sẽ được xét theo thứ tự từ cao xuống thấp cho đến khi hết chỉ tiêu kinh phí của Khoa/Viện.",
          },
        ],
      },
      {
        threadId: "sample_thread_2",
        title: "Thủ tục xin cấp lại thẻ sinh viên bị mất",
        userId: "stu_2",
        userName: "Trần Thị Phương Thảo",
        userEmail: "thao.ttp22@student.edu.vn",
        daysAgo: 1.5,
        messages: [
          {
            role: "user" as const,
            text: "Mình bị rơi mất thẻ sinh viên thì cần làm thủ tục gì và liên hệ phòng nào để làm lại thẻ mới?",
          },
          {
            role: "assistant" as const,
            text: "Chào bạn Phương Thảo! Để làm lại thẻ sinh viên bị mất, bạn thực hiện theo các bước sau:\n\n1. **Bước 1:** Đăng nhập vào Cổng Dịch vụ Sinh viên trực tuyến (mục 'Dịch vụ Một cửa').\n2. **Bước 2:** Chọn thủ tục **'Cấp lại Thẻ sinh viên'**, điền thông tin và tải lên file ảnh thẻ 3x4 (nền xanh, chụp rõ mặt).\n3. **Bước 3:** Nộp lệ phí làm lại thẻ (50.000 VNĐ) qua mã QR thanh toán trên hệ thống.\n4. **Bước 4:** Sau 5-7 ngày làm việc, bạn đến nhận thẻ trực tiếp tại **Phòng Công tác Sinh viên (Phòng A1-102)** khi có thông báo qua email sinh viên.",
          },
        ],
      },
      {
        threadId: "sample_thread_3",
        title: "Thời hạn đóng học phí và thủ tục xin bảo lưu",
        userId: "stu_3",
        userName: "Vũ Đức Anh",
        userEmail: "anh.vd20@student.edu.vn",
        daysAgo: 2.5,
        messages: [
          {
            role: "user" as const,
            text: "Cho mình hỏi hạn chót đóng học phí kỳ này là ngày nào? Nếu muốn xin bảo lưu kỳ này thì cần làm những gì?",
          },
          {
            role: "assistant" as const,
            text: "Chào bạn Đức Anh!\n\n1. **Về thời hạn đóng học phí:** Hạn chót đóng học phí học kỳ hiện tại là trước 17h00 ngày 28/02. Bạn có thể thanh toán qua cổng Viettel Money hoặc chuyển khoản trực tiếp vào tài khoản trường.\n\n2. **Về thủ tục xin bảo lưu kết quả học tập:**\n- Bạn cần nộp **Đơn xin tạm ngừng học tập** (theo mẫu của Phòng Đào tạo) có xác nhận đồng ý của phụ huynh.\n- Kèm theo minh chứng lý do (giấy xác nhận y tế nếu ốm đau, hoặc quyết định công tác/nghĩa vụ quân sự).\n- Nộp hồ sơ tại Văn phòng Một cửa trước khi kỳ thi kết thúc học phần bắt đầu ít nhất 2 tuần.",
          },
        ],
      },
      {
        threadId: "sample_thread_4",
        title: "Quy định về chuẩn đầu ra Tiếng Anh khóa 2023",
        userId: "stu_4",
        userName: "Hoàng Gia Huy",
        userEmail: "huy.hg23@student.edu.vn",
        daysAgo: 4,
        messages: [
          {
            role: "user" as const,
            text: "Sinh viên khóa 2023 cần đạt chứng chỉ tiếng Anh gì để đủ điều kiện xét tốt nghiệp?",
          },
          {
            role: "assistant" as const,
            text: "Chào bạn Gia Huy! Quy định chuẩn đầu ra ngoại ngữ cho sinh viên khóa 2023 như sau:\n\n- **Khối ngành kỹ thuật & công nghệ:** Đạt tối thiểu TOEIC 500 (Nghe-Đọc) hoặc IELTS 5.0, hoặc VSTEP Bậc 3 (B1).\n- **Khối ngành kinh tế & quản trị:** Đạt tối thiểu TOEIC 550 hoặc IELTS 5.5.\n- **Lưu ý:** Chứng chỉ phải còn thời hạn trong vòng 2 năm tính đến thời điểm nộp hồ sơ xét tốt nghiệp và do các đơn vị khảo thí được Bộ GD&ĐT công nhận cấp.",
          },
        ],
      },
    ];

    let hasChange = false;
    for (const s of sampleData) {
      if (!existingThreads.some((t) => t.id === s.threadId)) {
        const timeIso = new Date(nowTs - s.daysAgo * 86400000).toISOString();
        existingThreads.push({
          id: s.threadId,
          title: s.title,
          userId: s.userId,
          userName: s.userName,
          userEmail: s.userEmail,
          createdAt: timeIso,
          updatedAt: timeIso,
        });

        const msgs: StoredMessage[] = s.messages.map((m, idx) => ({
          id: `${s.threadId}_msg_${idx}`,
          role: m.role,
          parts: [{ type: "text", text: m.text }],
          createdAt: timeIso,
        }));
        writeMessages(s.threadId, msgs);
        hasChange = true;
      }
    }

    if (hasChange) {
      writeThreads(existingThreads);
    }
  },
};

