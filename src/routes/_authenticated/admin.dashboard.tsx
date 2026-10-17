import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { analyticsService, type AnalyticsSummary } from "@/services/analyticsService";
import {
  MessageSquare,
  Clock,
  ThumbsUp,
  Bookmark,
  TrendingUp,
  Sparkles,
  Layers,
  Search,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  BarChart2,
  Database,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Tổng quan Dashboard | iBot Admin" },
      { name: "description", content: "Chỉ số hiệu suất RAG, phân bổ tầng tra cứu và thống kê người dùng." },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    try {
      const data = analyticsService.getSummary();
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("ibot_analytics_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("ibot_analytics_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const totalQueries = summary?.totalQueries ?? 0;
  const l1Count = summary?.layerDistribution.L1_FAQ ?? 0;
  const l2Count = summary?.layerDistribution.L2_CHUNK ?? 0;
  const fallbackCount = summary?.layerDistribution.FALLBACK ?? 0;

  const l1Pct = totalQueries > 0 ? Math.round((l1Count / totalQueries) * 100) : 0;
  const l2Pct = totalQueries > 0 ? Math.round((l2Count / totalQueries) * 100) : 0;
  const fallbackPct = totalQueries > 0 ? Math.round((fallbackCount / totalQueries) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card/90 to-primary/10 p-5 md:p-6 shadow-soft">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <ShieldCheck className="size-3.5" />
                Hệ thống Quản trị iBot
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Cập nhật theo thời gian thực
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Trung tâm Giám sát & Hiệu suất RAG
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
              Theo dõi luồng truy vấn của sinh viên qua 3 tầng tri thức (L1 FAQ chuẩn hóa, L2 Vector chunks, Fallback AI) và tối ưu độ trễ phản hồi.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {totalQueries === 0 && (
              <Button
                onClick={() => {
                  analyticsService.loadDemoData();
                  window.dispatchEvent(new Event("ibot_analytics_updated"));
                  toast.success("Đã nạp 60 events mẫu vào hệ thống!");
                }}
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 shadow-sm"
              >
                <Sparkles className="size-3.5" />
                Nạp dữ liệu mẫu
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-border bg-card/60 hover:bg-accent text-xs gap-1.5 shadow-xs"
            >
              <Link to="/admin/analytics">
                <span>Xem phân tích chi tiết</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-8 -top-8 size-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      </div>

      {/* ── Row 1: 4 Key Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft hover:shadow-card hover:border-border transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng lượt hỏi
            </span>
            <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
              <MessageSquare className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {totalQueries.toLocaleString("vi-VN")}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                <TrendingUp className="size-3 mr-0.5 inline" />
                {summary?.totalThreads ?? 0}
              </span>
              <span>cuộc hội thoại được tạo</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft hover:shadow-card hover:border-border transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Độ trễ trung bình
            </span>
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summary ? `${(summary.avgLatencyMs / 1000).toFixed(2)}s` : "0.00s"}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <span className="text-muted-foreground font-medium">
                {summary ? `${summary.avgLatencyMs}ms` : "0ms"}
              </span>
              <span>thời gian nhận phản hồi</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft hover:shadow-card hover:border-border transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tỷ lệ hài lòng
            </span>
            <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
              <ThumbsUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summary?.satisfactionRate ?? 100}%
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                +{summary?.totalPositive ?? 0} tích cực
              </span>
              <span>/ {summary?.totalNegative ?? 0} tiêu cực</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft hover:shadow-card hover:border-border transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tin nhắn đã ghim
            </span>
            <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 grid place-items-center">
              <Bookmark className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summary?.totalBookmarks ?? 0}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <span>Được sinh viên lưu để xem lại</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Smart Layout Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: RAG Pipeline Efficiency (2/3 col) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Layers className="size-4 text-primary" />
                  Hiệu quả Kiến trúc RAG 3 Tầng
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Tỷ lệ các câu hỏi được đáp ứng chính xác qua từng tầng tri thức
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold border-primary/30 text-primary">
                Multi-layer RAG
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Layer 1: L1 FAQ */}
              <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-foreground">Tầng 1: L1 FAQ Chuẩn hóa</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      (Tra cứu từ điển 100 câu hỏi mẫu)
                    </span>
                  </div>
                  <div className="font-mono font-bold text-foreground">
                    {l1Count} lượt ({l1Pct}%)
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(l1Pct, totalQueries > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Tốc độ: ~800ms</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Độ chính xác cao nhất</span>
                </div>
              </div>

              {/* Layer 2: L2 Chunk Vector */}
              <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500" />
                    <span className="font-semibold text-foreground">Tầng 2: L2 Văn bản Vector Chunks</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      (Sổ tay sinh viên & Quy chế đào tạo)
                    </span>
                  </div>
                  <div className="font-mono font-bold text-foreground">
                    {l2Count} lượt ({l2Pct}%)
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(l2Pct, totalQueries > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Tốc độ: ~1.4s</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Ngữ cảnh phong phú</span>
                </div>
              </div>

              {/* Layer 3: Fallback */}
              <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-500" />
                    <span className="font-semibold text-foreground">Tầng 3: Fallback Mô hình AI</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      (Xử lý câu hỏi tự do ngoài phạm vi)
                    </span>
                  </div>
                  <div className="font-mono font-bold text-foreground">
                    {fallbackCount} lượt ({fallbackPct}%)
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(fallbackPct, totalQueries > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Tốc độ: ~1.8s</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Suy luận linh hoạt</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Preview Card */}
          <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <BarChart2 className="size-4 text-secondary" />
                  Truy vấn 7 Ngày Gần Nhất
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Lượng tương tác theo từng ngày trong tuần
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-primary gap-1">
                <Link to="/admin/analytics">
                  <span>Xem biểu đồ đầy đủ</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 pt-2">
                {summary?.queriesByDay.map((d, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-end p-2.5 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1.5"
                  >
                    <span className="text-xs font-bold text-foreground font-mono">{d.count}</span>
                    <div className="w-full h-14 bg-muted/60 rounded-md overflow-hidden flex items-end">
                      <div
                        className="w-full bg-primary/80 rounded-sm transition-all duration-300"
                        style={{
                          height: `${Math.min(100, Math.max(12, (d.count / (Math.max(...summary.queriesByDay.map((x) => x.count), 1) || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-full">{d.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Top Keywords & System Health (1/3 col) */}
        <div className="space-y-6">
          {/* Top Keywords */}
          <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Search className="size-4 text-primary" />
                Chủ đề Sinh viên Quan tâm
              </CardTitle>
              <CardDescription className="text-xs">
                Top từ khóa xuất hiện nhiều nhất trong câu hỏi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary && summary.topKeywords.length > 0 ? (
                <div className="space-y-2">
                  {summary.topKeywords.slice(0, 7).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-muted/15 hover:bg-muted/30 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold grid place-items-center">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-foreground capitalize">{item.word}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {item.count} lần
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Chưa có dữ liệu từ khóa. Nhấn nút "Nạp dữ liệu mẫu" ở trên để xem thử.
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Environment Status Card */}
          <Card className="rounded-2xl border-border/70 bg-card/90 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Cpu className="size-4 text-emerald-500" />
                Trạng thái Kết nối Hệ thống
              </CardTitle>
              <CardDescription className="text-xs">
                Tình trạng dịch vụ hạ tầng backend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-border/60 bg-muted/20">
                <span className="text-muted-foreground">ExpSolution AI LLM:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  Đang hoạt động
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-border/60 bg-muted/20">
                <span className="text-muted-foreground">Mô hình Ngôn ngữ:</span>
                <span className="font-mono font-medium text-foreground text-[11px]">gemmatranslate-27b</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-border/60 bg-muted/20">
                <span className="text-muted-foreground">Bộ lưu trữ Analytics:</span>
                <span className="font-medium text-foreground">Local Browser Storage</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-border/60 bg-muted/20">
                <span className="text-muted-foreground">Cơ sở dữ liệu FAQ:</span>
                <span className="font-semibold text-primary">100 Câu hỏi chuẩn hóa</span>
              </div>

              <Button
                asChild
                variant="outline"
                className="w-full mt-2 rounded-xl text-xs gap-1.5 h-9 border-border"
              >
                <Link to="/admin/settings">
                  <span>Quản lý cấu hình & reset</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
