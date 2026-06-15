import { handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { sendMail, emailLayout } from "@/lib/email";
import { notifyRoles } from "@/server/notifications";
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
      include: { event: { select: { name: true, owner: { select: { email: true } } } } },
    });
    if (!budget) throw Object.assign(new Error("Not found"), { status: 404 });

    const updated = await prisma.budget.update({
      where: { id: params.id },
      data: {
        status: decision,
        ...(approvedAmount !== undefined ? { approved: approvedAmount } : {}),
      },
    });

    // Notify the right party for this transition (best-effort, never blocks).
    notifyApproval(ctx.orgId, budget.event.name, budget.category, decision, budget.event.owner?.email).catch(
      () => {},
    );

    return updated;
  },
  { auditAction: "budget.approve" },
);

async function notifyApproval(
  orgId: string,
  eventName: string,
  category: string,
  decision: string,
  ownerEmail?: string | null,
): Promise<void> {
  let recipients: string[] = [];
  let line = "";

  if (decision === "MANAGER_APPROVED") {
    // Hand off to finance managers for the next step.
    const finance = await prisma.user.findMany({
      where: { orgId, role: "FINANCE_MANAGER" },
      select: { email: true },
    });
    recipients = finance.map((u) => u.email);
    line = `The <b>${category}</b> budget for <b>${eventName}</b> was manager-approved and now awaits finance approval.`;
    await notifyRoles(orgId, ["FINANCE_MANAGER"], {
      type: "budget",
      title: "Budget awaiting finance approval",
      body: `${category} — ${eventName}`,
      link: "/budgets/approvals",
    });
  } else {
    // Final outcomes go back to the event owner / requester.
    if (ownerEmail) recipients = [ownerEmail];
    line =
      decision === "REJECTED"
        ? `The <b>${category}</b> budget for <b>${eventName}</b> was <b style="color:#EF4444">rejected</b>.`
        : `The <b>${category}</b> budget for <b>${eventName}</b> is now <b style="color:#10B981">approved</b>.`;
    await notifyRoles(orgId, ["EVENT_MANAGER", "FINANCE_MANAGER"], {
      type: "budget",
      title: `Budget ${decision === "REJECTED" ? "rejected" : "approved"}`,
      body: `${category} — ${eventName}`,
      link: "/budgets",
    });
  }

  if (recipients.length) {
    await sendMail({
      to: recipients,
      subject: `Budget ${decision.replace("_", " ").toLowerCase()} — ${eventName}`,
      html: emailLayout("Budget approval update", line),
    });
  }
}
