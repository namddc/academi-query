import { createFileRoute } from "@tanstack/react-router";
import { Settings, Shield, Cpu, Sparkles, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyticsService } from "@/services/analyticsService";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Cấu hình & Trạng thái | iBot Admin" },
      { name: "description", content: "Thông số kỹ thuật, API và tùy chọn quản trị hệ thống." },
    ],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const handleLoadDemo = () => {
    analyticsService.loadDemoData();
    window.dispatchEvent(new Event("ibot_analytics_updated"));
    toast.success("Đã nạp 60 sự kiện analytics mẫu!");
  };

  const handleClearAnalytics = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả sự kiện phân tích?")) {
      analyticsService.clearAll();
      window.dispatchEvent(new Event("ibot_analytics_updated"));
      toast.success("Đã xóa sạch bộ nhớ analytics.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/70 bg-card shadow-soft">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="size-5 text-primary" />
            Cấu hình & Tình trạng Vận hành
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Kiểm tra thông số kỹ thuật của mô hình AI, cấu hình API và công cụ quản trị dữ liệu
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model and Engine specs */}
        <Card className="rounded-2xl border-border/70 bg-card shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Cpu className="size-4 text-emerald-500" />
              Thông số Kỹ thuật AI & RAG
            </CardTitle>
            <CardDescription className="text-xs">
              Các thông số đang vận hành trong môi trường production
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Mô hình AI:</span>
              <span className="font-mono font-semibold text-foreground">gemmatranslate-27b</span>
            </div>
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Nhà cung cấp API:</span>
              <span className="font-semibold text-primary">ExpSolution OpenAI-Compatible</span>
            </div>
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Kiến trúc RAG:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                3 Tầng (L1 FAQ / L2 Chunk / Fallback)
              </span>
            </div>
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Header giám sát:</span>
              <span className="font-mono text-muted-foreground">x-rag-layer (kèm trong response stream)</span>
            </div>
          </CardContent>
        </Card>

        {/* Demo and Management Actions */}
        <Card className="rounded-2xl border-border/70 bg-card shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              Công cụ Quản trị Dữ liệu
            </CardTitle>
            <CardDescription className="text-xs">
              Nạp dữ liệu thử nghiệm hoặc làm sạch bộ nhớ cục bộ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <h4 className="text-xs font-semibold text-foreground">Dữ liệu Demo cho Báo cáo</h4>
              <p className="text-[11px] text-muted-foreground">
                Tạo 60 sự kiện hỏi đáp thực tế trong 7 ngày gần nhất để trình diễn biểu đồ trực quan.
              </p>
              <Button
                size="sm"
                onClick={handleLoadDemo}
                className="w-full rounded-xl text-xs gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
              >
                <Sparkles className="size-3.5" />
                Nạp lại dữ liệu Demo
              </Button>
            </div>

            <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
              <h4 className="text-xs font-semibold text-destructive">Làm sạch Dữ liệu</h4>
              <p className="text-[11px] text-muted-foreground">
                Xóa toàn bộ các sự kiện analytics đã thu thập được từ localStorage.
              </p>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearAnalytics}
                className="w-full rounded-xl text-xs gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Xóa toàn bộ Analytics Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
