import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    // Skip auth check on the server since localStorage isn't available
    if (typeof window === "undefined") {
      return { user: null };
    }

    // Use mock auth on client
    const user = authService.getCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
