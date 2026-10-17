// ============================================================
//  analyticsService.ts
//  Thu thập & tổng hợp dữ liệu analytics cho iBot Admin Dashboard
//  Storage: localStorage — không cần server, không tốn thêm chi phí
// ============================================================

import { feedbackService } from "@/services/feedbackService";
import { bookmarkService } from "@/services/bookmarkService";

// ── Types ────────────────────────────────────────────────────

export type RagLayer = "L1_FAQ" | "L2_CHUNK" | "FALLBACK" | "none";

export interface AnalyticsEvent {
  id: string;
  ts: string;           // ISO timestamp
  threadId: string;
  query: string;        // Câu hỏi (truncated 200 chars)
  ragLayer: RagLayer;
  latencyMs: number;    // ms từ lúc gửi đến khi nhận xong stream
}

export interface LayerDistribution {
  L1_FAQ: number;
  L2_CHUNK: number;
  FALLBACK: number;
  none: number;
}

export interface AnalyticsSummary {
  totalQueries: number;
  totalThreads: number;
  avgLatencyMs: number;
  satisfactionRate: number;           // 0–100 (%)
  totalPositive: number;
  totalNegative: number;
  totalBookmarks: number;
  layerDistribution: LayerDistribution;
  queriesByDay: { date: string; count: number }[];   // 7 ngày gần nhất
  topKeywords: { word: string; count: number }[];    // Top 10
  negativeReasons: { reason: string; label: string; count: number }[];
}

// ── Constants ────────────────────────────────────────────────

const EVENTS_KEY = "ibot_analytics_events";
const MAX_EVENTS = 500; // Giới hạn để tránh vượt localStorage 5MB

/** Stopwords tiếng Việt phổ biến — không tính vào top keywords */
const STOPWORDS = new Set([
  "tôi", "của", "và", "là", "có", "không", "được", "các", "trong",
  "cho", "với", "về", "đến", "thì", "để", "này", "đó", "mà", "bao",
  "như", "hay", "khi", "theo", "từ", "ra", "vào", "lên", "xuống",
  "thế", "còn", "cũng", "vậy", "nào", "sao", "gì", "ở", "tại",
  "một", "những", "đã", "đang", "sẽ", "hãy", "làm", "thế", "nào",
  "cần", "phải", "muốn", "biết", "hỏi", "xin", "ơi", "ạ", "nhé",
]);

const FEEDBACK_REASON_LABELS: Record<string, string> = {
  wrong_info:     "Sai thông tin",
  missing_info:   "Thiếu thông tin",
  not_understood: "Không hiểu câu hỏi",
  outdated:       "Thông tin lỗi thời",
  other:          "Lý do khác",
};

// ── Storage helpers ──────────────────────────────────────────

function readEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn("[Analytics] localStorage write failed:", e);
  }
}

// ── Tokenizer ────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu để dễ so sánh
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

// ── Date helpers ─────────────────────────────────────────────

function getDateStr(isoStr: string): string {
  return isoStr.slice(0, 10); // "2024-01-15"
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function filterByDays(events: AnalyticsEvent[], days?: number): AnalyticsEvent[] {
  if (!days) return events;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();
  return events.filter((e) => e.ts >= cutoffStr);
}

// ── Main Service ─────────────────────────────────────────────

export const analyticsService = {
  /**
   * Ghi một event analytics mới.
   * Tự động prune nếu vượt MAX_EVENTS.
   */
  recordEvent(
    event: Omit<AnalyticsEvent, "id" | "ts">,
  ): void {
    try {
      const events = readEvents();
      const newEvent: AnalyticsEvent = {
        ...event,
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ts: new Date().toISOString(),
        query: event.query.slice(0, 200),
      };
      events.push(newEvent);

      // Prune: giữ lại MAX_EVENTS gần nhất
      const pruned =
        events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;

      writeEvents(pruned);
    } catch (e) {
      console.warn("[Analytics] recordEvent failed:", e);
    }
  },

  /**
   * Lấy tất cả events, tuỳ chọn filter theo số ngày gần nhất.
   */
  getEvents(options?: { days?: number }): AnalyticsEvent[] {
    const events = readEvents();
    return filterByDays(events, options?.days);
  },

  /**
   * Tính toán tổng hợp thống kê từ tất cả data sources:
   * - analyticsEvents (localStorage)
   * - feedbackService (localStorage)
   * - threadService (localStorage)
   * - bookmarkService (localStorage)
   */
  getSummary(days?: number): AnalyticsSummary {
    const events = filterByDays(readEvents(), days);
    const allFeedbacks = feedbackService.getAllFeedbacks();
    // Đọc tất cả threads từ localStorage (không lọc theo user)
    const allThreads: any[] = (() => {
      try {
        const raw = localStorage.getItem("academi_threads");
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();
    const allBookmarks = bookmarkService.getBookmarks();

    // ── Basic counts ─────────────────────────────────────
    const totalQueries = events.length;
    const totalThreads = allThreads.length;
    const totalBookmarks = allBookmarks.length;

    // ── Avg latency ──────────────────────────────────────
    const validLatencies = events.filter((e) => e.latencyMs > 0).map((e) => e.latencyMs);
    const avgLatencyMs =
      validLatencies.length > 0
        ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
        : 0;

    // ── Satisfaction rate ────────────────────────────────
    const positives = allFeedbacks.filter((f) => f.value === "up").length;
    const negatives = allFeedbacks.filter((f) => f.value === "down").length;
    const totalFeedbacks = positives + negatives;
    const satisfactionRate =
      totalFeedbacks > 0 ? Math.round((positives / totalFeedbacks) * 100) : 0;

    // ── RAG Layer distribution ───────────────────────────
    const layerDistribution: LayerDistribution = {
      L1_FAQ: 0,
      L2_CHUNK: 0,
      FALLBACK: 0,
      none: 0,
    };
    for (const e of events) {
      const layer = e.ragLayer in layerDistribution ? e.ragLayer : "none";
      layerDistribution[layer]++;
    }

    // ── Queries by day (last 7 days) ─────────────────────
    const last7 = getLast7Days();
    const countByDay: Record<string, number> = {};
    for (const day of last7) countByDay[day] = 0;
    for (const e of events) {
      const day = getDateStr(e.ts);
      if (day in countByDay) countByDay[day]++;
    }
    const queriesByDay = last7.map((date) => ({
      date,
      count: countByDay[date] ?? 0,
    }));

    // ── Top keywords ─────────────────────────────────────
    const wordCount: Record<string, number> = {};
    for (const e of events) {
      for (const word of tokenize(e.query)) {
        wordCount[word] = (wordCount[word] ?? 0) + 1;
      }
    }
    const topKeywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // ── Negative feedback reasons ─────────────────────────
    const reasonCount: Record<string, number> = {};
    for (const f of allFeedbacks.filter((f) => f.value === "down" && f.reason)) {
      const r = f.reason!;
      reasonCount[r] = (reasonCount[r] ?? 0) + 1;
    }
    const negativeReasons = Object.entries(reasonCount)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({
        reason,
        label: FEEDBACK_REASON_LABELS[reason] ?? reason,
        count,
      }));

    return {
      totalQueries,
      totalThreads,
      avgLatencyMs,
      satisfactionRate,
      totalPositive: positives,
      totalNegative: negatives,
      totalBookmarks,
      layerDistribution,
      queriesByDay,
      topKeywords,
      negativeReasons,
    };
  },

  /**
   * Export toàn bộ analytics events ra CSV string.
   * Bao gồm BOM (\uFEFF) để Excel đọc được tiếng Việt.
   */
  exportCSV(): string {
    const events = readEvents();
    const header = "ID,Thời gian,Thread ID,Câu hỏi,RAG Layer,Latency (ms)";
    const rows = events.map((e) => {
      const safeQuery = `"${e.query.replace(/"/g, '""')}"`;
      return [e.id, e.ts, e.threadId, safeQuery, e.ragLayer, e.latencyMs].join(",");
    });
    return "\uFEFF" + [header, ...rows].join("\n");
  },

  /** Tải file CSV về máy */
  downloadCSV(): void {
    const csv = this.exportCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `ibot-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /** Xóa toàn bộ analytics events */
  clearAll(): void {
    try {
      localStorage.removeItem(EVENTS_KEY);
    } catch (e) {
      console.warn("[Analytics] clearAll failed:", e);
    }
  },

  /** Số lượng events hiện tại */
  getCount(): number {
    return readEvents().length;
  },

  /**
   * Inject dữ liệu mẫu để demo đồ án.
   * Tạo 60 events trong 7 ngày qua với phân bổ thực tế.
   */
  loadDemoData(): void {
    this.clearAll();

    const sampleQueries = [
      "Học phí kỳ 2 đóng ở đâu và bao nhiêu tiền?",
      "Điều kiện xét học bổng khuyến khích học tập",
      "Thủ tục đăng ký ở ký túc xá như thế nào?",
      "Cách xin giấy xác nhận sinh viên",
      "Lịch thi kết thúc học phần kỳ 1",
      "Quy định về nghỉ học và bảo lưu kết quả",
      "Liên hệ phòng Đào tạo bằng cách nào?",
      "Học bổng ngoài trường có thể đăng ký không?",
      "Quy trình xét tốt nghiệp như thế nào?",
      "Thời hạn đóng học phí kỳ này là khi nào?",
      "Làm thế nào để đăng ký học phần tự chọn?",
      "Điểm rèn luyện ảnh hưởng đến học bổng thế nào?",
      "Thủ tục xin tạm hoãn nghĩa vụ quân sự",
      "Cách tra cứu điểm trực tuyến",
      "Phòng y tế trường ở đâu?",
    ];

    const layers: RagLayer[] = [
      "L1_FAQ", "L1_FAQ", "L1_FAQ", "L1_FAQ",  // 40% L1
      "L2_CHUNK", "L2_CHUNK", "L2_CHUNK",       // 35% L2
      "FALLBACK", "FALLBACK",                    // 25% Fallback
    ];

    const now = Date.now();
    const events: AnalyticsEvent[] = [];

    for (let i = 0; i < 60; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const ts = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();
      const query = sampleQueries[i % sampleQueries.length];
      const ragLayer = layers[Math.floor(Math.random() * layers.length)];
      const latencyMs =
        ragLayer === "L1_FAQ"
          ? 800 + Math.floor(Math.random() * 600)
          : ragLayer === "L2_CHUNK"
            ? 1200 + Math.floor(Math.random() * 800)
            : 1500 + Math.floor(Math.random() * 1000);

      events.push({
        id: `demo_${i}`,
        ts,
        threadId: `thread_demo_${Math.floor(i / 3)}`,
        query,
        ragLayer,
        latencyMs,
      });
    }

    // Sort by time ascending
    events.sort((a, b) => a.ts.localeCompare(b.ts));
    writeEvents(events);
    console.log("[Analytics] Demo data loaded:", events.length, "events");
  },
};
