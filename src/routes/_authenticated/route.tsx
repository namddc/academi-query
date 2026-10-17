import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    // Skip auth check on the server since localStorage isn't available
    if (typeof window === "undefined") {
      return { user: null };
    }

    const user = authService.getCurrentUser();
    if (!user) {
      throw redirect({ to: "/auth" });
    }

    const userInDb = authService.getUserById(user.id);
    if (userInDb && userInDb.status === "blocked") {
      authService.logout();
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "ibot_lockout_message",
          userInDb.blockedReason || "Tài khoản của bạn đã bị Quản trị viên tạm khóa.",
        );
      }
      throw redirect({ to: "/auth" });
    }

    return { user: userInDb || user };
  },
  component: () => <Outlet />,
});
