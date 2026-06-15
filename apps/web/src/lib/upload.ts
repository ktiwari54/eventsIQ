import { apiSend } from "./client";

interface PresignResult {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

/**
 * Client-side direct-to-S3 upload: ask the API for a presigned URL, PUT the
 * file straight to S3, then return the canonical URL to persist. Optionally
 * reports progress via XHR.
 */
export async function uploadToS3(
  file: File,
  scope: "documents" | "invoices" | "receipts" | "cards",
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { uploadUrl, publicUrl } = await apiSend<PresignResult>("/api/uploads/presign", "POST", {
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    scope,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });

  return publicUrl;
}
