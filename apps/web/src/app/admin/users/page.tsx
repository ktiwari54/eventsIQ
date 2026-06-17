import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { organization: true },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">Users</h1>
        <p className="text-muted text-sm mt-1">{users.length} total</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-border">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Organization</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="text-slate-300 hover:bg-surface/50 transition-colors">
                <td className="py-3 pr-4 font-medium text-white">{user.name}</td>
                <td className="py-3 pr-4 text-muted">{user.email}</td>
                <td className="py-3 pr-4">{user.organization.name}</td>
                <td className="py-3 pr-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={user.status} />
                </td>
                <td className="py-3 text-muted">
                  {user.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    SUPER_ADMIN: "bg-purple/20 text-purple",
    FINANCE_MANAGER: "bg-gold/20 text-gold",
    EVENT_MANAGER: "bg-accent/20 text-accent",
    SALES_MANAGER: "bg-green/20 text-green",
    SALES_EXECUTIVE: "bg-green/10 text-green",
    VENDOR: "bg-muted/20 text-muted",
    MANAGEMENT: "bg-muted/20 text-muted",
  };
  return (
    <span className={`pill ${map[role] ?? "bg-muted/20 text-muted"}`}>
      {role.replace("_", " ")}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green/20 text-green",
    INVITED: "bg-gold/20 text-gold",
    SUSPENDED: "bg-danger/20 text-danger",
  };
  return (
    <span className={`pill ${map[status] ?? "bg-muted/20 text-muted"}`}>
      {status}
    </span>
  );
}
