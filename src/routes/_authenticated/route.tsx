import { createFileRoute, Outlet } from "@tanstack/react-router";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    // Skip auth check on the server since localStorage isn't available
    if (typeof window === "undefined") {
      return { user: null, isGuest: true };
    }

    // Allow guests — they get a limited experience (no history saved)
    const user = authService.getCurrentUser();
    return { user, isGuest: user === null };
  },
  component: () => <Outlet />,
});
