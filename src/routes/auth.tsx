import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGoogleLogin } from "@react-oauth/google";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Đăng nhập – Trợ lý Sinh viên AI" },
      { name: "description", content: "Đăng nhập để sử dụng Trợ lý Sinh viên AI." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { isAuthenticated, login, register, loginWithGoogleProfile } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in → go to chat
  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/chat" });
  }, [isAuthenticated, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Vui lòng nhập email"); return; }
    if (!password) { toast.error("Vui lòng nhập mật khẩu"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        await register(name, email, password);
        toast.success("Tạo tài khoản thành công!");
      } else {
        await login(email, password);
      }
      
      // IMPORTANT: Invalidate router cache so the authenticated guard re-runs
      await router.invalidate();
      
      navigate({ to: "/chat" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await res.json();
        await loginWithGoogleProfile(profile);
        toast.success("Đăng nhập bằng Google thành công!");
        
        // IMPORTANT: Invalidate router cache here too
        await router.invalidate();
        
        navigate({ to: "/chat" });
      } catch (err) {
        toast.error("Đăng nhập Google thất bại");
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error("Đăng nhập Google bị hủy"),
  });

  const handleGoogle = () => {
    googleLogin();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <div className="font-semibold text-lg">Trợ lý Sinh viên AI</div>
              <div className="text-xs text-primary-foreground/70">University Assistant</div>
            </div>
          </div>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <h2 className="text-4xl font-bold leading-tight">
            Mọi câu hỏi của sinh viên,<br />
            <span className="text-accent">một câu trả lời thông minh.</span>
          </h2>
          <p className="text-primary-foreground/80 text-base leading-relaxed">
            Học phí, lịch học, học bổng, ký túc xá, thủ tục hành chính – tất cả thông tin của trường, gói gọn trong một trợ lý AI duy nhất.
          </p>
        </div>
        <div className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} University AI Assistant
        </div>
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-secondary/30 blur-3xl" />
        <div className="absolute -top-20 -left-20 size-72 rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/* Auth form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
              <GraduationCap className="size-6" />
            </div>
            <div className="font-semibold text-lg">Trợ lý Sinh viên AI</div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {mode === "signin" ? "Chào mừng quay lại 👋" : "Tạo tài khoản"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "signin"
                ? "Đăng nhập để tiếp tục trò chuyện với trợ lý."
                : "Bắt đầu hành trình học tập cùng AI."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl text-base font-medium"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="size-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Tiếp tục với Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>hoặc dùng email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" className="h-12 rounded-xl" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@truong.edu.vn" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" className="h-12 rounded-xl" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90">
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "signin" ? "Đăng ký ngay" : "Đăng nhập"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
