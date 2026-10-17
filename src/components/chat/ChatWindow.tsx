import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUp,
  GraduationCap,
  Mic,
  MicOff,
  Paperclip,
  Loader2,
  Calendar,
  Wallet,
  Award,
  Home,
  FileText,
  Phone,
  Sparkles,
  BookOpen,
  Bell,
  Link as LinkIcon,
  CalendarDays,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Volume2,
  VolumeX,
  MessageSquare,
  ExternalLink,
  X,
  Bookmark,
  Download,
  Printer,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentPreview } from "@/components/chat/AttachmentPreview";
import {
  useAttachments,
  ACCEPT_ATTR,
  type AttachmentMeta,
  type AttachmentImage,
} from "@/hooks/useAttachments";
import { FileUIPart } from "ai";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTTS } from "@/hooks/useTTS";
import { authService } from "@/services/authService";
import { threadService, type StoredMessage } from "@/services/threadService";
import { bookmarkService } from "@/services/bookmarkService";
import {
  feedbackService,
  FEEDBACK_REASONS_MAP,
  type FeedbackReason,
} from "@/services/feedbackService";
import { analyticsService, type RagLayer } from "@/services/analyticsService";

import {
  SCHOOL_NOTICES,
  SCHOOL_DOCUMENTS,
  QUICK_LINKS,
  ACADEMIC_CALENDAR,
} from "@/lib/school-info";
import { ImageLightbox, type LightboxImage } from "@/components/chat/ImageLightbox";
import { toast } from "sonner";


// ── Suggestion chips ──────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Calendar, label: "Lịch học", prompt: "Lịch học học kỳ này của tôi như thế nào?" },
  { icon: Wallet, label: "Học phí", prompt: "Học phí kỳ này là bao nhiêu và đóng ở đâu?" },
  { icon: Award, label: "Học bổng", prompt: "Có những học bổng nào sinh viên có thể đăng ký?" },
  { icon: Home, label: "Ký túc xá", prompt: "Thủ tục đăng ký ở ký túc xá như thế nào?" },
  { icon: FileText, label: "Thủ tục sinh viên", prompt: "Làm sao để xin giấy xác nhận sinh viên?" },
  { icon: Phone, label: "Liên hệ phòng ban", prompt: "Liên hệ phòng Đào tạo bằng cách nào?" },
];

// ── Types ─────────────────────────────────────────────────────

type Props = {
  threadId: string;
  initialMessages: UIMessage[];
  onAfterFirstSend?: () => void;
};

// ── ChatWindow ────────────────────────────────────────────────

export function ChatWindow({ threadId, initialMessages, onAfterFirstSend }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Mock auth token ───
  const user = typeof window !== "undefined" ? authService.getCurrentUser() : null;
  const token = user ? `mock-token-${user.id}` : null;

  // ── Attachments ───────────────────────────────────────────
  const {
    attachments,
    fileInputRef,
    openFilePicker,
    onFileChange,
    handlePaste,
    removeAttachment,
    clearAttachments,
    getMetadata,
    getImages,
  } = useAttachments();

  // ── Voice input ───────────────────────────────────────────
  const handleTranscript = useCallback(
    (text: string) => {
      setInput(text);
      textareaRef.current?.focus();
    },
    [],
  );
  const { isRecording, isSupported: voiceSupported, toggleRecording } =
    useVoiceInput(handleTranscript);

  // ── Analytics tracking refs ──────────────────────────────
  const sendStartTimeRef = useRef<number>(0);
  const ragLayerRef = useRef<RagLayer>("none");
  const lastTrackedMsgCountRef = useRef<number>(0);

  // ── Chat (AI SDK) — custom fetch để đọc x-rag-layer header ──
  const transport = token
    ? new DefaultChatTransport({
        api: "/api/chat",
        headers: { Authorization: `Bearer ${token}` },
        body: { threadId },
        fetch: async (input, init) => {
          sendStartTimeRef.current = Date.now();
          ragLayerRef.current = "none";
          const res = await fetch(input, init);
          // Đọc header ngay khi nhận response (trước khi stream)
          const layer = res.headers.get("x-rag-layer");
          if (layer) ragLayerRef.current = layer as RagLayer;
          return res;
        },
      })
    : undefined;

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  // ── Ghi analytics khi bot trả lời xong ───────────────────
  useEffect(() => {
    // Chỉ ghi khi stream vừa hoàn thành (status: streaming → ready)
    if (status !== "ready") return;
    const assistantMsgs = messages.filter((m) => m.role === "assistant");
    if (assistantMsgs.length === 0) return;
    // Chỉ ghi khi có tin nhắn MỚI (so với lần trước)
    if (assistantMsgs.length <= lastTrackedMsgCountRef.current) return;
    lastTrackedMsgCountRef.current = assistantMsgs.length;

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const query = lastUser
      ? lastUser.parts.map((p: any) => p.text || "").join(" ").trim()
      : "";
    if (!query) return;

    const latencyMs = sendStartTimeRef.current > 0
      ? Date.now() - sendStartTimeRef.current
      : 0;

    analyticsService.recordEvent({
      threadId,
      query,
      ragLayer: ragLayerRef.current,
      latencyMs,
    });
  }, [status, messages, threadId]);

  // ── Image Lightbox State ───────────────────────────────────
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: LightboxImage[];
    initialIndex: number;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
  });

  const handleViewImage = useCallback(
    (images: LightboxImage[], index = 0) => {
      setLightboxState({
        isOpen: true,
        images,
        initialIndex: index,
      });
    },
    [],
  );


  const hasAutoTitledRef = useRef<Record<string, boolean>>({});

  // ── Sync messages to threadService & LLM Auto-title ────────
  useEffect(() => {
    const storedMessages: StoredMessage[] = messages.map((m) => {
      const parts = m.parts
        .filter((p) => p.type === "text" || p.type === "file")
        .map((p) => {
          if (p.type === "file") {
            const fp = p as FileUIPart;
            return {
              type: "file" as const,
              mediaType: fp.mediaType,
              url: fp.url,
              filename: fp.filename,
            };
          }
          return {
            type: "text" as const,
            text: (p as any).text ?? "",
          };
        });

      return {
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        parts,
        createdAt: (m as any).createdAt
          ? new Date((m as any).createdAt).toISOString()
          : new Date().toISOString(),
      };
    });

    threadService.setMessages(threadId, storedMessages);

    // Auto-title logic
    if (messages.length > 0) {
      const firstUserMsg = messages.find((m) => m.role === "user");
      if (firstUserMsg) {
        let sourceText = firstUserMsg.parts
          .map((p) => (p.type === "text" ? p.text : ""))
          .join(" ")
          .trim();

        if (!sourceText) {
          if (status !== "streaming" && status !== "submitted") {
            const firstAssistantMsg = messages.find((m) => m.role === "assistant");
            if (firstAssistantMsg) {
              const rawText = firstAssistantMsg.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join(" ")
                .trim();
              sourceText = rawText.replace(/[*#_`~]/g, "").trim();
            }
          }
        }

        if (sourceText) {
          // 1. Instant fallback title
          const currentThread = threadService.getThread(threadId);
          if (currentThread && currentThread.title === "Cuộc trò chuyện mới") {
            const words = sourceText.split(/\s+/).filter(Boolean);
            const instantTitle = words.slice(0, 7).join(" ") + (words.length > 7 ? "..." : "");
            threadService.autoTitleFromMessage(threadId, instantTitle);
          }

          // 2. LLM Smart Auto-Title when assistant response finishes
          const assistantDone = status !== "streaming" && status !== "submitted";
          const hasAssistantReply = messages.some((m) => m.role === "assistant");

          if (assistantDone && hasAssistantReply && !hasAutoTitledRef.current[threadId]) {
            hasAutoTitledRef.current[threadId] = true;
            fetch("/api/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                action: "generate-title",
                message: sourceText,
              }),
            })
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data?.title && data.title !== "Cuộc trò chuyện mới") {
                  threadService.renameThread(threadId, data.title);
                }
              })
              .catch((err) => {
                console.warn("LLM auto-title failed:", err);
              });
          }
        }
      }
    }
  }, [messages, threadId, status, token]);

  // ── Auto-scroll ───────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);


  // ── Re-focus on thread change ─────────────────────────────
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  // ── Auto-send pending message ─────────────────────────────
  useEffect(() => {
    const pendingKey = `pending:${threadId}`;
    const pendingImagesKey = `pending_images:${threadId}`;
    const pendingText = sessionStorage.getItem(pendingKey);
    if (pendingText) {
      sessionStorage.removeItem(pendingKey);
      const rawImages = sessionStorage.getItem(pendingImagesKey);
      sessionStorage.removeItem(pendingImagesKey);

      setTimeout(() => {
        if (rawImages) {
          try {
            const images = JSON.parse(rawImages) as Array<{
              name: string;
              contentType: string;
              dataUrl: string;
            }>;
            if (images.length > 0) {
              const fileParts: FileUIPart[] = images.map((img) => ({
                type: "file" as const,
                mediaType: img.contentType,
                filename: img.name,
                url: img.dataUrl,
              }));
              sendMessage({ text: pendingText, files: fileParts }).catch(console.error);
              onAfterFirstSend?.();
              return;
            }
          } catch {
            // ignore
          }
        }
        sendMessage({ text: pendingText }).catch(console.error);
        onAfterFirstSend?.();
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);



  const isLoading = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  // ── Send ──────────────────────────────────────────────────
  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    const meta: AttachmentMeta[] = getMetadata();
    const images: AttachmentImage[] = getImages();
    if (!trimmed && meta.length === 0) return;
    if (isLoading) return;

    // Non-image files → mention in text
    const otherFiles = meta.filter((f) => !f.type.startsWith("image/"));
    let enrichedText = trimmed;
    if (otherFiles.length > 0) {
      const fileList = otherFiles
        .map((f) => `- ${f.name} (${(f.size / 1024).toFixed(0)} KB)`)
        .join("\n");
      enrichedText = trimmed
        ? `${trimmed}\n\n📎 Tệp đính kèm:\n${fileList}`
        : `📎 Tệp đính kèm:\n${fileList}`;
    }

    setInput("");
    clearAttachments();

    // Images → FileUIPart[] so LLM can actually SEE them (correct AI SDK format)
    if (images.length > 0) {
      const fileParts: FileUIPart[] = images.map((img) => ({
        type: "file" as const,
        mediaType: img.contentType,
        filename: img.name,
        url: img.dataUrl, // base64 data URL
      }));
      await sendMessage({ text: enrichedText, files: fileParts });
    } else {
      await sendMessage({ text: enrichedText });
    }
    onAfterFirstSend?.();
  };

  // ── Quick ask event listener from InfoPanel ───────────────
  useEffect(() => {
    const handler = (e: any) => {
      const prompt = e.detail?.prompt;
      if (prompt && typeof prompt === "string") {
        handleSend(prompt);
      }
    };
    window.addEventListener("ibot_quick_ask", handler);
    return () => window.removeEventListener("ibot_quick_ask", handler);
  }, [handleSend]);

  // ── Thread title & Export actions ─────────────────────────
  const [showExportMenu, setShowExportMenu] = useState(false);
  const currentThread = threadService.getThread(threadId);
  const threadTitle = currentThread?.title || "Cuộc trò chuyện mới";

  const handleExportText = (format: "txt" | "md") => {
    let content = "";
    if (format === "md") {
      content += `# Báo Cáo Trích Xuất Tư Vấn Học Vụ iBot - ICTU\n\n`;
      content += `- **Chủ đề:** ${threadTitle}\n`;
      content += `- **Thời gian xuất:** ${new Date().toLocaleString("vi-VN")}\n`;
      content += `- **Hệ thống:** iBot - Trợ lý Sinh viên AI Trường Đại học CNTT & TT (ICTU)\n\n---\n\n`;
      for (const m of messages) {
        const role = m.role === "user" ? "### 👤 Sinh viên" : "### 🤖 Trợ lý iBot";
        const txt = m.parts.map((p: any) => p.text || "").join("");
        content += `${role}:\n${txt}\n\n`;
      }
    } else {
      content += `TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG (ICTU)\n`;
      content += `TÀI LIỆU TRÍCH XUẤT TƯ VẤN HỌC VỤ TỪ iBot\n`;
      content += `-----------------------------------------------------------\n`;
      content += `Chủ đề: ${threadTitle}\n`;
      content += `Thời gian xuất: ${new Date().toLocaleString("vi-VN")}\n`;
      content += `===========================================================\n\n`;
      for (const m of messages) {
        const role = m.role === "user" ? "[Sinh viên]" : "[Trợ lý iBot]";
        const txt = m.parts.map((p: any) => p.text || "").join("");
        content += `${role}:\n${txt}\n\n-----------------------------------------------------------\n\n`;
      }
    }
    const blob = new Blob([content], {
      type: format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = threadTitle.slice(0, 30).replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, "_");
    a.download = `iBot_${safeTitle}_${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    toast.success(`Đã tải xuống tệp .${format}`);
  };

  const handleExportPDF = () => {
    setShowExportMenu(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* ── HIDDEN FILE INPUT – lives in the DOM so React controls it ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={onFileChange}
        aria-hidden="true"
      />

      {/* ── Chat Header Bar with Title & Export (No-print) ── */}
      {!isEmpty && (
        <div className="sticky top-0 z-20 px-4 sm:px-6 py-2.5 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between no-print">
          <div className="min-w-0 flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-xs sm:max-w-md">
              {threadTitle}
            </span>
            <span className="text-[10px] text-muted-foreground/80 px-2 py-0.5 rounded-full bg-muted/60 shrink-0 font-medium">
              {messages.length} tin nhắn
            </span>
          </div>

          {/* Export Menu */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="h-8 text-xs rounded-xl gap-1.5 hover:border-primary/40 hover:text-primary transition-all shadow-sm"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline font-medium">Xuất hội thoại</span>
            </Button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl border border-border bg-card shadow-elevated p-1.5 z-50 animate-message-in text-xs space-y-0.5">
                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-muted font-medium transition-colors"
                  >
                    <Printer className="size-3.5 text-primary" />
                    <span>In / Lưu PDF</span>
                  </button>
                  <button
                    onClick={() => handleExportText("md")}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-muted font-medium transition-colors"
                  >
                    <FileDown className="size-3.5 text-emerald-600" />
                    <span>Tải Markdown (.md)</span>
                  </button>
                  <button
                    onClick={() => handleExportText("txt")}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-muted font-medium transition-colors"
                  >
                    <FileText className="size-3.5 text-blue-600" />
                    <span>Tải Văn bản (.txt)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {/* ── Print-only Academic Document Header ── */}
        <div className="print-only mb-6 border-b-2 border-primary pb-4 p-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>ĐẠI HỌC THÁI NGUYÊN</span>
            <span>HỆ THỐNG TRỢ LÝ ẢO iBot</span>
          </div>
          <h1 className="text-base font-bold text-gray-900 uppercase tracking-wide">
            TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG (ICTU)
          </h1>
          <h2 className="text-sm font-semibold text-primary mt-1">
            BẢN TRÍCH XUẤT NỘI DUNG TƯ VẤN HỌC VỤ & THỦ TỤC SINH VIÊN
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3 pt-2 border-t border-gray-200">
            <div><strong>Chủ đề:</strong> {threadTitle}</div>
            <div><strong>Thời gian xuất:</strong> {new Date().toLocaleString("vi-VN")}</div>
            <div><strong>Người dùng:</strong> {user?.name || user?.email || "Sinh viên ICTU"}</div>
            <div><strong>Nguồn dữ liệu:</strong> Cổng thông tin đào tạo & CSDL Quy chế ICTU</div>
          </div>
        </div>

        {isEmpty ? (
          <WelcomeScreen onSelect={handleSend} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 chat-print-container">
            {messages.map((m, idx) => {
              // Tìm câu hỏi gần nhất trước câu trả lời của trợ lý
              let userQuestion: string | undefined;
              if (m.role === "assistant") {
                for (let i = idx - 1; i >= 0; i--) {
                  if (messages[i].role === "user") {
                    userQuestion = messages[i].parts
                      .map((p: any) => (p.type === "text" ? p.text : ""))
                      .join("");
                    break;
                  }
                }
              }

              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onSend={handleSend}
                  onViewImage={handleViewImage}
                  threadId={threadId}
                  threadTitle={threadTitle}
                  userQuestion={userQuestion}
                />
              );
            })}
            {status === "submitted" && <TypingIndicator />}
            {error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive p-4 text-sm">
                Đã có lỗi xảy ra: {error.message}
              </div>
            )}
          </div>
        )}
      </div>


      {/* Composer area */}
      <div className="border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto px-4 sm:px-6 py-4 max-w-3xl">
          {/* Recording banner */}
          {isRecording && (
            <div className="flex items-center gap-2 mb-3 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-message-in">
              <span className="size-2 rounded-full bg-destructive animate-pulse shrink-0" />
              <span className="font-medium">🔴 Đang nghe...</span>
              <span className="text-xs text-destructive/70 ml-auto">Nhấn 🎤 để dừng</span>
            </div>
          )}

          {/* Composer box */}
          <div className="relative rounded-3xl border bg-card shadow-card focus-within:border-primary/40 focus-within:shadow-elevated transition-all">
            {/* Attachment previews */}
            <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Hỏi bất kỳ điều gì về trường của bạn..."
              rows={1}
              className="min-h-[60px] max-h-48 resize-none border-0 bg-transparent px-5 pt-4 pb-2 text-base focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
            />

            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                {/* 📎 Attachment button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={openFilePicker}
                  className={cn(
                    "size-9 rounded-xl transition-colors relative",
                    attachments.length > 0
                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                      : "text-muted-foreground",
                  )}
                  title="Đính kèm tệp (PDF, DOCX, TXT, MD, PNG, JPG)"
                >
                  <Paperclip className="size-4" />
                  {attachments.length > 0 && (
                    <span className="absolute -top-1 -right-1 size-[18px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold grid place-items-center leading-none">
                      {attachments.length}
                    </span>
                  )}
                </Button>

                {/* 🎤 Microphone button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={voiceSupported ? toggleRecording : undefined}
                  disabled={!voiceSupported}
                  className={cn(
                    "size-9 rounded-xl transition-colors relative",
                    isRecording
                      ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                      : "text-muted-foreground",
                    !voiceSupported && "opacity-40 cursor-not-allowed",
                  )}
                  title={
                    !voiceSupported
                      ? "Trình duyệt không hỗ trợ giọng nói"
                      : isRecording
                        ? "Dừng ghi âm"
                        : "Nhập bằng giọng nói (vi-VN)"
                  }
                >
                  {isRecording ? (
                    <>
                      <MicOff className="size-4" />
                      {/* Ping dot */}
                      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive animate-ping" />
                      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive" />
                    </>
                  ) : (
                    <Mic className="size-4" />
                  )}
                </Button>
              </div>

              {/* ↑ Send button */}
              <Button
                type="button"
                onClick={() => handleSend(input)}
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                size="icon"
                className="size-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Trợ lý có thể mắc sai sót. Hãy kiểm tra lại thông tin quan trọng với phòng Đào tạo.
          </p>
        </div>
      </div>

      {/* ── Interactive Image Lightbox ────────────────────────── */}
      <ImageLightbox
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        initialIndex={lightboxState.initialIndex}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

// ── WelcomeScreen ─────────────────────────────────────────────

function WelcomeScreen({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-primary text-primary-foreground shadow-card mb-2">
          <GraduationCap className="size-8" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            🎓 Trợ lý Sinh viên AI
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Hỏi bất kỳ điều gì về học phí, lịch học, học bổng, ký túc xá, thủ tục hành chính và các thông tin của trường.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
          {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              onClick={() => onSelect(prompt)}
              className="group text-left p-4 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-card transition-all"
            >
              <Icon className="size-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-medium text-sm">{label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Helper: extract suggestion items from bot response ──────────────────
// Looks for the "│💡 Bạn có thể hỏi thêm" section and extracts numbered items.
function parseSuggestedQuestions(markdown: string): {
  mainContent: string;
  suggestions: string[];
} {
  // Match section starting with any variation of the suggestions header
  const sectionRegex =
    /(?:###?\s*)?(?:💡|\u{1F4A1})\s*(?:Bạn có thể hỏi thêm|Câu hỏi liên quan)[\s\S]*$/u;
  const match = markdown.match(sectionRegex);
  if (!match) return { mainContent: markdown, suggestions: [] };

  const mainContent = markdown.slice(0, match.index).trimEnd();
  const sectionText = match[0];

  // Extract numbered or bulleted items: "1. text", "- text", "* text"
  const itemRegex = /^(?:\d+[.)\s]|-\s|\*\s)\s*(.+)$/gm;
  const suggestions: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(sectionText)) !== null) {
    const q = m[1].trim();
    if (q) suggestions.push(q);
  }

  return { mainContent, suggestions };
}

function MessageFeedback({
  messageId,
  text,
  threadId,
  threadTitle,
  userQuestion,
}: {
  messageId: string;
  text: string;
  threadId?: string;
  threadTitle?: string;
  userQuestion?: string;
}) {
  const existingFb = feedbackService.getFeedback(messageId);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(() => existingFb?.value ?? null);
  const [copied, setCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(() => bookmarkService.isBookmarked(messageId));
  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FeedbackReason>("wrong_info");
  const [customNote, setCustomNote] = useState("");

  const { speak, stop, isSpeaking, speakingId, isSupported: ttsSupported } = useTTS();
  const isThisSpeaking = isSpeaking && speakingId === messageId;

  useEffect(() => {
    const handler = () => setIsBookmarked(bookmarkService.isBookmarked(messageId));
    window.addEventListener("ibot_bookmarks_changed", handler);
    return () => window.removeEventListener("ibot_bookmarks_changed", handler);
  }, [messageId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleToggleBookmark = () => {
    const nextState = bookmarkService.toggleBookmark({
      messageId,
      threadId: threadId || "default",
      threadTitle: threadTitle || "Cuộc trò chuyện",
      question: userQuestion,
      answer: text,
    });

    setIsBookmarked(nextState);
    if (nextState) {
      toast.success("Đã ghim câu trả lời ⭐");
    } else {
      toast.info("Đã bỏ ghim câu trả lời");
    }
  };

  const handleThumbsUp = () => {
    if (feedback === "up") {
      setFeedback(null);
      feedbackService.removeFeedback(messageId);
      toast.info("Đã hủy đánh giá");
      return;
    }

    setFeedback("up");
    feedbackService.saveFeedback({
      messageId,
      value: "up",
      assistantSnippet: text.slice(0, 160),
      createdAt: new Date().toISOString(),
    });
    toast.success("Cảm ơn phản hồi tích cực của bạn! 🙏");
  };

  const handleThumbsDownClick = () => {
    if (feedback === "down") {
      setFeedback(null);
      feedbackService.removeFeedback(messageId);
      toast.info("Đã hủy đánh giá");
      return;
    }
    setShowModal(true);
  };

  const submitDownFeedback = () => {
    setFeedback("down");
    feedbackService.saveFeedback({
      messageId,
      value: "down",
      reason: selectedReason,
      note: customNote.trim() || undefined,
      assistantSnippet: text.slice(0, 160),
      createdAt: new Date().toISOString(),
    });
    setShowModal(false);
    toast.success("Cảm ơn bạn! Ý kiến đóng góp sẽ giúp iBot hoàn thiện hơn.");
  };

  return (
    <div className="relative mt-3 pt-2.5 border-t border-border/40 no-print">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          title={copied ? "Đã sao chép!" : "Sao chép câu trả lời"}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            copied
              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span>{copied ? "Đã chép" : "Sao chép"}</span>
        </button>

        {/* TTS Voice Button */}
        {ttsSupported && (
          <button
            onClick={() => (isThisSpeaking ? stop() : speak(text, messageId))}
            title={isThisSpeaking ? "Dừng đọc" : "Đọc to câu trả lời"}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
              isThisSpeaking
                ? "text-primary bg-primary/15 animate-pulse font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {isThisSpeaking ? (
              <VolumeX className="size-3.5 text-primary" />
            ) : (
              <Volume2 className="size-3.5" />
            )}
            <span>{isThisSpeaking ? "Dừng đọc" : "Đọc to"}</span>
          </button>
        )}

        {/* Bookmark Button */}
        <button
          onClick={handleToggleBookmark}
          title={isBookmarked ? "Đã ghim (bấm để bỏ ghim)" : "Ghim câu trả lời quan trọng"}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            isBookmarked
              ? "text-amber-600 bg-amber-500/15 font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <Bookmark className={cn("size-3.5", isBookmarked && "fill-amber-500 text-amber-500")} />
          <span>{isBookmarked ? "Đã ghim" : "Ghim"}</span>
        </button>

        <div className="w-px h-3.5 bg-border/60 mx-0.5" />

        {/* Feedback label */}
        <span className="text-xs text-muted-foreground/70 px-1 select-none">
          {feedback === "up" ? (
            <span className="text-emerald-600 font-medium">Hữu ích 👍</span>
          ) : feedback === "down" ? (
            <span className="text-rose-500 font-medium">Đã ghi nhận góp ý 📝</span>
          ) : (
            "Hữu ích không?"
          )}
        </span>

        {/* Thumbs up */}
        <button
          onClick={handleThumbsUp}
          title="Hữu ích"
          className={cn(
            "size-7 rounded-lg flex items-center justify-center transition-all duration-200",
            feedback === "up"
              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 scale-110"
              : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
          )}
        >
          <ThumbsUp className={cn("size-3.5 transition-transform", feedback === "up" && "fill-emerald-600")} />
        </button>

        {/* Thumbs down */}
        <button
          onClick={handleThumbsDownClick}
          title="Chưa hài lòng"
          className={cn(
            "size-7 rounded-lg flex items-center justify-center transition-all duration-200",
            feedback === "down"
              ? "text-rose-500 bg-rose-50 dark:bg-rose-950/40 scale-110"
              : "text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30",
          )}
        >
          <ThumbsDown className={cn("size-3.5 transition-transform", feedback === "down" && "fill-rose-500")} />
        </button>
      </div>


      {/* ── Feedback Reason Popover Modal ── */}
      {showModal && (
        <div className="mt-3 p-3.5 rounded-2xl border border-border/80 bg-card shadow-lg animate-message-in text-xs space-y-3 max-w-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-sm">Vì sao bạn chưa hài lòng?</span>
            <button
              onClick={() => setShowModal(false)}
              className="size-6 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {(Object.entries(FEEDBACK_REASONS_MAP) as [FeedbackReason, string][]).map(([key, label]) => (
              <label
                key={key}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-xl cursor-pointer border transition-colors",
                  selectedReason === key
                    ? "bg-primary/10 border-primary/40 text-foreground font-medium"
                    : "border-transparent hover:bg-muted/60 text-muted-foreground",
                )}
              >
                <input
                  type="radio"
                  name={`reason_${messageId}`}
                  value={key}
                  checked={selectedReason === key}
                  onChange={() => setSelectedReason(key)}
                  className="size-3.5 text-primary accent-primary"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Ghi chú thêm (tùy chọn)..."
            className="w-full px-2.5 py-1.5 rounded-xl border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModal(false)}
              className="h-7 text-xs rounded-lg"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={submitDownFeedback}
              className="h-7 text-xs rounded-lg bg-primary text-primary-foreground font-medium"
            >
              Gửi phản hồi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── MessageBubble ─────────────────────────────────────────────

function MessageBubble({
  message,
  onSend,
  onViewImage,
  threadId,
  threadTitle,
  userQuestion,
}: {
  message: UIMessage;
  onSend: (text: string) => void;
  onViewImage: (images: LightboxImage[], index: number) => void;
  threadId?: string;
  threadTitle?: string;
  userQuestion?: string;
}) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");


  // Images sent via files or directly as images → mapped to a consistent format
  const imageParts = message.parts
    .filter(
      (p) =>
        (p.type === "file" &&
          (Boolean((p as FileUIPart).mediaType?.startsWith("image/")) ||
            Boolean((p as any).url?.startsWith("data:image/")))) ||
        (p as any).type === "image"
    )
    .map((p: any) => ({
      type: "file",
      url: p.type === "image" ? (p.image instanceof URL ? p.image.toString() : p.image) : p.url,
      filename: p.filename || "image.png",
      mediaType: p.mediaType || p.mimeType || "image/png",
    })) as FileUIPart[];

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-message-in">
        <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
          {/* Inline image previews */}
          {imageParts.length > 0 && (
            <div
              className={cn(
                "grid gap-2 justify-end",
                imageParts.length === 1
                  ? "grid-cols-1 max-w-sm"
                  : imageParts.length === 2
                    ? "grid-cols-2 max-w-md"
                    : "grid-cols-2 sm:grid-cols-3 max-w-lg",
              )}
            >
              {imageParts.map((fp, i) => (
                <div
                  key={i}
                  className="group relative rounded-2xl overflow-hidden border border-border/50 bg-card/60 shadow-soft cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5 select-none"
                  onClick={() =>
                    onViewImage(
                      imageParts.map((p) => ({ url: p.url, filename: p.filename })),
                      i,
                    )
                  }
                >
                  <img
                    src={fp.url}
                    alt={fp.filename ?? "ảnh đính kèm"}
                    className="max-h-60 sm:max-h-72 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  {/* Subtle hover overlay badge */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5 pointer-events-none">
                    <div className="self-end px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-white border border-white/20 flex items-center gap-1 shadow-sm">
                      <span>🔍</span>
                      <span>Phóng to</span>
                    </div>
                    {fp.filename && (
                      <p className="truncate text-[11px] text-white/90 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md self-start max-w-full">
                        {fp.filename}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Text bubble */}
          {text && (
            <div className="rounded-2xl rounded-tr-sm bg-chat-user text-chat-user-foreground px-4 py-3 shadow-soft">
              <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Assistant bubble ──────────────────────────────────────
  const { mainContent, suggestions } = parseSuggestedQuestions(text);

  return (
    <div className="flex gap-3 animate-message-in">
      <div className="shrink-0 size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
        <Sparkles className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        {/* Main answer content */}
        <div className="prose-chat text-foreground">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) => {
                if (!src) return null;
                return (
                  <span
                    className="group relative inline-block my-2.5 rounded-2xl overflow-hidden border border-border/50 bg-card shadow-soft cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 select-none"
                    onClick={() =>
                      onViewImage([{ url: src, filename: alt || "Ảnh từ câu trả lời" }], 0)
                    }
                  >
                    <img
                      src={src}
                      alt={alt || "Ảnh minh họa"}
                      className="max-h-72 sm:max-h-80 w-auto object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                    <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-medium text-white border border-white/20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <span>🔍</span>
                      <span>Phóng to</span>
                    </span>
                  </span>
                );
              },
            }}
          >
            {mainContent || "​"}
          </ReactMarkdown>
        </div>

        {/* 💡 Clickable suggestion buttons */}
        {suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <span>💡</span> Bạn có thể hỏi thêm
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSend(q)}
                  className="group text-left text-sm px-4 py-2.5 rounded-xl border border-border/60 bg-background/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-150 flex items-start gap-2.5 shadow-sm"
                >
                  <span className="shrink-0 size-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold grid place-items-center mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Feedback bar ── */}
        {text && (
          <MessageFeedback
            messageId={message.id}
            text={text}
            threadId={threadId}
            threadTitle={threadTitle}
            userQuestion={userQuestion}
          />
        )}
      </div>
    </div>
  );

}



// ── TypingIndicator ───────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
        <Sparkles className="size-4" />
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-muted text-muted-foreground">
        <span className="typing-dot" style={{ animationDelay: "0s" }} />
        <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
        <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}

// ── InfoPanel ─────────────────────────────────────────────────

export function InfoPanel() {
  const askQuestion = (query: string) => {
    window.dispatchEvent(new CustomEvent("ibot_quick_ask", { detail: { prompt: query } }));
  };

  return (
    <aside className="hidden xl:flex flex-col w-80 shrink-0 border-l bg-card/30 p-5 gap-5 overflow-y-auto scrollbar-thin">
      {/* ── Thông báo mới nhất ── */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Bell className="size-3.5 text-amber-500" /> Thông báo học vụ
          </h3>
          <span className="text-[10px] text-muted-foreground/70">Mới nhất</span>
        </div>
        <div className="space-y-2">
          {SCHOOL_NOTICES.map((n) => (
            <div
              key={n.id}
              onClick={() => askQuestion(n.queryHint)}
              className="group p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-soft transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <span className="px-1.5 py-0.5 rounded-md font-medium text-[10px] bg-primary/10 text-primary">
                  {n.tag}
                </span>
                <span className="text-muted-foreground/70 text-[10px]">{n.date}</span>
              </div>
              <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                {n.title}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity">
                <MessageSquare className="size-2.5" />
                <span>Hỏi iBot về mục này</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tài liệu & Quy chế ── */}
      <section>
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
          <BookOpen className="size-3.5 text-blue-500" /> Tài liệu & Quy chế
        </h3>
        <div className="space-y-2">
          {SCHOOL_DOCUMENTS.map((doc) => (
            <div
              key={doc.id}
              onClick={() => askQuestion(doc.queryHint)}
              className="group flex items-start gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-card/90 transition-all cursor-pointer"
            >
              <div className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 mt-0.5">
                <FileText className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-snug truncate">
                  {doc.title}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span>{doc.category}</span>
                  {doc.fileSize && <span>• {doc.fileSize}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Liên kết nhanh ── */}
      <section>
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
          <LinkIcon className="size-3.5 text-emerald-500" /> Cổng dịch vụ SV
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {link.title}
                </span>
                <ExternalLink className="size-3 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[10px] text-muted-foreground/80 mt-1 truncate">
                {link.shortDesc}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Lịch học vụ quan trọng ── */}
      <section>
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
          <CalendarDays className="size-3.5 text-violet-500" /> Mốc tiến độ học vụ
        </h3>
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2.5 text-xs">
          {ACADEMIC_CALENDAR.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    item.status === "current"
                      ? "bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse"
                      : item.status === "upcoming"
                        ? "bg-amber-500"
                        : "bg-muted-foreground/40",
                  )}
                />
                <span className="text-muted-foreground truncate">{item.event}</span>
              </div>
              <span
                className={cn(
                  "font-medium shrink-0 text-[11px]",
                  item.status === "current" ? "text-emerald-600 font-semibold" : "text-foreground",
                )}
              >
                {item.date}
              </span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

