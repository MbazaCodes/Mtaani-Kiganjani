/**
 * compressImage
 *
 * Compresses an image file using the Canvas API before storing as base64.
 * Reduces a 3–5 MB selfie to ~150–300 KB — an 80%+ reduction.
 *
 * Settings:
 *   maxWidth / maxHeight : 800px (keeps faces sharp, reduces data size)
 *   quality              : 0.72  (JPEG — good quality, small file)
 *   outputType           : image/jpeg (always JPEG output for consistency)
 *
 * Usage:
 *   const base64 = await compressImage(file);
 *   // or with custom options:
 *   const base64 = await compressImage(file, { maxWidth: 600, quality: 0.65 });
 *
 * Falls back to raw FileReader result if canvas is unavailable (e.g. in tests).
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: "image/jpeg" | "image/webp" | "image/png";
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.72,
  outputType: "image/jpeg",
};

export async function compressImage(file: File, options: CompressOptions = {}): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    // Skip compression for non-image files or very small files (< 100 KB)
    if (!file.type.startsWith("image/") || file.size < 100 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > opts.maxWidth || height > opts.maxHeight) {
        const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Canvas not available — fall back to raw read
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("FileReader fallback failed"));
        reader.readAsDataURL(file);
        return;
      }

      // White background for JPEG (transparent → black otherwise)
      if (opts.outputType === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL(opts.outputType, opts.quality);
      resolve(compressed);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };

    img.src = objectUrl;
  });
}

/** Convenience: compress and return just the base64 data (no data: prefix) */
export async function compressImageToBase64(
  file: File,
  options?: CompressOptions,
): Promise<string> {
  const dataUrl = await compressImage(file, options);
  return dataUrl.split(",")[1] ?? dataUrl;
}

/** Get human-readable file size */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
