import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const docSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().max(200).optional(),
  fileType: z.string().max(120),
});

// GET /api/events/:id/documents — list attachments for an event.
export const GET = handler("event:read", async (_req, ctx, params) => {
  const event = await prisma.event.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!event) throw Object.assign(new Error("Not found"), { status: 404 });
  return {
    items: await prisma.document.findMany({
      where: { eventId: params.id },
      orderBy: { createdAt: "desc" },
    }),
  };
});

// POST /api/events/:id/documents — record a file that was uploaded to S3.
export const POST = handler(
  "event:update",
  async (req, ctx, params) => {
    const body = docSchema.parse(await req.json());
    const event = await prisma.event.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!event) throw Object.assign(new Error("Not found"), { status: 404 });
    return prisma.document.create({
      data: {
        eventId: params.id,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileType: body.fileType,
      },
    });
  },
  { auditAction: "document.create" },
);
