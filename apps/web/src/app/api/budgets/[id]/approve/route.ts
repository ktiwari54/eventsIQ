import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const approveSchema = z.object({
  decision: z.enum(["MANAGER_APPROVED", "FINANCE_APPROVED", "APPROVED", "REJECTED"]),
  approvedAmount: z.number().nonnegative().optional(),
});

// POST /api/budgets/:id/approve — advance the budget approval workflow.
// Requester → Manager → Finance → Approved. Only finance:* can grant final.
export const POST = handler(
  "budget:update",
  async (req, ctx, params) => {
    const { decision, approvedAmount } = approveSchema.parse(await req.json());
    const budget = await prisma.budget.findFirst({
      where: { id: params.id, event: { orgId: ctx.orgId } },
    });
    if (!budget) throw Object.assign(new Error("Not found"), { status: 404 });

    return prisma.budget.update({
      where: { id: params.id },
      data: {
        status: decision,
        ...(approvedAmount !== undefined ? { approved: approvedAmount } : {}),
      },
    });
  },
  { auditAction: "budget.approve" },
);
