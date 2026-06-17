import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const [totalOrgs, totalUsers, subs] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.subscription.groupBy({ by: ["status"], _count: true }),
  ]);

  const activeCount = subs.find((s) => s.status === "ACTIVE")?._count ?? 0;
  const trialingCount = subs.find((s) => s.status === "TRIALING")?._count ?? 0;

  // Recent signups
  const recentOrgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { users: true } },
    },
  });

  return { totalOrgs, totalUsers, activeCount, trialingCount, recentOrgs };
}

export default async function AdminDashboard() {
  const { totalOrgs, totalUsers, activeCount, trialingCount, recentOrgs } = await getStats();

  const kpis = [
    { label: "Total Organizations", value: totalOrgs, icon: "🏢" },
    { label: "Total Users", value: totalUsers, icon: "👥" },
    { label: "Active Subscriptions", value: activeCount, icon: "✅" },
    { label: "In Trial", value: trialingCount, icon: "⏳" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">Admin Overview</h1>
        <p className="text-muted text-sm mt-1">Platform-wide metrics and recent activity</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="text-2xl mb-2">{kpi.icon}</div>
            <div className="text-2xl font-extrabold text-white">{kpi.value}</div>
            <div className="text-xs text-muted mt-1 uppercase tracking-wide">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Signups */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white">Recent Organizations</h2>
          <Link href="/admin/orgs" className="text-xs text-accent hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-border">
                <th className="pb-2 pr-4">Organization</th>
                <th className="pb-2 pr-4">Plan</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Users</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrgs.map((org) => (
                <tr key={org.id} className="text-slate-300">
                  <td className="py-2.5 pr-4 font-medium text-white">{org.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className="pill bg-accent/20 text-accent">
                      {org.subscription?.plan.name ?? "—"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={org.subscription?.status} />
                  </td>
                  <td className="py-2.5 pr-4">{org._count.users}</td>
                  <td className="py-2.5 text-muted">
                    {org.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
              {recentOrgs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No organizations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green/20 text-green",
    TRIALING: "bg-gold/20 text-gold",
    PAST_DUE: "bg-danger/20 text-danger",
    CANCELED: "bg-muted/20 text-muted",
  };
  if (!status) return <span className="text-muted text-xs">—</span>;
  return (
    <span className={`pill ${map[status] ?? "bg-muted/20 text-muted"}`}>
      {status}
    </span>
  );
}
