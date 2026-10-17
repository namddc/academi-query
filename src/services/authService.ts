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
  mssv?: string;
  faculty?: string;
  status?: "active" | "blocked";
  blockedReason?: string;
  blockedAt?: string;
  createdAt?: string;
}

interface StoredUser extends AuthUser {
  password: string;
}

interface Session {
  user: AuthUser;
  token: string;
}

// ── Seed the default accounts ───────────────────────────────
const DEFAULT_STUDENT: StoredUser = {
  id: "1",
  name: "Sinh viên Demo",
  email: "admin@student.edu",
  password: "123456",
  avatar: null,
  mssv: "23020001",
  faculty: "Công nghệ Thông tin",
  status: "active",
  createdAt: "2026-09-01T08:00:00.000Z",
};

const MASTER_ADMIN: StoredUser = {
  id: "admin_master",
  name: "Nam Nguyễn",
  email: "namnam281205@gmail.com",
  password: "adminPassword123",
  avatar: null,
  mssv: "ADMIN-01",
  faculty: "Ban Quản trị AI",
  status: "active",
  createdAt: "2026-08-15T08:00:00.000Z",
};

function getStoredUsers(): StoredUser[] {
  if (typeof window === "undefined") return [MASTER_ADMIN, DEFAULT_STUDENT];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const users: StoredUser[] = raw ? JSON.parse(raw) : [];
    
    // Luôn đảm bảo Master Admin tồn tại
    if (!users.some((u) => u.email.toLowerCase() === MASTER_ADMIN.email.toLowerCase())) {
      users.unshift(MASTER_ADMIN);
    }
    // Luôn đảm bảo Default Student tồn tại
    if (!users.some((u) => u.email.toLowerCase() === DEFAULT_STUDENT.email.toLowerCase())) {
      users.push(DEFAULT_STUDENT);
    }
    return users;
  } catch {
    return [MASTER_ADMIN, DEFAULT_STUDENT];
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

    if (user.status === "blocked") {
      throw new Error("Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.");
    }

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

    if (user.status === "blocked") {
      const reason = user.blockedReason || "Tài khoản của bạn đã bị Quản trị viên tạm khóa do vi phạm quy chế.";
      throw new Error(reason);
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

  /** Kiểm tra xem user có quyền quản trị viên không (chỉ namnam281205@gmail.com) */
  isAdmin(user?: AuthUser | null): boolean {
    const targetUser = user !== undefined ? user : this.getCurrentUser();
    return targetUser?.email?.trim().toLowerCase() === "namnam281205@gmail.com";
  },

  /** Lấy danh sách toàn bộ người dùng trong hệ thống (dành cho Admin) */
  getAllUsers(): AuthUser[] {
    const stored = getStoredUsers();
    return stored.map(({ password: _p, ...u }) => u);
  },

  /** Lấy thông tin người dùng theo userId */
  getUserById(id: string): AuthUser | null {
    const users = this.getAllUsers();
    return users.find((u) => u.id === id) ?? null;
  },

  /** Khởi tạo các tài khoản sinh viên mẫu cho Admin kiểm tra đa người dùng */
  seedSampleUsers(sampleList: AuthUser[]): void {
    const users = getStoredUsers();
    let modified = false;
    for (const s of sampleList) {
      if (!users.some((u) => u.id === s.id || u.email.toLowerCase() === s.email.toLowerCase())) {
        users.push({
          ...s,
          password: "password123",
          status: s.status || "active",
          mssv: s.mssv || `2302${Math.floor(1000 + Math.random() * 9000)}`,
          faculty: s.faculty || "Công nghệ Thông tin",
          createdAt: s.createdAt || new Date().toISOString(),
        });
        modified = true;
      }
    }
    if (modified) saveStoredUsers(users);
  },

  /** Thêm người dùng mới (dành cho Admin) */
  createUser(data: {
    name: string;
    email: string;
    password?: string;
    mssv?: string;
    faculty?: string;
  }): AuthUser {
    const users = getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase())) {
      throw new Error("Email này đã tồn tại trong hệ thống");
    }

    const newUser: StoredUser = {
      id: generateToken(),
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password?.trim() || "123456",
      avatar: null,
      mssv: data.mssv?.trim() || `2302${Math.floor(1000 + Math.random() * 9000)}`,
      faculty: data.faculty?.trim() || "Công nghệ Thông tin",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveStoredUsers(users);
    const { password: _p, ...authUser } = newUser;
    return authUser;
  },

  /** Cập nhật thông tin người dùng */
  updateUser(id: string, updates: Partial<StoredUser>): AuthUser | null {
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    users[idx] = { ...users[idx], ...updates };
    saveStoredUsers(users);
    const { password: _p, ...authUser } = users[idx];
    return authUser;
  },

  /** Khóa hoặc Mở khóa tài khoản sinh viên kèm thông điệp/lý do */
  toggleUserStatus(
    id: string,
    reason?: string,
  ): { success: boolean; newStatus: "active" | "blocked"; reason?: string } {
    const users = getStoredUsers();
    const user = users.find((u) => u.id === id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      throw new Error("Không thể khóa tài khoản Quản trị viên tối cao");
    }

    const newStatus: "active" | "blocked" = user.status === "blocked" ? "active" : "blocked";
    user.status = newStatus;
    if (newStatus === "blocked") {
      user.blockedReason = reason || "Tài khoản của bạn đã bị Quản trị viên tạm khóa do vi phạm quy chế sử dụng.";
      user.blockedAt = new Date().toISOString();
    } else {
      delete user.blockedReason;
      delete user.blockedAt;
    }

    saveStoredUsers(users);

    // Kích hoạt buộc đăng xuất (Force Logout) ngay lập tức nếu user bị khóa đang có phiên
    if (typeof window !== "undefined") {
      try {
        const currentSessionRaw = localStorage.getItem(SESSION_KEY);
        if (currentSessionRaw) {
          const session = JSON.parse(currentSessionRaw);
          if (session?.user?.id === id && newStatus === "blocked") {
            localStorage.removeItem(SESSION_KEY);
            localStorage.setItem("ibot_lockout_message", user.blockedReason || "Tài khoản đã bị tạm khóa");
          }
        }
      } catch {
        // Ignore JSON error
      }

      const payload = {
        userId: id,
        status: newStatus,
        reason: user.blockedReason,
        timestamp: Date.now(),
      };
      localStorage.setItem("ibot_user_status_changed", JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent("ibot_user_status_changed", { detail: payload }));
      window.dispatchEvent(new Event("storage"));
    }

    return { success: true, newStatus, reason: user.blockedReason };
  },

  /** Đặt lại mật khẩu tài khoản */
  resetPassword(id: string, newPassword = "studentPassword123"): string {
    const users = getStoredUsers();
    const user = users.find((u) => u.id === id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    user.password = newPassword;
    saveStoredUsers(users);
    return newPassword;
  },

  /** Xóa tài khoản người dùng */
  deleteUser(id: string): boolean {
    const users = getStoredUsers();
    const user = users.find((u) => u.id === id);
    if (!user) return false;
    if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      throw new Error("Không thể xóa tài khoản Quản trị viên tối cao");
    }

    const filtered = users.filter((u) => u.id !== id);
    saveStoredUsers(filtered);
    return true;
  },

  /** Xuất danh sách người dùng ra CSV */
  exportUsersCSV(): void {
    const users = this.getAllUsers();
    const headers = ["ID", "Ho va Ten", "Email", "MSSV", "Khoa / Vien", "Trang thai", "Ngay tao"];
    const rows = users.map((u) => [
      u.id,
      `"${u.name}"`,
      u.email,
      u.mssv || "N/A",
      `"${u.faculty || "N/A"}"`,
      u.status || "active",
      u.createdAt || "N/A",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ibot_users_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export const ADMIN_EMAIL = "namnam281205@gmail.com";
