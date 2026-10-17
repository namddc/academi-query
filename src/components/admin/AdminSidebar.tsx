import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { analyticsService } from "@/services/analyticsService";
import {
  LayoutDashboard,
  BarChart3,
  Database,
  MessageSquareText,
  Settings,
  Users,
  ArrowLeft,
  PanelLeft,
  PanelLeftClose,
  ShieldCheck,
  Activity,
  LogOut,
  Sparkles,
  Bot,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: "TỔNG QUAN & BÁO CÁO",
    items: [
      {
        to: "/admin/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        to: "/admin/analytics",
        label: "Phân tích RAG",
        icon: BarChart3,
        badge: "Realtime",
        badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
      },
    ],
  },
  {
    groupTitle: "DỮ LIỆU & TRI THỨC",
    items: [
      {
        to: "/admin/faq",
        label: "Cơ sở dữ liệu FAQ",
        icon: Database,
        badge: "100+",
        badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      },
      {
        to: "/admin/history",
        label: "Lịch sử Hội thoại",
        icon: MessageSquareText,
      },
      {
        to: "/admin/users",
        label: "Quản lý Sinh viên",
        icon: Users,
        badge: "Tài khoản",
        badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
      },
    ],
  },
  {
    groupTitle: "CẤU HÌNH",
    items: [
      {
        to: "/admin/settings",
        label: "Cấu hình Hệ thống",
        icon: Settings,
      },
    ],
  },
];

export function AdminSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: AdminSidebarProps) {
  const { user, logout } = useAuthContext();
  const location = useLocation();
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setEventCount(analyticsService.getCount());
    };
    updateCount();

    window.addEventListener("ibot_analytics_updated", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("ibot_analytics_updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  const content = (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      {/* Brand & Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 h-16 border-b border-sidebar-border/80 bg-sidebar/50 backdrop-blur-sm",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="relative flex items-center justify-center size-9 shrink-0 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-blue-600 text-primary-foreground shadow-md shadow-primary/20">
          <ShieldCheck className="size-5" />
          <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
          </span>
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-sidebar-foreground">
                iBot Admin
              </span>
              <span className="px-1.5 py-0.2 rounded-md bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-wider">
                Insight
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Hệ thống Quản trị & Analytics
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="size-8 hidden lg:flex shrink-0 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      {/* Quick Action: Back to Chat */}
      <div className="p-3">
        <Link
          to="/chat"
          onClick={onMobileClose}
          className={cn(
            "group flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium border border-border/60 bg-card/60 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all duration-200 text-muted-foreground",
            collapsed && "justify-center px-0 py-2.5",
          )}
          title="Quay lại Giao diện Chat"
        >
          <ArrowLeft className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
          {!collapsed && (
            <div className="flex items-center justify-between flex-1">
              <span>Quay lại Chat</span>
              <Bot className="size-3.5 opacity-60 group-hover:opacity-100" />
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-5 py-2">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">
                {group.groupTitle}
              </div>
            )}
            <nav className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (item.to === "/admin/dashboard" && location.pathname === "/admin");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onMobileClose}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/80",
                      collapsed && "justify-center px-2 py-2.5",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-foreground rounded-r-full" />
                    )}
                    <Icon className={cn("size-4 shrink-0", isActive && "text-primary-foreground")} />
                    {!collapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                            : item.badgeColor || "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Live System Health Card */}
      {!collapsed ? (
        <div className="p-3 border-t border-sidebar-border/80">
          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-3 shadow-soft space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <Activity className="size-3 text-emerald-500" />
                Hệ thống RAG
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground flex justify-between items-center">
              <span>Model AI:</span>
              <span className="font-mono font-medium text-foreground text-[10px]">Gemma 27B</span>
            </div>
            <div className="text-[11px] text-muted-foreground flex justify-between items-center">
              <span>Events ghi nhận:</span>
              <span className="font-semibold text-primary">{eventCount}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-sidebar-border/80 flex justify-center" title={`Online - ${eventCount} events`}>
          <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-500 grid place-items-center">
            <Activity className="size-4 animate-pulse" />
          </div>
        </div>
      )}

      {/* User Footer */}
      <div className={cn("border-t border-sidebar-border/80 p-3", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 hover:bg-sidebar-accent/60 transition-colors",
            collapsed && "justify-center p-1",
          )}
        >
          <div className="size-9 shrink-0 rounded-xl bg-gradient-to-br from-secondary/80 to-secondary text-secondary-foreground grid place-items-center font-bold text-sm overflow-hidden shadow-xs">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0]?.toUpperCase() ?? "A"
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate text-foreground">
                {user?.name ?? "Quản trị viên"}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Đăng xuất"
            >
              <LogOut className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex shrink-0">{content}</aside>

      {/* Mobile Drawer */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 transition-opacity duration-200",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <div
          className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          onClick={onMobileClose}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-transform duration-300 ease-out shadow-2xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {content}
        </div>
      </div>
    </>
  );
}
