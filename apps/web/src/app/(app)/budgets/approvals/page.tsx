"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

interface BudgetRow {
  id: string;
  category: string;
  estimated: string;
  approved: string;
  actual: string;
  status: string;
  event: { name: string };
}

// Approval workflow: Requester → Manager → Finance → Approved.
// The next decision depends on the budget's current status and the user's role.
const FLOW: Record<string, { next: string; label: string; role: string[] }> = {
  PENDING: { next: "MANAGER_APPROVED", label: "Manager Approve", role: ["EVENT_MANAGER", "SUPER_ADMIN"] },
  MANAGER_APPROVED: { next: "FINANCE_APPROVED", label: "Finance Approve", role: ["FINANCE_MANAGER", "SUPER_ADMIN"] },
  FINANCE_APPROVED: { next: "APPROVED", label: "Final Approve", role: ["FINANCE_MANAGER", "SUPER_ADMIN"] },
};

const STATUS_PILL: Record<string, string> = {
  PENDING: "bg-gold/20 text-gold",
  MANAGER_APPROVED: "bg-accent/20 text-accent",
  FINANCE_APPROVED: "bg-purple/20 text-purple",
  APPROVED: "bg-green/20 text-green",
  REJECTED: "bg-danger/20 text-danger",
};

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const qc = useQueryClient();
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["budgets-approvals"],
    queryFn: () => apiGet<{ items: BudgetRow[] }>("/api/budgets"),
  });

  const mutation = useMutation({
    mutationFn: (v: { id: string; decision: string; approvedAmount?: number }) =>
      apiSend(`/api/budgets/${v.id}/approve`, "POST", {
        decision: v.decision,
        approvedAmount: v.approvedAmount,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets-approvals"] }),
  });

  const L = (n: string | number) => `₹${(Number(n) / 100000).toFixed(1)}L`;

  return (
    <div>
      <h1 className="text-lg font-bold mb-1">💰 Budget Approvals</h1>
      <p className="text-muted text-sm mb-4">Requester → Manager → Finance → Approved</p>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted uppercase text-[10px]">
                <th className="py-2">Event</th>
                <th>Category</th>
                <th>Estimated</th>
                <th>Approved</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((b) => {
                const step = FLOW[b.status];
                const canAct = step && (step.role.includes(role) || role === "SUPER_ADMIN");
                const isTerminal = b.status === "APPROVED" || b.status === "REJECTED";
                return (
                  <tr key={b.id} className="border-t border-border/40">
                    <td className="py-2">{b.event.name}</td>
                    <td className="font-semibold">{b.category}</td>
                    <td>{L(b.estimated)}</td>
                    <td>
                      {b.status === "PENDING" && canAct ? (
                        <input
                          className="bg-surface border border-border rounded px-2 py-1 w-24"
                          placeholder={String(Number(b.estimated))}
                          value={amounts[b.id] ?? ""}
                          onChange={(e) => setAmounts((a) => ({ ...a, [b.id]: e.target.value }))}
                        />
                      ) : (
                        L(b.approved)
                      )}
                    </td>
                    <td>
                      <span className={`pill ${STATUS_PILL[b.status]}`}>{b.status.replace("_", " ")}</span>
                    </td>
                    <td>
                      {isTerminal ? (
                        <span className="text-muted">—</span>
                      ) : canAct ? (
                        <div className="flex gap-2">
                          <button
                            className="btn btn-primary !py-1 !px-3"
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                id: b.id,
                                decision: step.next,
                                approvedAmount: amounts[b.id]
                                  ? Number(amounts[b.id])
                                  : b.status === "PENDING"
                                    ? Number(b.estimated)
                                    : undefined,
                              })
                            }
                          >
                            {step.label}
                          </button>
                          <button
                            className="btn btn-ghost !py-1 !px-3"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ id: b.id, decision: "REJECTED" })}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-[11px]">Awaiting {step?.label ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
