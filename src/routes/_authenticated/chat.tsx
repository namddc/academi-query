import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar, MobileTopBar } from "@/components/chat/Sidebar";
import { InfoPanel } from "@/components/chat/ChatWindow";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <MobileTopBar onMenuOpen={() => setMobileOpen(true)} />
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
