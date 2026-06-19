/**
 * fileStorage.ts — Supabase Storage upload utility
 *
 * At scale, storing base64 files inside DB rows (form_data JSONB) causes:
 *   - Row sizes of 5-10MB per application
 *   - Slow SELECT queries (Postgres must read entire JSONB blob)
 *   - High Supabase DB egress costs
 *
 * This module uploads files to Supabase Storage (S3-backed object store)
 * and returns a public URL to store in form_data instead.
 *
 * Bucket: "application-documents" (create in Supabase Dashboard → Storage)
 * Policy: authenticated users can upload; staff/admin can read all
 */

import { supabase } from "@/lib/supabase";

const BUCKET = "application-documents";
const MAX_FILE_SIZE_MB = 10;

export interface UploadedFile {
  type: string;
  name: string;
  url: string;       // public URL — store this in form_data
  size: number;
  path: string;      // storage path for deletion
}

/**
 * Upload a single file to Supabase Storage.
 * Returns a public URL or null on failure.
 */
export async function uploadFile(
  file: File,
  userId: string,
  applicationId: string,
  docType = "support",
): Promise<UploadedFile | null> {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    console.warn(`[fileStorage] File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    return null;
  }

  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${applicationId}/${docType}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("[fileStorage] Upload failed:", error.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    type: docType,
    name: file.name,
    url: urlData.publicUrl,
    size: file.size,
    path,
  };
}

/**
 * Upload multiple files in parallel.
 * Falls back to base64 if storage upload fails (keeps app working even without bucket).
 */
export async function uploadFiles(
  files: File[],
  userId: string,
  applicationId: string,
  docTypes: string[] = [],
): Promise<{ type: string; name: string; url?: string; dataUrl?: string; size: number }[]> {
  const results = await Promise.allSettled(
    files.map((file, i) =>
      uploadFile(file, userId, applicationId, docTypes[i] ?? "support"),
    ),
  );

  const uploaded: { type: string; name: string; url?: string; dataUrl?: string; size: number }[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const file = files[i];
    const docType = docTypes[i] ?? "support";

    if (result.status === "fulfilled" && result.value) {
      // Storage upload succeeded — store URL only (no base64 in DB)
      uploaded.push({
        type: result.value.type,
        name: result.value.name,
        url: result.value.url,
        size: result.value.size,
      });
    } else {
      // Fallback: base64 for files under 2MB if storage failed
      if (file.size <= 2 * 1024 * 1024) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          uploaded.push({ type: docType, name: file.name, dataUrl, size: file.size });
        } catch {
          /* skip unreadable file */
        }
      }
    }
  }

  return uploaded;
}

/**
 * Delete a file from storage (e.g., when application is cancelled)
 */
export async function deleteFile(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}
