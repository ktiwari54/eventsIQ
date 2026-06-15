import { handler } from "@/lib/api";
import { presignUpload } from "@/lib/s3";
import { z } from "zod";

// POST /api/uploads/presign — issue a short-lived presigned S3 PUT URL so the
// client can upload a file directly to S3. Returns the canonical publicUrl to
// persist against the owning record (document, invoice, receipt).
const presignSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(3).max(120),
  size: z.number().int().positive().optional(),
  scope: z.enum(["documents", "invoices", "receipts", "cards"]).default("documents"),
});

export const POST = handler("event:read", async (req, ctx) => {
  const { fileName, contentType, size, scope } = presignSchema.parse(await req.json());
  return presignUpload({
    prefix: `org/${ctx.orgId}/${scope}`,
    fileName,
    contentType,
    size,
  });
});
