import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar, MobileTopBar } from "@/components/chat/Sidebar";
import { InfoPanel } from "@/components/chat/ChatWindow";
import { Route as AuthenticatedRoute } from "@/routes/_authenticated/route";
import { LogIn, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatLayout,
});

function GuestHeader() {
  return (
    <header
      className="shrink-0 flex items-center justify-between px-5 py-3 border-b"
      style={{
        background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)",
        borderColor: "hsl(var(--border))",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div
          className="size-8 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)" }}
        >
          <GraduationCap className="size-4 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-foreground">Trợ lý Sinh viên AI</p>
          <p className="text-[10px] text-muted-foreground">Phiên không lưu · NAM-NGKH</p>
        </div>
      </div>

      {/* Login CTA */}
      <Link
        to="/auth"
        className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:scale-105 hover:shadow-md active:scale-95"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.85) 100%)",
        }}
      >
        <LogIn className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        Đăng nhập
      </Link>
    </header>
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
          <GuestHeader />
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
