import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useThreads } from "@/hooks/useThreads";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const [search, setSearch] = useState("");
  const { user, signOut } = useAuth();
  const { threads, createThread, renameThread, deleteThread } = useThreads();

  // ── Inline rename state ───────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (!editingId) return;
    if (editValue.trim()) {
      renameThread(editingId, editValue.trim());
      toast.success("Đã đổi tên cuộc trò chuyện");
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  // ── Actions ───────────────────────────────────────────────

  const handleNewChat = () => {
    const thread = createThread();
    navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    onMobileClose();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Xóa cuộc trò chuyện này?")) return;
    deleteThread(id);
    if (params.threadId === id) navigate({ to: "/chat" });
    toast.success("Đã xóa cuộc trò chuyện");
  };

  // ── Filter ────────────────────────────────────────────────

  const filtered = threads.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Content ───────────────────────────────────────────────

  const content = (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-72",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 h-16 border-b border-sidebar-border",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="size-9 shrink-0 rounded-xl bg-primary text-primary-foreground grid place-items-center">
          <GraduationCap className="size-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">Trợ lý SV AI</div>
            <div className="text-[11px] text-muted-foreground truncate">University Assistant</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="size-8 hidden lg:flex shrink-0"
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      {/* New chat */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          className={cn(
            "w-full rounded-xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium",
            collapsed && "px-0",
          )}
        >
          <Plus className="size-4 shrink-0" />
          {!collapsed && <span>Cuộc trò chuyện mới</span>}
        </Button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm trong lịch sử..."
              className="pl-9 h-9 rounded-xl bg-card/60 border-sidebar-border"
            />
          </div>
        </div>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
        {!collapsed && (
          <div className="px-3 pt-3 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Lịch sử trò chuyện
          </div>
        )}
        <ul className="space-y-0.5">
          {filtered.length === 0 && !collapsed && (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">
              {search ? "Không tìm thấy cuộc trò chuyện nào." : "Chưa có cuộc trò chuyện nào."}
            </li>
          )}
          {filtered.map((t) => {
            const active = params.threadId === t.id;
            const isEditing = editingId === t.id;

            return (
              <li key={t.id} className="group relative">
                {/* Rename mode */}
                {isEditing && !collapsed ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <Input
                      ref={editRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="h-8 rounded-lg text-sm flex-1"
                    />
                    <button
                      onClick={commitEdit}
                      className="size-7 grid place-items-center rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Lưu"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="size-7 grid place-items-center rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Hủy"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Normal mode */
                  <>
                    <Link
                      to="/chat/$threadId"
                      params={{ threadId: t.id }}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/60",
                        collapsed && "justify-center px-2",
                      )}
                      title={t.title}
                    >
                      <MessageSquare className="size-4 shrink-0 opacity-70" />
                      {!collapsed && <span className="truncate flex-1">{t.title}</span>}
                    </Link>

                    {/* Action buttons (only when not collapsed) */}
                    {!collapsed && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        {/* Rename */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEdit(t.id, t.title);
                          }}
                          className="size-7 rounded-lg grid place-items-center hover:bg-primary/10 hover:text-primary transition-all"
                          aria-label="Đổi tên"
                          title="Đổi tên"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={(e) => handleDelete(e, t.id)}
                          className="size-7 rounded-lg grid place-items-center hover:bg-destructive/10 hover:text-destructive transition-all"
                          aria-label="Xóa"
                          title="Xóa"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* User footer */}
      <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 hover:bg-sidebar-accent/60 transition-colors",
            collapsed && "justify-center",
          )}
        >
          <div className="size-9 shrink-0 rounded-xl bg-secondary text-secondary-foreground grid place-items-center font-semibold text-sm overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0]?.toUpperCase() ?? "S"
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.name ?? "Sinh viên"}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="size-8 text-muted-foreground hover:text-destructive"
              title="Đăng xuất"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex">{content}</div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 transition-opacity",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onMobileClose} />
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {content}
        </div>
      </div>
    </>
  );
}

export function MobileTopBar({ onMenuOpen, title }: { onMenuOpen: () => void; title?: string }) {
  return (
    <header className="lg:hidden flex items-center gap-3 h-14 px-3 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
      <Button variant="ghost" size="icon" onClick={onMenuOpen}>
        <Menu className="size-5" />
      </Button>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground grid place-items-center">
          <GraduationCap className="size-4" />
        </div>
        <div className="font-semibold truncate">{title ?? "Trợ lý Sinh viên AI"}</div>
      </div>
    </header>
  );
}
