import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { bookmarkService, type BookmarkItem } from "@/services/bookmarkService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bookmark,
  Search,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  X,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BookmarksModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadBookmarks = () => {
    setBookmarks(bookmarkService.getBookmarks());
  };

  useEffect(() => {
    if (isOpen) {
      loadBookmarks();
    }
    const handler = () => loadBookmarks();
    window.addEventListener("ibot_bookmarks_changed", handler);
    return () => window.removeEventListener("ibot_bookmarks_changed", handler);
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = bookmarks.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.threadTitle.toLowerCase().includes(q) ||
      b.answer.toLowerCase().includes(q) ||
      (b.question && b.question.toLowerCase().includes(q))
    );
  });

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Đã sao chép nội dung");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleRemove = (messageId: string) => {
    bookmarkService.removeBookmark(messageId);
    toast.info("Đã bỏ ghim tin nhắn");
  };

  const handleGoToThread = (threadId: string) => {
    navigate({ to: "/chat/$threadId", params: { threadId } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-message-in">
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-elevated flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 grid place-items-center">
              <Bookmark className="size-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Tin nhắn đã ghim</h2>
              <p className="text-xs text-muted-foreground">
                Tổng cộng {bookmarks.length} câu trả lời quan trọng đã lưu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 grid place-items-center rounded-xl hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-border/40 bg-muted/20">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm trong danh sách đã ghim..."
              className="pl-9 h-9 rounded-xl bg-background"
            />
          </div>
        </div>

        {/* List content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="size-12 rounded-2xl bg-muted/60 text-muted-foreground mx-auto grid place-items-center">
                <Bookmark className="size-6" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {search ? "Không tìm thấy tin nhắn phù hợp" : "Chưa có tin nhắn nào được ghim"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Bấm vào biểu tượng 🔖 ở bất kỳ câu trả lời nào của iBot để lưu trữ và xem lại nhanh tại đây.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-soft transition-all space-y-3"
              >
                {/* Meta header */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                  <div className="flex items-center gap-1.5 font-medium text-foreground truncate max-w-xs">
                    <MessageSquare className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{item.threadTitle}</span>
                  </div>
                  <span className="text-[11px] shrink-0">
                    {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* User question snippet (if any) */}
                {item.question && (
                  <div className="text-xs bg-muted/40 p-2.5 rounded-xl border border-border/40 text-foreground font-medium flex items-start gap-1.5">
                    <span className="text-primary shrink-0 font-bold">Hỏi:</span>
                    <span className="line-clamp-2">{item.question}</span>
                  </div>
                )}

                {/* Bot answer content */}
                <div className="text-xs text-foreground/90 max-h-48 overflow-y-auto scrollbar-thin rounded-xl bg-background/50 p-3 border border-border/30 markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleRemove(item.messageId)}
                    className="flex items-center gap-1 text-[11px] text-destructive hover:bg-destructive/10 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="size-3" />
                    <span>Bỏ ghim</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(item.id, item.answer)}
                      className="h-7 text-xs rounded-lg gap-1"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-600">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGoToThread(item.threadId)}
                      className="h-7 text-xs rounded-lg gap-1 hover:border-primary hover:text-primary"
                    >
                      <ExternalLink className="size-3" />
                      <span>Xem đoạn chat</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
