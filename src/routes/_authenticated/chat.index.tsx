import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useThreads } from "@/hooks/useThreads";
import { useAttachments, ACCEPT_ATTR, type AttachmentImage } from "@/hooks/useAttachments";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { AttachmentPreview } from "@/components/chat/AttachmentPreview";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUp, GraduationCap, Mic, MicOff, Paperclip, Loader2,
  Calendar, Wallet, Award, Home, FileText, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Trợ lý Sinh viên AI" },
      { name: "description", content: "Trợ lý AI cho sinh viên đại học – học phí, lịch học, học bổng, ký túc xá." },
    ],
  }),
  component: ChatHome,
});

const SUGGESTIONS = [
  { icon: Calendar, label: "Lịch học", prompt: "Lịch học học kỳ này của tôi như thế nào?" },
  { icon: Wallet, label: "Học phí", prompt: "Học phí kỳ này là bao nhiêu và đóng ở đâu?" },
  { icon: Award, label: "Học bổng", prompt: "Có những học bổng nào sinh viên có thể đăng ký?" },
  { icon: Home, label: "Ký túc xá", prompt: "Thủ tục đăng ký ở ký túc xá như thế nào?" },
  { icon: FileText, label: "Thủ tục sinh viên", prompt: "Làm sao để xin giấy xác nhận sinh viên?" },
  { icon: Phone, label: "Liên hệ phòng ban", prompt: "Liên hệ phòng Đào tạo bằng cách nào?" },
];

function ChatHome() {
  const navigate = useNavigate();
  const { createThread } = useThreads();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // ── Attachments ────────────────────────────────────────────
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

  // ── Voice input ────────────────────────────────────────────
  const handleTranscript = useCallback((text: string) => {
    setInput(text);
    taRef.current?.focus();
  }, []);
  const { isRecording, isSupported: voiceSupported, toggleRecording } =
    useVoiceInput(handleTranscript);

  useEffect(() => { taRef.current?.focus(); }, []);

  const startWith = (text: string) => {
    const trimmed = text.trim();
    const meta = getMetadata();
    const images: AttachmentImage[] = getImages();
    if (!trimmed && meta.length === 0) return;
    if (loading) return;
    setLoading(true);
    try {
      // Non-image files → mention in text
      const otherFiles = meta.filter((f) => !f.type.startsWith("image/"));
      let enrichedText = trimmed;
      if (otherFiles.length > 0) {
        const fileList = otherFiles.map((f) => `- ${f.name} (${(f.size / 1024).toFixed(0)} KB)`).join("\n");
        enrichedText = trimmed
          ? `${trimmed}\n\n📎 Tệp đính kèm:\n${fileList}`
          : `📎 Tệp đính kèm:\n${fileList}`;
      }
      const thread = createThread();
      sessionStorage.setItem(`pending:${thread.id}`, enrichedText);
      if (images.length > 0) {
        sessionStorage.setItem(`pending_images:${thread.id}`, JSON.stringify(images));
      }
      clearAttachments();
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={onFileChange}
        aria-hidden="true"
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-12">
          <div className="max-w-2xl w-full text-center space-y-6">
            <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-primary text-primary-foreground shadow-card mb-2">
              <GraduationCap className="size-8" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">🎓 Trợ lý Sinh viên AI</h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                Hỏi bất kỳ điều gì về học phí, lịch học, học bổng, ký túc xá, thủ tục hành chính và các thông tin của trường.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
              {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => startWith(prompt)}
                  disabled={loading}
                  className="group text-left p-4 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-card transition-all disabled:opacity-50"
                >
                  <Icon className="size-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-medium text-sm">{label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
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
            <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />

            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  startWith(input);
                }
              }}
              placeholder="Hỏi bất kỳ điều gì về trường của bạn..."
              rows={1}
              className="min-h-[60px] max-h-48 resize-none border-0 bg-transparent px-5 pt-4 pb-2 text-base focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
            />

            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                {/* 📎 Attachment */}
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

                {/* 🎤 Voice */}
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
                      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive animate-ping" />
                      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive" />
                    </>
                  ) : (
                    <Mic className="size-4" />
                  )}
                </Button>
              </div>

              {/* ↑ Send */}
              <Button
                type="button"
                onClick={() => startWith(input)}
                disabled={loading || (!input.trim() && attachments.length === 0)}
                size="icon"
                className="size-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
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
