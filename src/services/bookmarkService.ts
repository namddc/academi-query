// ============================================================
//  bookmarkService.ts – Quản lý tin nhắn / câu trả lời đã ghim (Bookmark)
//  Storage: localStorage (ibot_bookmarks)
// ============================================================

export interface BookmarkItem {
  id: string;             // Unique id
  messageId: string;      // ID tin nhắn của bot
  threadId: string;       // ID cuộc trò chuyện
  threadTitle: string;    // Tiêu đề cuộc trò chuyện
  question?: string;      // Câu hỏi của người dùng (nếu tìm thấy)
  answer: string;         // Nội dung câu trả lời
  createdAt: string;      // Thời điểm ghim
}

const BOOKMARKS_KEY = "ibot_bookmarks";

function readBookmarks(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? (JSON.parse(raw) as BookmarkItem[]) : [];
  } catch {
    return [];
  }
}

function writeBookmarks(items: BookmarkItem[]): void {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ibot_bookmarks_changed"));
    }
  } catch (e) {
    console.warn("Lỗi lưu bookmark:", e);
  }
}

export const bookmarkService = {
  /** Lấy danh sách bookmark, mới nhất xếp trước */
  getBookmarks(): BookmarkItem[] {
    return readBookmarks().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** Kiểm tra một tin nhắn đã được ghim chưa */
  isBookmarked(messageId: string): boolean {
    return readBookmarks().some((b) => b.messageId === messageId);
  },

  /** Thêm mới bookmark */
  addBookmark(item: Omit<BookmarkItem, "id" | "createdAt">): BookmarkItem {
    const items = readBookmarks();
    const existing = items.find((b) => b.messageId === item.messageId);
    if (existing) return existing;

    const newBookmark: BookmarkItem = {
      ...item,
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    items.unshift(newBookmark);
    writeBookmarks(items);
    return newBookmark;
  },

  /** Xóa bookmark theo messageId */
  removeBookmark(messageId: string): void {
    const items = readBookmarks().filter((b) => b.messageId !== messageId);
    writeBookmarks(items);
  },

  /** Toggle trạng thái ghim */
  toggleBookmark(item: Omit<BookmarkItem, "id" | "createdAt">): boolean {
    if (this.isBookmarked(item.messageId)) {
      this.removeBookmark(item.messageId);
      return false; // đã bỏ ghim
    } else {
      this.addBookmark(item);
      return true; // đã ghim
    }
  },
};
