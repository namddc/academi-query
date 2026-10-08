import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { compressImageFile } from "@/lib/imageUtils";

// ── Constants ────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ACCEPTED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/gif": "GIF",
  "image/webp": "WEBP",
  "image/bmp": "BMP",
};

export const ACCEPT_ATTR =
  Object.keys(ACCEPTED_MIME_TYPES).join(",") + ",.md,.docx,.txt,.pdf,.png,.jpg,.jpeg";

// ── Types ────────────────────────────────────────────────────

export interface AttachmentFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  /** 0-100 while uploading, null = done */
  progress: number | null;
  previewUrl?: string;
}

export interface AttachmentMeta {
  name: string;
  size: number;
  type: string;
}

export interface AttachmentImage {
  name: string;
  contentType: string;
  dataUrl: string;
}

export interface UseAttachmentsReturn {
  attachments: AttachmentFile[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  openFilePicker: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Call this from onPaste on the Textarea to support Ctrl+V image paste */
  handlePaste: (e: React.ClipboardEvent) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  getMetadata: () => AttachmentMeta[];
  /** Returns image attachments with their base64 data URLs (for vision AI) */
  getImages: () => AttachmentImage[];
}

// ── Hook ─────────────────────────────────────────────────────

export function useAttachments(): UseAttachmentsReturn {
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  // Use a ref for the <input> that lives in JSX (not created dynamically)
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const processFiles = useCallback((files: File[]) => {
    const valid: AttachmentFile[] = [];

    for (const file of files) {
      const isAcceptedMime = Object.keys(ACCEPTED_MIME_TYPES).includes(file.type);
      const isAcceptedExt = /\.(md|docx|txt|pdf|png|jpg|jpeg)$/i.test(file.name);

      if (!isAcceptedMime && !isAcceptedExt) {
        toast.error(`"${file.name}" — định dạng không được hỗ trợ.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" vượt quá giới hạn 10 MB.`);
        continue;
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      valid.push({ id, file, name: file.name, size: file.size, type: file.type, progress: 0 });

      // Generate image preview (compressed & optimized for AI vision and chat storage)
      if (file.type.startsWith("image/")) {
        compressImageFile(file, 1280, 0.82)
          .then(({ dataUrl, contentType }) => {
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === id ? { ...a, previewUrl: dataUrl, type: contentType } : a,
              ),
            );
          })
          .catch(() => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              setAttachments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, previewUrl: ev.target?.result as string } : a)),
              );
            };
            reader.readAsDataURL(file);
          });
      }
    }

    if (!valid.length) return;
    setAttachments((prev) => [...prev, ...valid]);

    // Simulate upload progress
    valid.forEach(({ id }) => {
      let p = 0;
      const tick = setInterval(() => {
        p += Math.random() * 35 + 15;
        if (p >= 100) {
          clearInterval(tick);
          setAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, progress: null } : a)),
          );
        } else {
          setAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, progress: Math.round(p) } : a)),
          );
        }
      }, 100);
    });
  }, []);

  // Called by the JSX <input onChange={...}>
  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      processFiles(files);
    },
    [processFiles],
  );

  // ── Paste handler (Ctrl+V) ────────────────────────────────
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((item) => item.kind === "file" && item.type.startsWith("image/"));

      if (imageItems.length === 0) return; // no image — let default text paste proceed

      // Prevent pasting image as broken text into the textarea
      e.preventDefault();

      const files: File[] = [];
      imageItems.forEach((item) => {
        const file = item.getAsFile();
        if (!file) return;
        // Give a friendly name with timestamp so multiple pastes are distinguishable
        const ext = file.type.split("/")[1] ?? "png";
        const named = new File([file], `screenshot-${Date.now()}.${ext}`, { type: file.type });
        files.push(named);
      });

      if (files.length > 0) {
        processFiles(files);
        toast.success(`Đã dán ${files.length > 1 ? `${files.length} ảnh` : "ảnh"} vào hộp chat`);
      }
    },
    [processFiles],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => setAttachments([]), []);

  const getMetadata = useCallback(
    (): AttachmentMeta[] => attachments.map(({ name, size, type }) => ({ name, size, type })),
    [attachments],
  );

  // Returns image attachments that have a fully loaded base64 preview URL
  const getImages = useCallback(
    (): AttachmentImage[] =>
      attachments
        .filter((a) => a.type.startsWith("image/") && !!a.previewUrl)
        .map((a) => ({ name: a.name, contentType: a.type, dataUrl: a.previewUrl! })),
    [attachments],
  );

  return {
    attachments,
    fileInputRef,
    openFilePicker,
    onFileChange,
    handlePaste,
    removeAttachment,
    clearAttachments,
    getMetadata,
    getImages,
  };
}

// ── Helpers ───────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileIcon(type: string, name: string): string {
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type.includes("word") || name.endsWith(".docx")) return "📝";
  if (type === "text/plain") return "📃";
  if (name.endsWith(".md")) return "📋";
  return "📎";
}
