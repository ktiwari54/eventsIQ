import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const subs = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: { organization: true, plan: true },
  });

  const mrr = subs
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => {
      const price =
        s.billingCycle === "YEARLY"
          ? Number(s.plan.yearlyPrice)
          : Number(s.plan.monthlyPrice);
      return sum + price;
    }, 0);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Subscriptions</h1>
          <p className="text-muted text-sm mt-1">{subs.length} total</p>
        </div>
        <div className="card text-right">
          <div className="text-xs text-muted uppercase tracking-wide mb-1">Monthly Revenue</div>
          <div className="text-2xl font-extrabold text-green">${mrr.toLocaleString()}</div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-border">
              <th className="pb-2 pr-4">Organization</th>
              <th className="pb-2 pr-4">Plan</th>
              <th className="pb-2 pr-4">Billing</th>
              <th className="pb-2 pr-4">Price</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Trial Ends</th>
              <th className="pb-2">Period End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subs.map((sub) => {
              const price =
                sub.billingCycle === "YEARLY"
                  ? Number(sub.plan.yearlyPrice)
                  : Number(sub.plan.monthlyPrice);
              return (
                <tr key={sub.id} className="text-slate-300 hover:bg-surface/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-white">{sub.organization.name}</td>
                  <td className="py-3 pr-4">
                    <span className="pill bg-accent/20 text-accent">{sub.plan.name}</span>
                  </td>
                  <td className="py-3 pr-4 text-muted capitalize">{sub.billingCycle.toLowerCase()}</td>
                  <td className="py-3 pr-4 font-mono">${price}/mo</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="py-3 pr-4 text-muted">
                    {sub.trialEndsAt
                      ? sub.trialEndsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="py-3 text-muted">
                    {sub.currentPeriodEnd
                      ? sub.currentPeriodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {subs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  No subscriptions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green/20 text-green",
    TRIALING: "bg-gold/20 text-gold",
    PAST_DUE: "bg-danger/20 text-danger",
    CANCELED: "bg-muted/20 text-muted",
  };
  return (
    <span className={`pill ${map[status] ?? "bg-muted/20 text-muted"}`}>
      {status}
    </span>
  );
}
