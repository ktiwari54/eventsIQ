import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
});

const createSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal("")),
  currency: z.string().default("USD"),
  tax: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  salesOrderId: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [invoices, summary] = await Promise.all([
    prisma.invoice.findMany({
      where: { orgId: token.orgId as string },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { orgId: token.orgId as string },
      _sum: { total: true },
    }),
  ]);

  const totalPaid = summary.find((s) => s.status === "PAID")?._sum.total ?? 0;
  const totalOutstanding = summary
    .filter((s) => s.status === "SENT" || s.status === "OVERDUE")
    .reduce((sum, s) => sum + Number(s._sum.total ?? 0), 0);

  return NextResponse.json({ invoices, summary: { totalPaid, totalOutstanding } });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const { items, tax, discount, currency, notes, clientName, clientEmail, dueDate, salesOrderId } = parsed.data;

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal + tax - discount;
  const invoiceNumber = `INV-${Date.now()}`;

  const invoice = await prisma.invoice.create({
    data: {
      orgId: token.orgId as string,
      invoiceNumber,
      clientName,
      clientEmail: clientEmail || null,
      currency,
      subtotal,
      tax,
      discount,
      total,
      notes,
      dueDate: dueDate ? new Date(dueDate) : null,
      salesOrderId: salesOrderId || null,
      items: {
        create: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}
