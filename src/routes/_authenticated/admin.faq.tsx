import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Database, Search, Filter, BookOpen, CheckCircle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/faq")({
  head: () => ({
    meta: [
      { title: "Cơ sở Tri thức FAQ | iBot Admin" },
      { name: "description", content: "Bộ câu hỏi - đáp chuẩn hóa cho sinh viên." },
    ],
  }),
  component: AdminFaqPage,
});

// Demo FAQ sample dataset representing ibot_faq_100
const SAMPLE_FAQS = [
  {
    id: 1,
    category: "Học phí",
    question: "Học phí học kỳ này sinh viên đóng vào thời gian nào và qua kênh nào?",
    answer: "Sinh viên nộp học phí qua cổng thanh toán trực tuyến của nhà trường hoặc chuyển khoản theo số tài khoản chỉ định trước tuần thứ 4 của học kỳ.",
    confidence: "99%",
    layer: "L1_FAQ",
  },
  {
    id: 2,
    category: "Học bổng",
    question: "Điều kiện để được xét học bổng khuyến khích học tập là gì?",
    answer: "Sinh viên có điểm trung bình chung học tập từ 8.0 trở lên và điểm rèn luyện từ 80 điểm trở lên trong học kỳ xét, không bị kỷ luật.",
    confidence: "98%",
    layer: "L1_FAQ",
  },
  {
    id: 3,
    category: "Ký túc xá",
    question: "Thủ tục và hồ sơ đăng ký ở Ký túc xá trường như thế nào?",
    answer: "Sinh viên chuẩn bị đơn đăng ký, bản sao CCCD và giấy tờ ưu tiên (nếu có), nộp online qua cổng dịch vụ sinh viên đầu mỗi năm học.",
    confidence: "97%",
    layer: "L1_FAQ",
  },
  {
    id: 4,
    category: "Thủ tục",
    question: "Làm thế nào để xin giấy xác nhận sinh viên để hoãn nghĩa vụ quân sự?",
    answer: "Sinh viên vào trang web phòng Đào tạo, đăng nhập mã số sinh viên, chọn mục 'Yêu cầu cấp giấy xác nhận', nhận bản cứng tại phòng 1 cửa sau 2 ngày.",
    confidence: "99%",
    layer: "L1_FAQ",
  },
  {
    id: 5,
    category: "Đào tạo",
    question: "Quy định về việc rút bớt hoặc đăng ký thêm học phần trong học kỳ?",
    answer: "Sinh viên được phép điều chỉnh đăng ký học phần trong 2 tuần đầu tiên của học kỳ chính trên hệ thống quản lý đào tạo.",
    confidence: "96%",
    layer: "L1_FAQ",
  },
];

function AdminFaqPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const categories = ["ALL", "Học phí", "Học bổng", "Ký túc xá", "Thủ tục", "Đào tạo"];

  const filtered = SAMPLE_FAQS.filter((item) => {
    const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;
    const matchSearch =
      !search ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/70 bg-card shadow-soft">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="size-5 text-emerald-500" />
            Cơ sở Tri thức FAQ (Tầng L1 RAG)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Tập dữ liệu 100 câu hỏi - đáp chuẩn hóa được đối chiếu ưu tiên trước khi gọi AI sinh nội dung
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-3 py-1">
            100 FAQ Hoạt động
          </Badge>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="rounded-2xl border-border/70 bg-card shadow-soft">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm câu hỏi hoặc câu trả lời..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl border-border bg-muted/20"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition-colors ${
                    selectedCategory === c
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "ALL" ? "Tất cả chủ đề" : c}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map((faq) => (
              <div
                key={faq.id}
                className="p-4 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/25 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      #{faq.id}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {faq.category}
                    </Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      {faq.layer}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Độ tin cậy: {faq.confidence}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-foreground">{faq.question}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
