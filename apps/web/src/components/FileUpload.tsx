"use client";

import { useState } from "react";
import { uploadToS3 } from "@/lib/upload";

interface Props {
  scope: "documents" | "invoices" | "receipts" | "cards";
  label?: string;
  accept?: string;
  onUploaded: (url: string, file: File) => void;
}

// Reusable direct-to-S3 uploader with progress. Emits the canonical S3 URL once
// the upload completes so the parent can persist it against its record.
export function FileUpload({ scope, label = "Upload file", accept, onUploaded }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const url = await uploadToS3(file, scope, setProgress);
      onUploaded(url, file);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(null);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label className="btn btn-ghost cursor-pointer inline-block">
        {progress !== null ? `Uploading ${progress}%` : `📎 ${label}`}
        <input type="file" accept={accept} className="hidden" onChange={onChange} disabled={progress !== null} />
      </label>
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
