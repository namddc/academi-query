// ============================================================
//  feedbackService.ts – Quản lý phản hồi và đánh giá câu trả lời
//  Hỗ trợ lưu trữ structured feedback, lý do không hài lòng
// ============================================================

export type FeedbackReason =
  | "wrong_info"     // Sai thông tin / Không chính xác
  | "missing_info"   // Trả lời sơ sài / Chưa đầy đủ
  | "not_understood" // Không hiểu đúng câu hỏi
  | "outdated"       // Thông tin cũ / Đã thay đổi
  | "other";         // Lý do khác

export interface MessageFeedbackData {
  messageId: string;
  threadId?: string;
  value: "up" | "down";
  reason?: FeedbackReason;
  note?: string;
  userQuestion?: string;
  assistantSnippet?: string;
  createdAt: string;
}

const FEEDBACK_PREFIX = "ibot_fb_";
const ALL_FEEDBACKS_KEY = "ibot_feedbacks_all";

export const FEEDBACK_REASONS_MAP: Record<FeedbackReason, string> = {
  wrong_info: "Sai thông tin / Không chính xác",
  missing_info: "Trả lời sơ sài / Thiếu thông tin",
  not_understood: "Không hiểu câu hỏi của tôi",
  outdated: "Thông tin cũ / Lỗi thời",
  other: "Lý do khác",
};

export const feedbackService = {
  saveFeedback(data: MessageFeedbackData): void {
    try {
      // Lưu theo messageId
      localStorage.setItem(`${FEEDBACK_PREFIX}${data.messageId}`, JSON.stringify(data));

      // Cập nhật danh sách tổng hợp (dành cho Analytics Dashboard)
      const all = feedbackService.getAllFeedbacks();
      const existingIdx = all.findIndex((f) => f.messageId === data.messageId);
      if (existingIdx >= 0) {
        all[existingIdx] = data;
      } else {
        all.push(data);
      }
      localStorage.setItem(ALL_FEEDBACKS_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn("Lỗi lưu feedback vào localStorage:", e);
    }
  },

  removeFeedback(messageId: string): void {
    try {
      localStorage.removeItem(`${FEEDBACK_PREFIX}${messageId}`);
      const all = feedbackService.getAllFeedbacks().filter((f) => f.messageId !== messageId);
      localStorage.setItem(ALL_FEEDBACKS_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn("Lỗi xóa feedback:", e);
    }
  },

  getFeedback(messageId: string): MessageFeedbackData | null {
    try {
      const raw = localStorage.getItem(`${FEEDBACK_PREFIX}${messageId}`);
      if (raw) return JSON.parse(raw);

      // Tương thích ngược với key cũ "ibot_feedback_{messageId}"
      const legacy = localStorage.getItem(`ibot_feedback_${messageId}`);
      if (legacy === "up" || legacy === "down") {
        return {
          messageId,
          value: legacy,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  getAllFeedbacks(): MessageFeedbackData[] {
    try {
      const raw = localStorage.getItem(ALL_FEEDBACKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};
