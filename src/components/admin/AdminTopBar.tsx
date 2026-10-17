import { useLocation, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  RefreshCw,
  Download,
  Database,
  Sparkles,
  Bot,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { analyticsService } from "@/services/analyticsService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminTopBarProps {
  onMenuOpen: () => void;
  title?: string;
}

const ROUTE_INFO: Record<string, { title: string; category: string; description: string }> = {
  "/admin": {
    title: "Dashboard Tổng quan",
    category: "Báo cáo",
    description: "Chỉ số hiệu suất RAG, phân bổ tầng tra cứu và xu hướng người dùng",
  },
  "/admin/dashboard": {
    title: "Dashboard Tổng quan",
    category: "Báo cáo",
    description: "Chỉ số hiệu suất RAG, phân bổ tầng tra cứu và xu hướng người dùng",
  },
  "/admin/analytics": {
    title: "Phân tích RAG & Latency",
    category: "Báo cáo",
    description: "Báo cáo chi tiết tầng L1 FAQ, L2 Chunk, Fallback và thời gian phản hồi",
  },
  "/admin/faq": {
    title: "Cơ sở Tri thức FAQ",
    category: "Dữ liệu",
    description: "Quản lý và tra cứu bộ 100 câu hỏi - đáp chuẩn hóa cho sinh viên",
  },
  "/admin/history": {
    title: "Lịch sử Cuộc trò chuyện",
    category: "Dữ liệu",
    description: "Xem lại các phiên hỏi đáp của sinh viên và kiểm tra tầng trả lời RAG",
  },
  "/admin/users": {
    title: "Quản lý Người dùng & Sinh viên",
    category: "Người dùng",
    description: "Quản lý danh sách tài khoản, MSSV, trạng thái hoạt động và quyền truy cập",
  },
  "/admin/settings": {
    title: "Cấu hình & Trạng thái",
    category: "Hệ thống",
    description: "Kiểm tra kết nối API ExpSolution, Supabase và quản lý bộ nhớ",
  },
};

export function AdminTopBar({ onMenuOpen, title }: AdminTopBarProps) {
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentInfo =
    ROUTE_INFO[location.pathname] || {
      title: title || "Bảng Quản trị",
      category: "Quản trị",
      description: "Hệ thống giám sát và vận hành Trợ lý Sinh viên iBot",
    };

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event("ibot_analytics_updated"));
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Dữ liệu đã được làm mới");
    }, 450);
  };

  const handleLoadDemo = () => {
    try {
      analyticsService.loadDemoData();
      window.dispatchEvent(new Event("ibot_analytics_updated"));
      toast.success("Đã nạp 60 events mẫu vào hệ thống!", {
        description: "Dữ liệu phân bổ đều 7 ngày qua với các câu hỏi thực tế.",
      });
    } catch {
      toast.error("Không thể nạp dữ liệu mẫu");
    }
  };

  const handleExportCSV = () => {
    try {
      const count = analyticsService.getCount();
      if (count === 0) {
        toast.info("Chưa có dữ liệu nào để xuất CSV. Hãy nạp dữ liệu mẫu trước!");
        return;
      }
      analyticsService.exportCSV();
      toast.success(`Đã xuất file CSV với ${count} dòng dữ liệu!`);
    } catch {
      toast.error("Xuất CSV thất bại");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 border-b border-border/70 bg-background/85 backdrop-blur-md transition-colors">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuOpen}
          className="lg:hidden size-9 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Menu className="size-5" />
        </Button>

        <div className="min-w-0 flex flex-col">
          {/* Breadcrumb line */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground leading-none">
            <span className="hover:text-foreground transition-colors">Quản trị</span>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="text-muted-foreground font-medium">{currentInfo.category}</span>
            <ChevronRight className="size-3 text-muted-foreground/60 hidden sm:inline" />
            <span className="text-foreground font-semibold truncate hidden sm:inline">
              {currentInfo.title}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-sm md:text-base font-bold text-foreground tracking-tight truncate mt-0.5">
            {currentInfo.title}
          </h1>
        </div>
      </div>

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-2">
        {/* Status Pill (Desktop) */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Pipeline RAG: Sẵn sàng</span>
        </div>

        {/* Action: Load Demo Data */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoadDemo}
          className="h-9 rounded-xl border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-medium gap-1.5 hidden sm:inline-flex shadow-none"
          title="Tạo 60 sự kiện mẫu để demo biểu đồ và thống kê"
        >
          <Sparkles className="size-3.5 text-primary" />
          <span>Nạp Demo Data</span>
        </Button>

        {/* Action: Export CSV */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="h-9 rounded-xl border-border/80 bg-card hover:bg-accent text-foreground text-xs font-medium gap-1.5 hidden md:inline-flex shadow-xs"
          title="Tải toàn bộ sự kiện dạng CSV"
        >
          <Download className="size-3.5 text-muted-foreground" />
          <span>Xuất CSV</span>
        </Button>

        {/* Action: Refresh Data */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
          title="Làm mới dữ liệu trang"
        >
          <RefreshCw className={cn("size-4", isRefreshing && "animate-spin text-primary")} />
        </Button>

        {/* Action: Switch back to Chat */}
        <Button
          asChild
          variant="default"
          size="sm"
          className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium gap-1.5 shadow-sm shadow-primary/25"
        >
          <Link to="/chat">
            <Bot className="size-3.5" />
            <span className="hidden sm:inline">Vào Chat</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
