import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const form = await prisma.form.findFirst({
    where: { id, active: true },
    include: { fields: true },
  });

  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;

  // Validate required fields
  for (const field of form.fields) {
    if (field.required && !data[field.id]) {
      return NextResponse.json({ error: `Field "${field.label}" is required` }, { status: 422 });
    }
  }

  // Try to create a lead from email/name fields
  let leadId: string | null = null;
  const emailField = form.fields.find((f) => f.fieldType === "EMAIL");
  const nameField = form.fields.find((f) => f.label.toLowerCase().includes("name"));

  if (emailField && data[emailField.id]) {
    const email = String(data[emailField.id]);
    const name = nameField ? String(data[nameField.id] ?? "") : email;
    const lead = await prisma.lead.create({
      data: {
        orgId: form.orgId,
        eventId: form.eventId,
        name: name || email,
        email,
        source: "MANUAL",
      },
    });
    leadId = lead.id;
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await prisma.formSubmission.create({
    data: {
      formId: id,
      data,
      leadId,
      ip,
    },
  });

  return NextResponse.json({ ok: true });
}
