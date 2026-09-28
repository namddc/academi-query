import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import type { AuthUser } from "@/services/authService";

// ── Main hook ─────────────────────────────────────────────────

export interface UseAuthReturn {
  /** Currently authenticated user, or null */
  user: AuthUser | null;
  /** True when a session exists */
  isAuthenticated: boolean;
  /** True while rehydrating session from localStorage */
  isLoading: boolean;
  /** Sign in – throws with a Vietnamese error message on failure */
  login: (email: string, password: string) => Promise<void>;
  /** Register – throws with a Vietnamese error message on failure */
  register: (name: string, email: string, password: string) => Promise<void>;
  /** Sign in with Google Profile object */
  loginWithGoogleProfile: (profile: any) => Promise<void>;
  /** Sign out and navigate to /auth */
  signOut: () => void;
}

export function useAuth(): UseAuthReturn {
  const { user, isAuthenticated, isLoading, login, register, loginWithGoogleProfile, logout } = useAuthContext();
  const navigate = useNavigate();

  const signOut = useCallback(() => {
    logout();
    navigate({ to: "/auth" });
  }, [logout, navigate]);

  return { user, isAuthenticated, isLoading, login, register, loginWithGoogleProfile, signOut };
}
