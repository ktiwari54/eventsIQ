import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// AWS S3 storage helper. The browser uploads directly to S3 via a short-lived
// presigned PUT URL — the file never transits the API server, which keeps the
// serverless request path fast and within body-size limits.

const REGION = process.env.AWS_REGION ?? "ap-south-1";
const BUCKET = process.env.AWS_S3_BUCKET ?? "eventiq-uploads";

const globalForS3 = globalThis as unknown as { s3?: S3Client };
export const s3 =
  globalForS3.s3 ??
  new S3Client({
    region: REGION,
    ...(process.env.AWS_ACCESS_KEY_ID
      ? {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
          },
        }
      : {}),
  });
if (process.env.NODE_ENV !== "production") globalForS3.s3 = s3;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export interface PresignResult {
  key: string;
  uploadUrl: string; // presigned PUT
  publicUrl: string; // canonical object URL for storage
  expiresIn: number;
}

/**
 * Generate a presigned PUT URL for a client upload. `prefix` namespaces the key
 * (e.g. `org/<id>/documents`). Validates content type + size before signing.
 */
export async function presignUpload(opts: {
  prefix: string;
  fileName: string;
  contentType: string;
  size?: number;
}): Promise<PresignResult> {
  if (!ALLOWED.has(opts.contentType)) {
    throw Object.assign(new Error(`Unsupported file type: ${opts.contentType}`), { status: 422 });
  }
  if (opts.size && opts.size > MAX_BYTES) {
    throw Object.assign(new Error("File exceeds 25 MB limit"), { status: 422 });
  }

  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const key = `${opts.prefix}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName}`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: opts.contentType,
      ServerSideEncryption: "AES256", // encryption at rest
    }),
    { expiresIn: 300 },
  );

  return {
    key,
    uploadUrl,
    publicUrl: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`,
    expiresIn: 300,
  };
}

/** Presigned GET URL for private downloads (10-minute expiry). */
export function presignDownload(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: 600,
  });
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
