import { useEffect, useState, useCallback, useRef } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { downloadImage, copyImageToClipboard } from "@/lib/imageUtils";
import { toast } from "sonner";

export interface LightboxImage {
  url: string;
  filename?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Sync index when opening or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
      setCopied(false);
    }
  }, [isOpen, initialIndex]);

  const current = images[currentIndex] || images[0];

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  }, [images.length]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.3, 3.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.3, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleCopy = async () => {
    if (!current?.url) return;
    const ok = await copyImageToClipboard(current.url);
    if (ok) {
      setCopied(true);
      toast.success("Đã sao chép ảnh vào clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Không thể sao chép ảnh trên trình duyệt này");
    }
  };

  const handleDownload = () => {
    if (!current?.url) return;
    const fallbackName = `chat-image-${Date.now()}.png`;
    downloadImage(current.url, current.filename || fallbackName);
    toast.success("Đang tải ảnh xuống máy...");
  };

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.15, 3.5));
    } else {
      setZoom((z) => Math.max(z - 0.15, 0.5));
    }
  };

  // Drag pan when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Double click toggles zoom
  const handleDoubleClick = () => {
    if (zoom > 1) {
      handleResetZoom();
    } else {
      setZoom(1.8);
    }
  };

  if (!isOpen || !current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <div
        className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 bg-black/40 backdrop-blur-lg border-b border-white/10 z-20 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* File name & index */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-lg bg-primary/20 text-primary-foreground border border-primary/30 grid place-items-center shrink-0">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-md text-white/95">
              {current.filename || "Ảnh đính kèm"}
            </p>
            {images.length > 1 && (
              <p className="text-xs text-white/60">
                {currentIndex + 1} / {images.length}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 gap-1 border border-white/10">
            <button
              onClick={handleZoomOut}
              title="Thu nhỏ (-)"
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="text-xs px-1.5 font-mono text-white/90 min-w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Phóng to (+)"
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Khôi phục kích thước ban đầu (0)"
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>

          {/* Rotate */}
          <button
            onClick={handleRotate}
            title="Xoay ảnh 90°"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition-colors"
          >
            <RotateCw className="size-4" />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            title="Sao chép ảnh"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition-colors"
          >
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            title="Tải ảnh về máy"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition-colors"
          >
            <Download className="size-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            title="Đóng (ESC)"
            className="p-2 ml-1 rounded-xl bg-white/15 hover:bg-rose-500/80 text-white border border-white/15 hover:border-rose-400/50 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Main Viewport ───────────────────────────────────────── */}
      <div
        className="relative flex-1 w-full flex items-center justify-center overflow-hidden p-4"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        {/* Navigation Previous */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            title="Ảnh trước (Mũi tên trái)"
            className="absolute left-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all shadow-xl z-20 hover:scale-105"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        {/* Current Image */}
        <div
          className="relative transition-transform duration-100 ease-out flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={current.url}
            alt={current.filename || "Ảnh đính kèm"}
            className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
            draggable={false}
          />
        </div>

        {/* Navigation Next */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            title="Ảnh tiếp theo (Mũi tên phải)"
            className="absolute right-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-all shadow-xl z-20 hover:scale-105"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      {/* ── Bottom Info / Helper Hints ──────────────────────────── */}
      <div
        className="w-full flex items-center justify-center px-4 py-2.5 bg-black/40 backdrop-blur-md text-white/60 text-xs text-center border-t border-white/10 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hidden sm:inline">
          💡 Cuộn chuột hoặc bấm +/- để phóng to • Nhấn đúp để phóng nhanh • Kéo để di chuyển • Phím ESC để đóng
        </span>
        <span className="sm:hidden">
          Chạm đúp để phóng to • Nhấn X để đóng
        </span>
      </div>
    </div>
  );
}
