import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    // Use mock auth – no network call needed
    const user = authService.getCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
