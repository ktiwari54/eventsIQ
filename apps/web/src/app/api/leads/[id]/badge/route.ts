import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCan } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import { generateBadge } from "@/server/badge";

// GET /api/leads/:id/badge — printable PDF badge for a captured lead/attendee,
// embedding a vCard QR for fast re-scan / check-in.
export async function GET(req: NextRequest, route: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  assertCan(token.role as Role, "lead:read");

  const { id } = await route.params;
  const lead = await prisma.lead.findFirst({
    where: { id, orgId: token.orgId as string },
    include: { event: { select: { name: true } } },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Minimal vCard so a scan adds the contact directly.
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${lead.name}`,
    lead.company ? `ORG:${lead.company}` : "",
    lead.designation ? `TITLE:${lead.designation}` : "",
    lead.email ? `EMAIL:${lead.email}` : "",
    lead.phone ? `TEL:${lead.phone}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  const pdf = await generateBadge({
    name: lead.name,
    company: lead.company,
    designation: lead.designation,
    eventName: lead.event?.name ?? "EventIQ",
    grade: lead.grade,
    qrData: vcard,
  });

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="badge-${lead.name.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
