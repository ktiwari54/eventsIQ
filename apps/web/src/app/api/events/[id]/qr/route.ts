import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCan } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import { qrPngBuffer, eventCaptureUrl } from "@/server/qr";

// GET /api/events/:id/qr — PNG QR code linking to the event's lead-capture page.
// Booth staff print/display this so visitors can self-capture by scanning.
export async function GET(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertCan(token.role as Role, "event:read");

  const { id } = await route.params;
  const event = await prisma.event.findFirst({
    where: { id, orgId: token.orgId as string },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = eventCaptureUrl(new URL(req.url).origin, id);
  const png = await qrPngBuffer(url);
  return new NextResponse(png as unknown as BodyInit, {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
