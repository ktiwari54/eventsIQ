import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/zoho/forms-webhook?orgId=
// Receives Zoho Forms webhook submissions and creates leads in EventsIQ.
// Zoho Forms sends data as application/x-www-form-urlencoded or application/json.
// Field mapping is done by matching common field name patterns.

function extractField(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const lk = key.toLowerCase();
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase().includes(lk) && typeof v === "string" && v.trim()) {
        return v.trim();
      }
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  const orgId = new URL(req.url).searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  let fields: Record<string, unknown> = {};

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json() as Record<string, unknown>;
    // Zoho Forms JSON: { formName, entries: [{ field: value }] } or flat { field: value }
    const entries = body.entries as Record<string, unknown>[] | undefined;
    fields = entries?.[0] ?? body;
  } else {
    // URL-encoded form post
    const text = await req.text();
    const params = new URLSearchParams(text);
    for (const [k, v] of params.entries()) {
      fields[k] = v;
    }
  }

  const name =
    extractField(fields, "name", "full name", "fullname", "contact name") ??
    [extractField(fields, "first"), extractField(fields, "last")].filter(Boolean).join(" ") ||
    "Unknown";

  const email = extractField(fields, "email", "e-mail", "email address");
  const phone = extractField(fields, "phone", "mobile", "contact number", "tel");
  const company = extractField(fields, "company", "organization", "org", "business");
  const designation = extractField(fields, "designation", "title", "job title", "position", "role");
  const city = extractField(fields, "city", "location");
  const country = extractField(fields, "country");

  const lead = await prisma.lead.create({
    data: {
      orgId,
      name: name || "Unknown",
      email: email ?? null,
      phone: phone ?? null,
      company: company ?? null,
      designation: designation ?? null,
      city: city ?? null,
      country: country ?? null,
      source: "ZOHO_FORM",
    },
  });

  await prisma.zohoSyncLog.create({
    data: {
      orgId,
      entity: "Lead",
      recordId: lead.id,
      direction: "INBOUND",
      status: "SUCCESS",
      payload: fields,
    },
  });

  return NextResponse.json({ received: true, leadId: lead.id });
}
