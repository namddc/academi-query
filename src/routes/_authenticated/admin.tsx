import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { authService } from "@/services/authService";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => {
    // Chỉ chạy ở client side (do auth dùng localStorage)
    if (typeof window === "undefined") return;
    const user = authService.getCurrentUser();
    if (!user || !authService.isAdmin(user)) {
      throw redirect({ to: "/chat" });
    }
  },
  head: () => ({
    meta: [
      { title: "Bảng Quản trị & Analytics | iBot" },
      {
        name: "description",
        content: "Hệ thống quản trị, theo dõi độ trễ, tầng RAG và báo cáo hiệu suất iBot.",
      },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground antialiased">
      {/* Admin Sidebar */}
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminTopBar onMenuOpen={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto scrollbar-thin bg-muted/10 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
