/**
 * Image compression and interaction utilities for chat attachments & lightbox.
 */

export async function compressImageFile(
  file: File,
  maxDimension = 1280,
  quality = 0.82,
): Promise<{ dataUrl: string; contentType: string }> {
  return new Promise((resolve) => {
    // If SVG or gif (animations), do not compress with canvas
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          dataUrl: (e.target?.result as string) || "",
          contentType: file.type,
        });
      };
      reader.onerror = () => resolve({ dataUrl: "", contentType: file.type });
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = (e.target?.result as string) || "";
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Only scale down if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve({ dataUrl: rawDataUrl, contentType: file.type });
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/jpeg for photos to save max storage & bandwidth, image/png for transparent images
        const targetType = file.type === "image/png" ? "image/jpeg" : file.type || "image/jpeg";
        try {
          const compressedDataUrl = canvas.toDataURL(targetType, quality);
          resolve({
            dataUrl: compressedDataUrl,
            contentType: targetType,
          });
        } catch {
          resolve({ dataUrl: rawDataUrl, contentType: file.type });
        }
      };

      img.onerror = () => {
        resolve({ dataUrl: rawDataUrl, contentType: file.type });
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      resolve({ dataUrl: "", contentType: file.type });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Safely downloads an image (works for base64 data URLs as well as standard URLs).
 */
export async function downloadImage(url: string, filename = "attachment.jpg") {
  try {
    let blob: Blob;
    if (url.startsWith("data:")) {
      const res = await fetch(url);
      blob = await res.blob();
    } else {
      const res = await fetch(url, { mode: "cors" });
      blob = await res.blob();
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    console.error("Failed to download image:", err);
    // Fallback: direct link download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Copies image to clipboard if supported by browser.
 */
export async function copyImageToClipboard(url: string): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      return false;
    }

    let blob: Blob;
    if (url.startsWith("data:")) {
      const res = await fetch(url);
      blob = await res.blob();
    } else {
      const res = await fetch(url, { mode: "cors" });
      blob = await res.blob();
    }

    // ClipboardItem only supports image/png reliably across browsers
    let pngBlob = blob;
    if (blob.type !== "image/png") {
      // Convert to PNG blob via canvas
      const img = new Image();
      const loaded = new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
      img.src = url;
      const ok = await loaded;
      if (!ok) return false;

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      ctx.drawImage(img, 0, 0);

      pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas conversion failed"))), "image/png");
      });
    }

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngBlob }),
    ]);
    return true;
  } catch (err) {
    console.warn("Failed to copy image to clipboard:", err);
    return false;
  }
}
