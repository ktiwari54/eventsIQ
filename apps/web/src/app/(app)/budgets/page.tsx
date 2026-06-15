"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client";

interface BudgetRow {
  id: string;
  category: string;
  estimated: string;
  approved: string;
  actual: string;
  status: string;
  variance: number;
  overspent: boolean;
  event: { name: string };
}

export default function BudgetsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => apiGet<{ items: BudgetRow[] }>("/api/budgets"),
  });

  const L = (n: string | number) => `₹${(Number(n) / 100000).toFixed(1)}L`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">💰 Budgets</h1>
        <button className="btn btn-primary">＋ Add Expense</button>
      </div>
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
                <th>Actual</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((b) => (
                <tr key={b.id} className="border-t border-border/40">
                  <td className="py-2">{b.event.name}</td>
                  <td className="font-semibold">{b.category}</td>
                  <td>{L(b.estimated)}</td>
                  <td>{L(b.approved)}</td>
                  <td>{L(b.actual)}</td>
                  <td>
                    <span className={`pill ${b.overspent ? "bg-danger/20 text-danger" : "bg-green/20 text-green"}`}>
                      {b.overspent ? "Over" : b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
