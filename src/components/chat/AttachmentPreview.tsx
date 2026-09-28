import { X, Loader2 } from "lucide-react";
import { type AttachmentFile, formatFileSize, fileIcon } from "@/hooks/useAttachments";
import { cn } from "@/lib/utils";

interface Props {
  attachments: AttachmentFile[];
  onRemove: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: Props) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-5 pt-3 pb-1">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="relative flex items-center gap-2.5 rounded-xl border bg-muted/60 px-3 py-2 text-sm max-w-[260px] group animate-message-in"
        >
          {/* Image thumbnail OR file icon */}
          {att.previewUrl ? (
            <img
              src={att.previewUrl}
              alt={att.name}
              className="size-9 rounded-lg object-cover shrink-0 border"
            />
          ) : (
            <span className="text-xl shrink-0 leading-none">
              {fileIcon(att.type, att.name)}
            </span>
          )}

          {/* File info */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-xs leading-snug">{att.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {att.progress !== null ? (
                <>
                  <Loader2 className="size-3 animate-spin text-muted-foreground shrink-0" />
                  <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-200"
                      style={{ width: `${att.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {att.progress}%
                  </span>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {formatFileSize(att.size)}
                </p>
              )}
            </div>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove(att.id)}
            className={cn(
              "size-5 rounded-full bg-foreground/10 hover:bg-destructive hover:text-destructive-foreground",
              "grid place-items-center transition-all shrink-0",
            )}
            aria-label={`Xóa ${att.name}`}
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
