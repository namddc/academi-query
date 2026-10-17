import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authService, type AuthUser } from "@/services/authService";

// ── Types ────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogleProfile: (profile: any) => Promise<void>;
  logout: () => void;
}

// ── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate session on mount & theo dõi trạng thái khóa tài khoản Realtime
  useEffect(() => {
    const checkUserStatus = () => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Kiểm tra trong DB xem tài khoản có bị Admin khóa không
      const userInDb = authService.getUserById(currentUser.id);
      if (userInDb && userInDb.status === "blocked") {
        const lockMsg =
          userInDb.blockedReason ||
          "Tài khoản của bạn đã bị Quản trị viên tạm khóa. Vui lòng liên hệ Quản trị viên.";
        authService.logout();
        setUser(null);
        setIsLoading(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("ibot_lockout_message", lockMsg);
          // Buộc chuyển hướng ra màn hình đăng nhập
          window.location.href = "/auth?blocked=1";
        }
        return;
      }

      setUser(userInDb || currentUser);
      setIsLoading(false);
    };

    checkUserStatus();

    // Heartbeat kiểm tra định kỳ 1.5 giây và bắt sự kiện storage/custom
    const interval = setInterval(checkUserStatus, 1500);
    window.addEventListener("storage", checkUserStatus);
    window.addEventListener("ibot_user_status_changed", checkUserStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", checkUserStatus);
      window.removeEventListener("ibot_user_status_changed", checkUserStatus);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const authUser = authService.login(email, password);
    setUser(authUser);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const authUser = authService.register(name, email, password);
    setUser(authUser);
  }, []);

  const loginWithGoogleProfile = useCallback(async (profile: any) => {
    const authUser = authService.loginWithGoogleProfile(profile);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        loginWithGoogleProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used inside <AuthProvider>");
  }
  return ctx;
}
