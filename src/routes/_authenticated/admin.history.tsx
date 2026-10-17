import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { threadService, type Thread, type StoredMessage } from "@/services/threadService";
import { authService, type AuthUser } from "@/services/authService";
import {
  MessageSquareText,
  Clock,
  Search,
  ExternalLink,
  Calendar,
  User,
  Users,
  Sparkles,
  Bot,
  Trash2,
  Filter,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Shield,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/history")({
  head: () => ({
    meta: [
      { title: "Lịch sử Hội thoại Toàn bộ User | iBot Admin" },
      { name: "description", content: "Xem và giám sát toàn bộ cuộc trò chuyện của sinh viên với iBot." },
    ],
  }),
  component: AdminHistoryPage,
});

export function AdminHistoryPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const loadData = () => {
    try {
      // 1. Luôn tự động seed hội thoại mẫu nếu hệ thống chưa có hội thoại nào
      const currentList = threadService.listThreads();
      if (currentList.length === 0) {
        threadService.seedSampleThreads();
      }

      const allThreads = threadService.listThreads();
      const allUsers = authService.getAllUsers();
      setThreads(allThreads);
      setUsers(allUsers);

      // Mặc định chọn thread đầu tiên nếu chưa chọn
      if (!selectedThreadId && allThreads.length > 0) {
        setSelectedThreadId(allThreads[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("academi_threads_updated", loadData);
    window.addEventListener("storage", loadData);
    return () => {
      window.removeEventListener("academi_threads_updated", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, []);

  // Map thông tin User cho từng thread
  const enrichedThreads = useMemo(() => {
    return threads.map((t) => {
      const matchedUser = users.find((u) => u.id === t.userId || u.email === t.userEmail);
      return {
        ...t,
        authorName: t.userName || matchedUser?.name || `Sinh viên (${t.userId.slice(0, 6)})`,
        authorEmail: t.userEmail || matchedUser?.email || "student@university.edu.vn",
        authorAvatar: matchedUser?.avatar || null,
        messageCount: threadService.getMessages(t.id).length,
      };
    });
  }, [threads, users]);

  // Danh sách users duy nhất có trong threads
  const uniqueUsersInThreads = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    for (const t of enrichedThreads) {
      if (!map.has(t.userId)) {
        map.set(t.userId, {
          id: t.userId,
          name: t.authorName,
          email: t.authorEmail,
        });
      }
    }
    return Array.from(map.values());
  }, [enrichedThreads]);

  // Lọc theo search và theo user
  const filteredThreads = useMemo(() => {
    return enrichedThreads.filter((t) => {
      const matchUser = selectedUserId === "ALL" || t.userId === selectedUserId;
      const q = search.trim().toLowerCase();
      if (!q) return matchUser;

      const matchTitle = t.title.toLowerCase().includes(q);
      const matchAuthor = t.authorName.toLowerCase().includes(q) || t.authorEmail.toLowerCase().includes(q);
      
      // Tìm sâu cả trong nội dung tin nhắn
      const msgs = threadService.getMessages(t.id);
      const matchContent = msgs.some((m) =>
        m.parts.some((p) => p.type === "text" && p.text.toLowerCase().includes(q)),
      );

      return matchUser && (matchTitle || matchAuthor || matchContent);
    });
  }, [enrichedThreads, selectedUserId, search]);

  const selectedThread = enrichedThreads.find((t) => t.id === selectedThreadId);
  const selectedMessages: StoredMessage[] = selectedThread
    ? threadService.getMessages(selectedThread.id)
    : [];

  const handleSeedSample = () => {
    threadService.seedSampleThreads();
    loadData();
    toast.success("Đã nạp các cuộc hội thoại mẫu từ nhiều sinh viên khác nhau!");
  };

  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa phiên hội thoại này của sinh viên?")) {
      threadService.deleteThread(threadId);
      loadData();
      if (selectedThreadId === threadId) {
        setSelectedThreadId(null);
      }
      toast.success("Đã xóa cuộc hội thoại");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card/90 to-primary/5 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold">
              <Shield className="size-3.5 mr-1" /> Giám sát Đa Người Dùng
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Quyền Quản trị viên Toàn quyền
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
            <MessageSquareText className="size-5 text-primary" />
            Lịch sử Cuộc trò chuyện Toàn bộ Sinh viên
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Theo dõi, tìm kiếm và kiểm tra toàn bộ nội dung hỏi đáp của tất cả các tài khoản sinh viên với trợ lý iBot.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={handleSeedSample}
            className="rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs gap-1.5 h-9"
            title="Thêm các cuộc hội thoại mẫu từ các sinh viên Lê Minh Quân, Trần Thị Phương Thảo, v.v."
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>Nạp hội thoại mẫu của sinh viên</span>
          </Button>

          <Badge variant="outline" className="h-9 px-3 text-xs font-mono border-border bg-card">
            Tổng cộng: <strong className="text-foreground ml-1">{enrichedThreads.length}</strong> phiên
          </Badge>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/70 bg-card shadow-soft">
        {/* User filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1 lg:pb-0">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
            <Users className="size-3.5" /> Lọc sinh viên:
          </span>
          <button
            onClick={() => setSelectedUserId("ALL")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all",
              selectedUserId === "ALL"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:text-foreground",
            )}
          >
            Tất cả ({enrichedThreads.length})
          </button>
          {uniqueUsersInThreads.map((u) => {
            const count = enrichedThreads.filter((t) => t.userId === u.id).length;
            return (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                  selectedUserId === u.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{u.name}</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  selectedUserId === u.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tiêu đề, sinh viên hoặc nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl border-border bg-muted/20 text-xs"
          />
        </div>
      </div>

      {/* ── Master-Detail Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Thread List (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-semibold text-foreground">
              Danh sách phiên ({filteredThreads.length})
            </span>
            <span>Sắp xếp: Mới nhất</span>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto scrollbar-thin pr-1">
            {filteredThreads.length > 0 ? (
              filteredThreads.map((t) => {
                const isSelected = selectedThreadId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedThreadId(t.id)}
                    className={cn(
                      "group relative p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-2",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-card border-border/70 hover:border-primary/40 hover:bg-muted/30 shadow-soft",
                    )}
                  >
                    {/* Header: User Info */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-7 rounded-lg bg-gradient-to-br from-primary/80 to-blue-600 text-primary-foreground grid place-items-center font-bold text-xs shrink-0">
                          {t.authorName[0]?.toUpperCase() || "S"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {t.authorName}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {t.authorEmail}
                          </div>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                        {t.messageCount} tin
                      </Badge>
                    </div>

                    {/* Thread Title */}
                    <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                      {t.title}
                    </h4>

                    {/* Footer: Date & Actions */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/40">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="size-3" />
                        {new Date(t.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDeleteThread(t.id, e)}
                          className="size-6 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground/60 transition-colors grid place-items-center"
                          title="Xóa phiên hội thoại này"
                        >
                          <Trash2 className="size-3" />
                        </button>
                        <ChevronRight className={cn(
                          "size-3.5 transition-transform",
                          isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground/40",
                        )} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 p-4 rounded-2xl border border-dashed border-border bg-muted/10 text-xs text-muted-foreground space-y-2">
                <p>Không tìm thấy cuộc trò chuyện nào phù hợp.</p>
                <Button size="sm" variant="outline" onClick={handleSeedSample} className="text-xs">
                  Nạp hội thoại mẫu
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dialogue Inspector (7 cols on lg) */}
        <div className="lg:col-span-7 sticky top-20">
          <Card className="rounded-2xl border-border/70 bg-card shadow-soft overflow-hidden">
            {selectedThread ? (
              <>
                {/* Inspector Header */}
                <CardHeader className="p-4 md:p-5 border-b border-border/70 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground grid place-items-center font-bold text-sm shrink-0 shadow-xs">
                        {selectedThread.authorName[0]?.toUpperCase() || "S"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                          <span>{selectedThread.authorName}</span>
                          <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-md bg-primary/10 text-primary font-mono">
                            Sinh viên
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {selectedThread.authorEmail}
                        </div>
                      </div>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-8 text-xs gap-1.5 border-border shrink-0"
                    >
                      <a href={`/chat/${selectedThread.id}`} target="_blank" rel="noreferrer">
                        <span>Mở màn hình Chat</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-background border border-border/60">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Chủ đề cuộc trò chuyện
                    </div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">
                      {selectedThread.title}
                    </div>
                  </div>
                </CardHeader>

                {/* Inspector Messages Stream */}
                <CardContent className="p-4 md:p-5 max-h-[560px] overflow-y-auto scrollbar-thin space-y-4">
                  {selectedMessages.length > 0 ? (
                    selectedMessages.map((msg, idx) => {
                      const isUser = msg.role === "user";
                      const text = msg.parts
                        .filter((p) => p.type === "text")
                        .map((p: any) => p.text)
                        .join("");

                      return (
                        <div
                          key={msg.id || idx}
                          className={cn(
                            "flex gap-3",
                            isUser ? "justify-end" : "justify-start",
                          )}
                        >
                          {!isUser && (
                            <div className="size-8 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0 mt-0.5">
                              <Bot className="size-4" />
                            </div>
                          )}

                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-1.5 shadow-xs",
                              isUser
                                ? "bg-primary text-primary-foreground rounded-tr-xs"
                                : "bg-muted/40 border border-border/70 text-foreground rounded-tl-xs",
                            )}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                              <span className="font-semibold">
                                {isUser ? selectedThread.authorName : "Trợ lý Sinh viên iBot"}
                              </span>
                              <span className="font-mono">
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }) : ""}
                              </span>
                            </div>

                            <div className="whitespace-pre-wrap">{text}</div>

                            {!isUser && (
                              <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <CheckCircle2 className="size-3" />
                                  Phản hồi RAG hoàn tất
                                </span>
                                <span className="font-mono opacity-80">
                                  Hệ tri thức Trường
                                </span>
                              </div>
                            )}
                          </div>

                          {isUser && (
                            <div className="size-8 rounded-xl bg-secondary text-secondary-foreground grid place-items-center font-bold text-xs shrink-0 mt-0.5">
                              {selectedThread.authorName[0]?.toUpperCase() || "S"}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 text-xs text-muted-foreground">
                      Phiên hội thoại này chưa có tin nhắn nào.
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                <MessageCircle className="size-8 mx-auto text-muted-foreground/40" />
                <p>Chọn một cuộc trò chuyện từ danh sách bên trái để xem chi tiết hội thoại.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
