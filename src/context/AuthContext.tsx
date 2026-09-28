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

  // Rehydrate session on mount (handles page refresh)
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
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
