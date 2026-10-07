import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar, MobileTopBar } from "@/components/chat/Sidebar";
import { InfoPanel } from "@/components/chat/ChatWindow";
import { Route as AuthenticatedRoute } from "@/routes/_authenticated/route";
import { LogIn, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatLayout,
});

function GuestBanner() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-sm shrink-0">
      <div className="flex items-center gap-2 text-primary font-medium">
        <History className="size-4 shrink-0" />
        <span>Bạn đang dùng chế độ khách — lịch sử sẽ bị xoá khi tải lại trang.</span>
      </div>
      <Link
        to="/auth"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0"
      >
        <LogIn className="size-3.5" />
        Đăng nhập để lưu
      </Link>
    </div>
  );
}

function ChatLayout() {
  const { isGuest } = AuthenticatedRoute.useRouteContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Guests don't see the history sidebar */}
      {!isGuest && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}
      <div className="flex flex-col flex-1 min-w-0">
        {isGuest ? (
          <GuestBanner />
        ) : (
          <MobileTopBar onMenuOpen={() => setMobileOpen(true)} />
        )}
        <main className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-w-0 flex flex-col">
            <Outlet />
          </div>
          <InfoPanel />
        </main>
      </div>
    </div>
  );
}

export { useNavigate };
