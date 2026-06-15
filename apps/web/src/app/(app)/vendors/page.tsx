"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client";

interface Vendor {
  id: string;
  name: string;
  vendorType: string;
  city: string | null;
  rating: number;
  _count: { expenses: number; evaluations: number };
}

export default function VendorsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => apiGet<{ items: Vendor[] }>("/api/vendors"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">📦 Vendors</h1>
        <button className="btn btn-primary">＋ Add Vendor</button>
      </div>
      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted uppercase text-[10px]">
                <th className="py-2">Vendor</th>
                <th>Type</th>
                <th>City</th>
                <th>Rating</th>
                <th>Events</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((v) => (
                <tr key={v.id} className="border-t border-border/40">
                  <td className="py-2 font-semibold">{v.name}</td>
                  <td>{v.vendorType}</td>
                  <td>{v.city ?? "—"}</td>
                  <td>{"⭐".repeat(Math.round(v.rating))}</td>
                  <td>{v._count.expenses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
