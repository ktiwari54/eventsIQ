"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client";

interface RoiRow {
  id: string;
  roi: number;
  rank: number;
  totalCost: string;
  revenue: string;
  costPerLead: number;
  conversionRate: number;
  event: { name: string; city: string | null };
}

export default function RoiPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["roi"],
    queryFn: () =>
      apiGet<{ items: RoiRow[]; forecast: { projected: number; trend: string } }>("/api/roi?recompute=1"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">📈 ROI Engine</h1>
        {data && (
          <div className="text-sm text-muted">
            🔮 Forecast: <span className="text-green font-bold">₹{(data.forecast.projected / 100000).toFixed(1)}L</span> ({data.forecast.trend})
          </div>
        )}
      </div>
      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-muted">Computing ROI…</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted uppercase text-[10px]">
                <th className="py-2">#</th>
                <th>Event</th>
                <th>Spend</th>
                <th>Revenue</th>
                <th>ROI</th>
                <th>Cost/Lead</th>
                <th>Conv %</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="py-2">{r.rank}</td>
                  <td className="font-semibold">{r.event.name}</td>
                  <td>₹{(Number(r.totalCost) / 100000).toFixed(1)}L</td>
                  <td>₹{(Number(r.revenue) / 100000).toFixed(1)}L</td>
                  <td className={r.roi >= 2 ? "text-green font-bold" : "text-danger font-bold"}>{r.roi}x</td>
                  <td>₹{Math.round(r.costPerLead)}</td>
                  <td>{r.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
