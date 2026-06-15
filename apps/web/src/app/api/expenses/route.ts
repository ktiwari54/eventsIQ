import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Expense capture with S3-hosted invoice/receipt URLs. Creating an expense
// rolls its amount into the parent budget's actual spend so variance and ROI
// stay accurate.
const expenseSchema = z.object({
  budgetId: z.string().cuid(),
  vendorId: z.string().cuid().optional(),
  description: z.string().max(300).optional(),
  amount: z.number().positive(),
  invoiceUrl: z.string().url().optional(),
  receiptUrl: z.string().url().optional(),
});

// GET /api/expenses?budgetId= | ?eventId=
export const GET = handler("expense:read", async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId") ?? undefined;
  const eventId = searchParams.get("eventId") ?? undefined;
  return {
    items: await prisma.expense.findMany({
      where: {
        ...(budgetId ? { budgetId } : {}),
        ...(eventId ? { eventId } : {}),
        event: { orgId: ctx.orgId },
      },
      include: { vendor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  };
});

// POST /api/expenses — create an expense and update budget actuals atomically.
export const POST = handler(
  "expense:create",
  async (req, ctx) => {
    const body = expenseSchema.parse(await req.json());
    const budget = await prisma.budget.findFirst({
      where: { id: body.budgetId, event: { orgId: ctx.orgId } },
      select: { id: true, eventId: true },
    });
    if (!budget) throw Object.assign(new Error("Budget not found"), { status: 404 });

    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          budgetId: body.budgetId,
          eventId: budget.eventId,
          vendorId: body.vendorId,
          description: body.description,
          amount: body.amount,
          invoiceUrl: body.invoiceUrl,
          receiptUrl: body.receiptUrl,
        },
      });
      await tx.budget.update({
        where: { id: body.budgetId },
        data: { actual: { increment: body.amount } },
      });
      return expense;
    });
  },
  { auditAction: "expense.create" },
);
