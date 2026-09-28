// ============================================================
//  authService.ts  –  Mock authentication (localStorage only)
// ============================================================

const SESSION_KEY = "academi_session";
const USERS_KEY = "academi_users";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface StoredUser extends AuthUser {
  password: string;
}

interface Session {
  user: AuthUser;
  token: string;
}

// ── Seed the default admin account ──────────────────────────
const DEFAULT_USER: StoredUser = {
  id: "1",
  name: "Sinh viên Demo",
  email: "admin@student.edu",
  password: "123456",
  avatar: null,
};

function getStoredUsers(): StoredUser[] {
  if (typeof window === "undefined") return [DEFAULT_USER];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const users: StoredUser[] = raw ? JSON.parse(raw) : [];
    // Always ensure the default user exists
    const hasDefault = users.some((u) => u.email === DEFAULT_USER.email);
    if (!hasDefault) users.push(DEFAULT_USER);
    return users;
  } catch {
    return [DEFAULT_USER];
  }
}

function saveStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Public API ───────────────────────────────────────────────

export const authService = {
  /** Sign in with email + password. Throws on failure. */
  login(email: string, password: string): AuthUser {
    if (!email || !password) throw new Error("Vui lòng nhập đầy đủ thông tin");

    const users = getStoredUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!user) throw new Error("Sai email hoặc mật khẩu");

    const { password: _p, ...authUser } = user;
    const session: Session = { user: authUser, token: generateToken() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return authUser;
  },

  /** Register a new account. Throws on validation failure. */
  register(name: string, email: string, password: string): AuthUser {
    if (!email) throw new Error("Email không được để trống");
    if (!password || password.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự");

    const users = getStoredUsers();
    const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error("Email này đã được đăng ký");

    const newUser: StoredUser = {
      id: generateToken(),
      name: name || email.split("@")[0],
      email,
      password,
      avatar: null,
    };
    users.push(newUser);
    saveStoredUsers(users);

    const { password: _p, ...authUser } = newUser;
    const session: Session = { user: authUser, token: generateToken() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return authUser;
  },

  /** Google Login - processes the fetched Google profile */
  loginWithGoogleProfile(profile: any): AuthUser {
    const email = profile.email;
    const name = profile.name;
    const picture = profile.picture;
    const googleId = profile.sub;

    const users = getStoredUsers();
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Auto-register
      user = {
        id: googleId,
        name: name || email.split("@")[0],
        email: email,
        password: generateToken(), // not used for Google users
        avatar: picture || null,
      };
      users.push(user);
      saveStoredUsers(users);
    } else {
      // Update avatar/name if changed
      user.name = name || user.name;
      user.avatar = picture || user.avatar;
      saveStoredUsers(users);
    }

    const { password: _p, ...authUser } = user;
    const session: Session = { user: authUser, token: generateToken() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return authUser;
  },

  /** Sign out – clears session from localStorage. */
  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  /** Returns the current user or null. */
  getCurrentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session: Session = JSON.parse(raw);
      return session?.user ?? null;
    } catch {
      return null;
    }
  },

  /** Returns true when a valid session exists. */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },
};
