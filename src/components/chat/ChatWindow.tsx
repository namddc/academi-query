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
import { authService } from "@/services/authService";
import { threadService } from "@/services/threadService";

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

  // ── Mock auth token ───────────────────────────────────────
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

  // ── Chat (AI SDK) ─────────────────────────────────────────
  const transport = token
    ? new DefaultChatTransport({
        api: "/api/chat",
        headers: { Authorization: `Bearer ${token}` },
        body: { threadId },
      })
    : undefined;

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  // ── Sync to localStorage ──────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;

    const storedMessages = messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system",
      parts: m.parts
        .filter((p) => p.type === "text")
        .map((p) => ({ type: "text" as const, text: p.text })),
      createdAt: (m as any).createdAt ? new Date((m as any).createdAt).toISOString() : new Date().toISOString(),
    }));

    threadService.setMessages(threadId, storedMessages);

    // Auto-title if we just sent the first message
    if (messages.length > 0 && messages[0].role === "user") {
      const firstText = messages[0].parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join(" ");
      threadService.autoTitleFromMessage(threadId, firstText);
    }
  }, [messages, threadId]);

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

  return (
    <div className="flex flex-col h-full">
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

      {/* Message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {isEmpty ? (
          <WelcomeScreen onSelect={handleSend} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onSend={handleSend} />
            ))}
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

// ── Message Feedback ─────────────────────────────────────────

type FeedbackValue = "up" | "down" | null;

function getFeedbackKey(messageId: string) {
  return `ibot_feedback_${messageId}`;
}

function loadFeedback(messageId: string): FeedbackValue {
  try {
    const raw = localStorage.getItem(getFeedbackKey(messageId));
    return (raw as FeedbackValue) ?? null;
  } catch {
    return null;
  }
}

function saveFeedback(messageId: string, value: FeedbackValue) {
  try {
    if (value) localStorage.setItem(getFeedbackKey(messageId), value);
    else localStorage.removeItem(getFeedbackKey(messageId));
  } catch {}
}

function MessageFeedback({ messageId, text }: { messageId: string; text: string }) {
  const [feedback, setFeedback] = useState<FeedbackValue>(() => loadFeedback(messageId));
  const [copied, setCopied] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  const handleFeedback = (value: "up" | "down") => {
    const next = feedback === value ? null : value;
    setFeedback(next);
    saveFeedback(messageId, next);
    if (next) {
      setShowThanks(true);
      setTimeout(() => setShowThanks(false), 2000);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-border/40">
      {/* Copy button */}
      <button
        onClick={handleCopy}
        title={copied ? "Đã sao chép!" : "Sao chép câu trả lời"}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
          copied
            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        <span>{copied ? "Đã chép" : "Sao chép"}</span>
      </button>

      <div className="w-px h-3.5 bg-border/60 mx-0.5" />

      {/* Feedback label */}
      <span className="text-xs text-muted-foreground/70 px-1 select-none">
        {showThanks ? (
          <span className="text-primary font-medium animate-message-in">Cảm ơn phản hồi! 🙏</span>
        ) : (
          "Câu trả lời có hữu ích không?"
        )}
      </span>

      {/* Thumbs up */}
      <button
        onClick={() => handleFeedback("up")}
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
        onClick={() => handleFeedback("down")}
        title="Chưa hữu ích"
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
  );
}

// ── MessageBubble ─────────────────────────────────────────────

function MessageBubble({
  message,
  onSend,
}: {
  message: UIMessage;
  onSend: (text: string) => void;
}) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  // Images sent via files → stored as 'file' parts in the message
  const imageParts = message.parts.filter(
    (p): p is FileUIPart => p.type === "file" && (p as FileUIPart).mediaType?.startsWith("image/"),
  ) as FileUIPart[];

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-message-in">
        <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
          {/* Inline image previews */}
          {imageParts.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {imageParts.map((fp, i) => (
                <img
                  key={i}
                  src={fp.url}
                  alt={fp.filename ?? "ảnh đính kèm"}
                  className="max-h-64 max-w-full rounded-2xl object-cover shadow-soft border border-border/30 cursor-zoom-in"
                  onClick={() => window.open(fp.url, "_blank")}
                />
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{mainContent || "​"}</ReactMarkdown>
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
        {text && <MessageFeedback messageId={message.id} text={text} />}
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
  return (
    <aside className="hidden xl:flex flex-col w-80 shrink-0 border-l bg-card/30 p-6 gap-6 overflow-y-auto scrollbar-thin">
      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Bell className="size-4 text-accent" /> Thông báo mới nhất
        </h3>
        <ul className="space-y-2.5">
          {[
            "Hạn đóng học phí kỳ 2: 15/01",
            "Mở đăng ký học bổng KKHT đợt 1",
            "Lịch thi cuối kỳ đã được công bố",
          ].map((t) => (
            <li
              key={t}
              className="text-sm rounded-xl bg-card border p-3 hover:shadow-soft transition-shadow cursor-pointer"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <BookOpen className="size-4 text-primary" /> Tài liệu liên quan
        </h3>
        <ul className="space-y-2">
          {["Quy chế đào tạo tín chỉ", "Sổ tay sinh viên 2025", "Quy định ký túc xá"].map((t) => (
            <li key={t}>
              <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                <FileText className="size-3.5" /> {t}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <LinkIcon className="size-4 text-secondary" /> Liên kết nhanh
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {["Cổng SV", "Đăng ký HP", "Tra cứu điểm", "Email SV"].map((t) => (
            <a
              key={t}
              className="text-xs text-center rounded-xl border bg-card py-2.5 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
            >
              {t}
            </a>
          ))}
        </div>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <CalendarDays className="size-4 text-accent" /> Lịch học vụ
        </h3>
        <div className="rounded-xl border bg-card p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bắt đầu HK2</span>
            <span className="font-medium">06/01</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Thi giữa kỳ</span>
            <span className="font-medium">10/03</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Thi cuối kỳ</span>
            <span className="font-medium">20/05</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
