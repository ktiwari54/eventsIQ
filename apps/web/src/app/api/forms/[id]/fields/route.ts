import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { FormFieldType } from "@prisma/client";

const fieldSchema = z.object({
  label: z.string().min(1),
  fieldType: z.nativeEnum(FormFieldType).default(FormFieldType.TEXT),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  order: z.number().int().default(0),
});

const reorderSchema = z.array(z.object({
  id: z.string(),
  order: z.number().int(),
}));

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const form = await prisma.form.findFirst({ where: { id, orgId: token.orgId as string } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = await prisma.formField.findMany({
    where: { formId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(fields);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const form = await prisma.form.findFirst({ where: { id, orgId: token.orgId as string } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = fieldSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const field = await prisma.formField.create({
    data: {
      formId: id,
      ...parsed.data,
      options: parsed.data.options ?? undefined,
    },
  });

  return NextResponse.json(field, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const form = await prisma.form.findFirst({ where: { id, orgId: token.orgId as string } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  await Promise.all(
    parsed.data.map(({ id: fieldId, order }) =>
      prisma.formField.updateMany({
        where: { id: fieldId, formId: id },
        data: { order },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
