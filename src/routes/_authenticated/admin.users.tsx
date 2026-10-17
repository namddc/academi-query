import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { authService, type AuthUser, ADMIN_EMAIL } from "@/services/authService";
import { threadService } from "@/services/threadService";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  GraduationCap,
  Download,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Building,
  IdCard,
  Mail,
  Calendar,
  Sparkles,
  RefreshCw,
  X,
  Edit,
  Copy,
  AlertOctagon,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Quản lý Người dùng & Sinh viên | iBot Admin" },
      { name: "description", content: "Quản lý danh sách tài khoản, MSSV, trạng thái hoạt động và quyền truy cập." },
    ],
  }),
  component: AdminUsersPage,
});

const PRESET_LOCK_REASONS = [
  "Vi phạm tiêu chuẩn hỏi đáp (Spam câu hỏi hoặc truy vấn nội dung không phù hợp)",
  "Tạm dừng tài khoản theo yêu cầu của Phòng Đào tạo / Ban Thanh tra",
  "Nghi vấn chia sẻ tài khoản cho người ngoài trường sử dụng",
  "Chưa hoàn tất thủ tục cập nhật hồ sơ và xác thực sinh viên",
];

function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "STUDENT">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "blocked">("ALL");

  // State cho Modal Khóa tài khoản
  const [lockTargetUser, setLockTargetUser] = useState<AuthUser | null>(null);
  const [lockReason, setLockReason] = useState(PRESET_LOCK_REASONS[0]);

  // State cho Modal Đặt lại Mật khẩu
  const [resetTargetUser, setResetTargetUser] = useState<AuthUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState("123456");

  // State cho Modal Thêm sinh viên mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMssv, setNewMssv] = useState("");
  const [newFaculty, setNewFaculty] = useState("Công nghệ Thông tin");
  const [newInitialPass, setNewInitialPass] = useState("123456");

  // State cho Modal Chỉnh sửa sinh viên
  const [editUser, setEditUser] = useState<AuthUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMssv, setEditMssv] = useState("");
  const [editFaculty, setEditFaculty] = useState("");

  // State cho Modal Chi tiết sinh viên
  const [detailUser, setDetailUser] = useState<AuthUser | null>(null);

  const loadUsers = () => {
    try {
      const all = authService.getAllUsers();
      setUsers(all);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUsers();
    window.addEventListener("storage", loadUsers);
    window.addEventListener("ibot_user_status_changed", loadUsers);
    return () => {
      window.removeEventListener("storage", loadUsers);
      window.removeEventListener("ibot_user_status_changed", loadUsers);
    };
  }, []);

  // Tính toán KPI người dùng
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status !== "blocked").length;
    const blocked = users.filter((u) => u.status === "blocked").length;
    const allThreads = threadService.listThreads();
    const totalThreads = allThreads.length;

    return { total, active, blocked, totalThreads };
  }, [users]);

  // Lọc danh sách sinh viên
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const isAdmin = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (roleFilter === "ADMIN" && !isAdmin) return false;
      if (roleFilter === "STUDENT" && isAdmin) return false;

      const userStatus = u.status || "active";
      if (statusFilter !== "ALL" && userStatus !== statusFilter) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchMssv = u.mssv?.toLowerCase().includes(q) || false;
      const matchFaculty = u.faculty?.toLowerCase().includes(q) || false;

      return matchName || matchEmail || matchMssv || matchFaculty;
    });
  }, [users, roleFilter, statusFilter, search]);

  // Xử lý Tạm khóa kèm Lý do & Buộc Logout
  const handleConfirmLock = () => {
    if (!lockTargetUser) return;
    try {
      const res = authService.toggleUserStatus(lockTargetUser.id, lockReason);
      loadUsers();
      toast.error(
        `Đã TẠM KHÓA tài khoản ${lockTargetUser.name}!`,
        {
          description: `Thông điệp: "${lockReason}". Tài khoản đã bị BUỘC ĐĂNG XUẤT ngay lập tức.`,
          duration: 6000,
        },
      );
      setLockTargetUser(null);
    } catch (err: any) {
      toast.error(err.message || "Không thể khóa tài khoản");
    }
  };

  // Xử lý Mở khóa tài khoản
  const handleUnlock = (user: AuthUser) => {
    try {
      authService.toggleUserStatus(user.id);
      loadUsers();
      toast.success(`Đã MỞ KHÓA tài khoản cho sinh viên "${user.name}"!`, {
        description: "Sinh viên có thể đăng nhập và trò chuyện bình thường trở lại.",
      });
    } catch (err: any) {
      toast.error(err.message || "Không thể mở khóa tài khoản");
    }
  };

  // Xử lý Đặt lại Mật khẩu
  const handleConfirmResetPassword = () => {
    if (!resetTargetUser) return;
    try {
      authService.resetPassword(resetTargetUser.id, newPasswordVal);
      navigator.clipboard.writeText(newPasswordVal);
      toast.success(`Đã đổi mật khẩu cho ${resetTargetUser.email}!`, {
        description: `Mật khẩu mới: "${newPasswordVal}" (Đã tự động sao chép vào Clipboard).`,
      });
      setResetTargetUser(null);
    } catch (err: any) {
      toast.error(err.message || "Không thể đổi mật khẩu");
    }
  };

  // Mở modal sửa thông tin
  const handleStartEdit = (user: AuthUser) => {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditMssv(user.mssv || "");
    setEditFaculty(user.faculty || "Công nghệ Thông tin");
  };

  // Lưu chỉnh sửa thông tin
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      authService.updateUser(editUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        mssv: editMssv.trim(),
        faculty: editFaculty.trim(),
      });
      loadUsers();
      toast.success("Cập nhật thông tin sinh viên thành công!");
      setEditUser(null);
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật thông tin");
    }
  };

  // Tạo sinh viên mới
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.error("Vui lòng nhập họ tên và email sinh viên");
      return;
    }

    try {
      authService.createUser({
        name: newName,
        email: newEmail,
        mssv: newMssv,
        faculty: newFaculty,
        password: newInitialPass,
      });

      toast.success("Thêm sinh viên thành công!", {
        description: `Tài khoản ${newEmail} đã sẵn sàng đăng nhập.`,
      });

      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewMssv("");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo tài khoản");
    }
  };

  // Xóa sinh viên
  const handleDeleteUser = (user: AuthUser) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản sinh viên "${user.name}" (${user.email})?`)) {
      try {
        const ok = authService.deleteUser(user.id);
        if (ok) {
          loadUsers();
          toast.success("Đã xóa tài khoản sinh viên thành công");
          if (detailUser?.id === user.id) setDetailUser(null);
        }
      } catch (err: any) {
        toast.error(err.message || "Không thể xóa tài khoản");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card/90 to-purple-500/10 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs font-semibold">
              <Users className="size-3.5 mr-1" /> Quản trị Danh mục Sinh viên
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Hệ thống Kiểm soát Truy cập & Bảo mật
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
            Danh sách Người dùng & Sinh viên
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Quản lý tài khoản sinh viên, MSSV, cấp quyền, khóa tài khoản gửi kèm thông điệp cảnh báo và buộc đăng xuất tức thì.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 h-9 shadow-sm"
          >
            <UserPlus className="size-3.5" />
            <span>Thêm sinh viên</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              authService.exportUsersCSV();
              toast.success("Đã xuất danh sách người dùng ra CSV!");
            }}
            className="rounded-xl border-border bg-card hover:bg-accent text-xs gap-1.5 h-9 shadow-xs"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>Xuất CSV</span>
          </Button>
        </div>
      </div>

      {/* ── 4 Quick Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng người dùng
            </span>
            <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 grid place-items-center">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">Toàn bộ tài khoản trong hệ thống</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Đang hoạt động
            </span>
            <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Được phép đăng nhập & hỏi đáp AI</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng cuộc trò chuyện
            </span>
            <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
              <MessageSquare className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{stats.totalThreads}</div>
            <div className="text-xs text-muted-foreground mt-1">Các phiên chat do sinh viên tạo</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bị tạm khóa
            </span>
            <div className="size-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 grid place-items-center">
              <Lock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {stats.blocked}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Bị buộc logout & cấm truy cập</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table & Search Controls ── */}
      <Card className="rounded-2xl border-border/70 bg-card shadow-soft">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, email, MSSV hoặc khoa viện..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl border-border bg-muted/20 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Role filter */}
              <div className="flex rounded-xl border border-border p-1 bg-muted/30 text-xs">
                {(
                  [
                    { id: "ALL", label: "Tất cả vai trò" },
                    { id: "ADMIN", label: "Admin" },
                    { id: "STUDENT", label: "Sinh viên" },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRoleFilter(r.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all",
                      roleFilter === r.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <div className="flex rounded-xl border border-border p-1 bg-muted/30 text-xs">
                {(
                  [
                    { id: "ALL", label: "Tất cả TT" },
                    { id: "active", label: "Hoạt động" },
                    { id: "blocked", label: "Bị khóa" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all",
                      statusFilter === s.id
                        ? "bg-secondary text-secondary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-border/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-3.5">Sinh viên & Email</th>
                    <th className="py-3 px-3.5">MSSV</th>
                    <th className="py-3 px-3.5">Khoa / Viện</th>
                    <th className="py-3 px-3.5">Vai trò</th>
                    <th className="py-3 px-3.5 text-center">Số cuộc chat</th>
                    <th className="py-3 px-3.5">Trạng thái</th>
                    <th className="py-3 px-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-normal">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => {
                      const isAdmin = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                      const isBlocked = u.status === "blocked";
                      const userThreadsCount = threadService.listThreads(u.id).length;

                      return (
                        <tr key={u.id} className={cn("transition-colors", isBlocked ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-muted/30")}>
                          {/* Student Info */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "size-8 rounded-xl text-primary-foreground grid place-items-center font-bold text-xs shrink-0 shadow-xs",
                                isBlocked ? "bg-rose-500" : "bg-gradient-to-br from-primary/80 to-blue-600",
                              )}>
                                {u.name[0]?.toUpperCase() || "S"}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isAdmin && (
                                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] px-1 py-0">
                                      Master
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate font-mono">
                                  {u.email}
                                </div>
                                {isBlocked && u.blockedReason && (
                                  <div className="text-[10px] text-rose-600 dark:text-rose-400 truncate max-w-xs mt-0.5" title={u.blockedReason}>
                                    Lý do: {u.blockedReason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* MSSV */}
                          <td className="py-3 px-3.5 font-mono text-muted-foreground whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-[11px] font-medium text-foreground">
                              {u.mssv || "Chưa cấp"}
                            </span>
                          </td>

                          {/* Faculty */}
                          <td className="py-3 px-3.5 text-muted-foreground whitespace-nowrap">
                            {u.faculty || "Khoa CNTT"}
                          </td>

                          {/* Role */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {isAdmin ? (
                              <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold text-[10px]">
                                Quản trị viên
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                Sinh viên
                              </Badge>
                            )}
                          </td>

                          {/* Threads count */}
                          <td className="py-3 px-3.5 text-center font-mono font-semibold text-foreground whitespace-nowrap">
                            <Link
                              to="/admin/history"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Xem tất cả cuộc trò chuyện của sinh viên này"
                            >
                              <span>{userThreadsCount}</span>
                              <ExternalLink className="size-2.5" />
                            </Link>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {isBlocked ? (
                              <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                                <Lock className="size-2.5" />
                                Đã bị tạm khóa
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Đang hoạt động
                              </Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Xem hồ sơ chi tiết */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDetailUser(u)}
                                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                                title="Xem hồ sơ chi tiết"
                              >
                                <IdCard className="size-3.5" />
                              </Button>

                              {/* Sửa thông tin */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(u)}
                                className="size-7 rounded-lg text-muted-foreground hover:text-primary"
                                title="Chỉnh sửa thông tin sinh viên"
                              >
                                <Edit className="size-3.5" />
                              </Button>

                              {/* Đặt lại mật khẩu */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setResetTargetUser(u);
                                  setNewPasswordVal("123456");
                                }}
                                className="size-7 rounded-lg text-muted-foreground hover:text-amber-500"
                                title="Đặt lại mật khẩu sinh viên"
                              >
                                <KeyRound className="size-3.5" />
                              </Button>

                              {/* Khóa hoặc Mở khóa (không khóa master admin) */}
                              {!isAdmin && (
                                <>
                                  {isBlocked ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleUnlock(u)}
                                      className="size-7 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                      title="Mở khóa tài khoản cho sinh viên này"
                                    >
                                      <Unlock className="size-3.5" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setLockTargetUser(u);
                                        setLockReason(PRESET_LOCK_REASONS[0]);
                                      }}
                                      className="size-7 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                                      title="Tạm khóa tài khoản & Buộc đăng xuất"
                                    >
                                      <Lock className="size-3.5" />
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Xóa tài khoản */}
                              {!isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(u)}
                                  className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Xóa tài khoản sinh viên"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        Không tìm thấy người dùng nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── MODAL: TẠM KHÓA TÀI KHOẢN & BUỘC ĐĂNG XUẤT (FORCE LOGOUT) ── */}
      {lockTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-rose-500/40 bg-card p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-rose-500/15 text-rose-600 grid place-items-center">
                  <Lock className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Tạm khóa Tài khoản Sinh viên</h3>
                  <p className="text-xs text-muted-foreground">Buộc đăng xuất và gửi thông điệp cho sinh viên</p>
                </div>
              </div>
              <button
                onClick={() => setLockTargetUser(null)}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground grid place-items-center"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Target Student Box */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-foreground">{lockTargetUser.name}</div>
                <div className="text-[11px] font-mono text-muted-foreground">{lockTargetUser.email}</div>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                MSSV: {lockTargetUser.mssv || "Chưa cấp"}
              </Badge>
            </div>

            {/* Preset reasons */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Chọn lý do mẫu hoặc tự nhập:</label>
              <div className="flex flex-col gap-1.5">
                {PRESET_LOCK_REASONS.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLockReason(r)}
                    className={cn(
                      "text-left p-2 rounded-xl text-xs border transition-all leading-snug",
                      lockReason === r
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-medium"
                        : "bg-muted/10 border-border/60 text-muted-foreground hover:bg-muted/25",
                    )}
                  >
                    • {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom message textarea */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Thông điệp hiển thị cho sinh viên khi bị khóa *:
              </label>
              <textarea
                rows={3}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="Nhập lý do gửi đến sinh viên..."
              />
            </div>

            {/* Warning Callout */}
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertOctagon className="size-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Cơ chế Buộc Đăng xuất (Force Logout):</span>
                <p className="text-[11px] opacity-90">
                  Nếu sinh viên đang mở trình duyệt hoặc đang chat, phiên đăng nhập sẽ bị hủy lập tức và màn hình sẽ chuyển hướng về trang Đăng nhập kèm thông điệp này.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLockTargetUser(null)}
                className="rounded-xl text-xs h-9"
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmLock}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 gap-1.5 shadow-sm"
              >
                <Lock className="size-3.5" />
                <span>Xác nhận Tạm khóa & Buộc đăng xuất</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ĐẶT LẠI MẬT KHẨU ── */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-amber-500/15 text-amber-600 grid place-items-center">
                  <KeyRound className="size-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">Đặt lại Mật khẩu Sinh viên</h3>
              </div>
              <button
                onClick={() => setResetTargetUser(null)}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground grid place-items-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-1">
              <div><strong>Họ tên:</strong> {resetTargetUser.name}</div>
              <div><strong>Email:</strong> {resetTargetUser.email}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Mật khẩu mới:</label>
              <Input
                type="text"
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                className="h-9 rounded-xl text-xs font-mono"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNewPasswordVal("123456")}
                  className="text-[11px] text-primary hover:underline"
                >
                  Dùng mặc định (123456)
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => setNewPasswordVal(`SV@${Math.floor(100000 + Math.random() * 900000)}`)}
                  className="text-[11px] text-primary hover:underline"
                >
                  Tạo mật khẩu ngẫu nhiên
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetTargetUser(null)}
                className="rounded-xl text-xs h-9"
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmResetPassword}
                className="rounded-xl bg-primary text-primary-foreground text-xs h-9 gap-1.5"
              >
                <Copy className="size-3.5" />
                <span>Lưu & Sao chép mật khẩu</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CHỈNH SỬA THÔNG TIN SINH VIÊN ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="size-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Chỉnh sửa Sinh viên</h3>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground grid place-items-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Họ và tên *</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Email sinh viên *</label>
                <Input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Mã sinh viên (MSSV)</label>
                  <Input
                    value={editMssv}
                    onChange={(e) => setEditMssv(e.target.value)}
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Khoa / Viện</label>
                  <Input
                    value={editFaculty}
                    onChange={(e) => setEditFaculty(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditUser(null)}
                  className="rounded-xl text-xs h-9"
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" className="rounded-xl text-xs h-9 bg-primary text-primary-foreground">
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: THÊM SINH VIÊN MỚI ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <UserPlus className="size-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">Thêm Sinh viên Mới</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground grid place-items-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Họ và Tên Sinh viên *</label>
                <Input
                  required
                  placeholder="Ví dụ: Đỗ Nhật Nam"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Email Sinh viên *</label>
                <Input
                  required
                  type="email"
                  placeholder="Ví dụ: nam.dn23@student.edu.vn"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Mã sinh viên (MSSV)</label>
                  <Input
                    placeholder="23020999"
                    value={newMssv}
                    onChange={(e) => setNewMssv(e.target.value)}
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Khoa / Viện</label>
                  <Input
                    placeholder="CNTT / Kinh tế"
                    value={newFaculty}
                    onChange={(e) => setNewFaculty(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Mật khẩu khởi tạo</label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={newInitialPass}
                  onChange={(e) => setNewInitialPass(e.target.value)}
                  className="h-9 rounded-xl text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Mặc định là 123456, sinh viên có thể đổi sau.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl text-xs h-9"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-primary text-primary-foreground text-xs h-9 gap-1.5"
                >
                  <UserPlus className="size-3.5" />
                  Lưu sinh viên
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: XEM HỒ SƠ CHI TIẾT SINH VIÊN ── */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <IdCard className="size-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Hồ sơ Sinh viên & Tương tác</h3>
              </div>
              <button
                onClick={() => setDetailUser(null)}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground grid place-items-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-muted/20 border border-border/60">
                <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground grid place-items-center font-bold text-xl shrink-0 shadow-md">
                  {detailUser.name[0]?.toUpperCase() || "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-foreground truncate">{detailUser.name}</h4>
                    {detailUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                        Quản trị viên
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Sinh viên
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="size-3" />
                    <span>{detailUser.email}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <IdCard className="size-3" />
                    <span>Mã sinh viên (MSSV):</span>
                  </div>
                  <div className="font-mono font-bold text-foreground text-sm">
                    {detailUser.mssv || "Chưa cấp"}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Building className="size-3" />
                    <span>Khoa / Viện:</span>
                  </div>
                  <div className="font-semibold text-foreground truncate">
                    {detailUser.faculty || "Công nghệ Thông tin"}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    <span>Lịch sử trò chuyện:</span>
                  </div>
                  <div className="font-bold text-primary text-sm">
                    {threadService.listThreads(detailUser.id).length} phiên hội thoại
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" />
                    <span>Trạng thái tài khoản:</span>
                  </div>
                  <div>
                    {detailUser.status === "blocked" ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Đang bị tạm khóa
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        Đang hoạt động
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {detailUser.status === "blocked" && detailUser.blockedReason && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="size-3.5 text-rose-500" /> Lý do tạm khóa hiện tại:
                  </div>
                  <p className="opacity-90">{detailUser.blockedReason}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/70">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 h-9 text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
                >
                  <Link to="/admin/history">
                    <MessageSquare className="size-3.5" />
                    <span>Xem các cuộc trò chuyện của sinh viên này</span>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailUser(null)}
                  className="rounded-xl text-xs h-9"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
