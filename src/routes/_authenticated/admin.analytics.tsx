import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { analyticsService, type AnalyticsSummary, type AnalyticsEvent } from "@/services/analyticsService";
import {
  BarChart3,
  Download,
  Trash2,
  Sparkles,
  Layers,
  Clock,
  Filter,
  FileSpreadsheet,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Phân tích RAG & Độ trễ | iBot Admin" },
      { name: "description", content: "Báo cáo phân tích chuyên sâu các tầng RAG và hiệu năng hệ thống." },
    ],
  }),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [filterLayer, setFilterLayer] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = () => {
    try {
      setSummary(analyticsService.getSummary());
      setEvents(analyticsService.getEvents());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("ibot_analytics_updated", loadData);
    return () => window.removeEventListener("ibot_analytics_updated", loadData);
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchLayer = filterLayer === "ALL" || e.ragLayer === filterLayer;
    const matchSearch =
      !searchTerm || e.query.toLowerCase().includes(searchTerm.toLowerCase());
    return matchLayer && matchSearch;
  });

  const handleClear = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ sự kiện analytics?")) {
      analyticsService.clearAll();
      window.dispatchEvent(new Event("ibot_analytics_updated"));
      toast.success("Đã xóa toàn bộ dữ liệu phân tích");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/70 bg-card shadow-soft">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            Báo cáo Chi tiết & Dữ liệu Thô
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Xem toàn bộ sự kiện truy vấn, độ trễ và tầng phản hồi được ghi nhận theo thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              analyticsService.exportCSV();
              toast.success("Đang xuất file CSV...");
            }}
            className="rounded-xl text-xs gap-1.5 h-9"
          >
            <Download className="size-3.5" />
            Xuất file CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="rounded-xl text-xs gap-1.5 h-9 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
          >
            <Trash2 className="size-3.5" />
            Xóa dữ liệu
          </Button>
        </div>
      </div>

      {/* Filter and Raw Data Table */}
      <Card className="rounded-2xl border-border/70 bg-card shadow-soft">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-primary" />
              Nhật ký Sự kiện Truy vấn ({filteredEvents.length} bản ghi)
            </CardTitle>
            <CardDescription className="text-xs">
              Mỗi câu hỏi của sinh viên kèm nhãn tầng RAG và độ trễ đo được từ server
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Layer Filter buttons */}
            <div className="flex rounded-xl border border-border p-1 bg-muted/30 text-xs">
              {["ALL", "L1_FAQ", "L2_CHUNK", "FALLBACK"].map((l) => (
                <button
                  key={l}
                  onClick={() => setFilterLayer(l)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterLayer === l
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l === "ALL" ? "Tất cả" : l}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Nội dung câu hỏi</th>
                    <th className="py-2.5 px-3">Tầng RAG</th>
                    <th className="py-2.5 px-3 text-right">Độ trễ (Latency)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-normal">
                  {filteredEvents.length > 0 ? (
                    filteredEvents.slice(0, 30).map((evt) => (
                      <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground font-mono">
                          {new Date(evt.ts).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}{" "}
                          <span className="text-[10px] opacity-75">
                            {new Date(evt.ts).toLocaleDateString("vi-VN")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-foreground max-w-md truncate">
                          {evt.query}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {evt.ragLayer === "L1_FAQ" && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                              L1_FAQ
                            </Badge>
                          )}
                          {evt.ragLayer === "L2_CHUNK" && (
                            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">
                              L2_CHUNK
                            </Badge>
                          )}
                          {evt.ragLayer === "FALLBACK" && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                              FALLBACK
                            </Badge>
                          )}
                          {evt.ragLayer === "none" && (
                            <Badge variant="outline" className="text-[10px]">
                              Chưa gắn nhãn
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground whitespace-nowrap">
                          {evt.latencyMs}ms
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-muted-foreground">
                        Không có sự kiện nào phù hợp. Nhấn "Nạp Demo Data" trên thanh công cụ để thử nghiệm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
