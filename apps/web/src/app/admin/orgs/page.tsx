import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOrgsPage() {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { users: true, events: true, leads: true } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">Organizations</h1>
        <p className="text-muted text-sm mt-1">{orgs.length} total</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-border">
              <th className="pb-2 pr-4">Organization</th>
              <th className="pb-2 pr-4">Slug</th>
              <th className="pb-2 pr-4">Plan</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Users</th>
              <th className="pb-2 pr-4">Events</th>
              <th className="pb-2 pr-4">Leads</th>
              <th className="pb-2">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((org) => (
              <tr key={org.id} className="text-slate-300 hover:bg-surface/50 transition-colors">
                <td className="py-3 pr-4 font-medium text-white">{org.name}</td>
                <td className="py-3 pr-4 text-muted font-mono text-xs">{org.slug}</td>
                <td className="py-3 pr-4">
                  <span className="pill bg-accent/20 text-accent">
                    {org.subscription?.plan.name ?? "No Plan"}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {org.subscription ? (
                    <SubscriptionStatusBadge status={org.subscription.status} />
                  ) : (
                    <span className="text-muted text-xs">—</span>
                  )}
                </td>
                <td className="py-3 pr-4">{org._count.users}</td>
                <td className="py-3 pr-4">{org._count.events}</td>
                <td className="py-3 pr-4">{org._count.leads}</td>
                <td className="py-3 text-muted">
                  {org.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted">
                  No organizations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubscriptionStatusBadge({ status }: { status: string }) {
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
