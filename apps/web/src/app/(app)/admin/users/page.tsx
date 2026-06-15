"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

const ROLES = [
  "SUPER_ADMIN",
  "FINANCE_MANAGER",
  "EVENT_MANAGER",
  "SALES_MANAGER",
  "SALES_EXECUTIVE",
  "VENDOR",
  "MANAGEMENT",
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}
interface Org {
  id: string;
  name: string;
  slug: string;
  _count: { users: number; events: number };
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  const [invite, setInvite] = useState({ name: "", email: "", role: "SALES_EXECUTIVE", password: "" });
  const [error, setError] = useState<string | null>(null);

  const org = useQuery({ queryKey: ["org"], queryFn: () => apiGet<Org>("/api/org"), enabled: isAdmin });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => apiGet<{ items: User[] }>("/api/users"), enabled: isAdmin });

  const createUser = useMutation({
    mutationFn: () => apiSend("/api/users", "POST", invite),
    onSuccess: () => {
      setInvite({ name: "", email: "", role: "SALES_EXECUTIVE", password: "" });
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => setError(e.message),
  });
  const updateUser = useMutation({
    mutationFn: (v: { id: string; role?: string; status?: string }) =>
      apiSend(`/api/users/${v.id}`, "PUT", { role: v.role, status: v.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const deleteUser = useMutation({
    mutationFn: (id: string) => apiSend(`/api/users/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const renameOrg = useMutation({
    mutationFn: (name: string) => apiSend("/api/org", "PUT", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org"] }),
  });

  if (!isAdmin) {
    return <p className="text-muted">Admins only — your role doesn’t have access to user management.</p>;
  }

  const field = "bg-surface border border-border rounded-lg px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">⚙ Users & Organization</h1>

      {/* Org settings */}
      {org.data && (
        <div className="card mb-4">
          <h2 className="text-sm font-bold mb-3">Organization</h2>
          <div className="flex items-center gap-2">
            <input
              className={`${field} flex-1 max-w-sm`}
              defaultValue={org.data.name}
              onBlur={(e) => e.target.value !== org.data!.name && renameOrg.mutate(e.target.value)}
            />
            <span className="text-muted text-xs">
              {org.data._count.users} users · {org.data._count.events} events · /{org.data.slug}
            </span>
          </div>
        </div>
      )}

      {/* Invite */}
      <div className="card mb-4">
        <h2 className="text-sm font-bold mb-3">Invite User</h2>
        <div className="grid md:grid-cols-4 gap-2">
          <input className={field} placeholder="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          <input className={field} placeholder="Email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <select className={field} value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className={field} type="password" placeholder="Temp password (optional)" value={invite.password} onChange={(e) => setInvite({ ...invite, password: e.target.value })} />
        </div>
        {error && <p className="text-danger text-sm mt-2">{error}</p>}
        <button className="btn btn-primary mt-3" disabled={!invite.name || !invite.email || createUser.isPending} onClick={() => createUser.mutate()}>
          {createUser.isPending ? "Inviting…" : "Invite"}
        </button>
      </div>

      {/* User list */}
      <div className="card overflow-x-auto">
        <h2 className="text-sm font-bold mb-3">Members</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted uppercase text-[10px]">
              <th className="py-2">Name</th><th>Email</th><th>Role</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.data?.items.map((u) => (
              <tr key={u.id} className="border-t border-border/40">
                <td className="py-2 font-semibold">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    className="bg-surface border border-border rounded px-2 py-1 text-xs"
                    value={u.role}
                    onChange={(e) => updateUser.mutate({ id: u.id, role: e.target.value })}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td>
                  <select
                    className="bg-surface border border-border rounded px-2 py-1 text-xs"
                    value={u.status}
                    onChange={(e) => updateUser.mutate({ id: u.id, status: e.target.value })}
                  >
                    {["ACTIVE", "INVITED", "SUSPENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  {u.id !== session?.user?.id && (
                    <button className="text-danger text-xs" onClick={() => deleteUser.mutate(u.id)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
