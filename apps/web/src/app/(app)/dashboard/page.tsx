"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiGet } from "@/lib/client";

interface DashboardData {
  kpis: {
    totalEvents: number;
    totalLeads: number;
    revenue: number;
    totalSpend: number;
    costPerLead: number;
    roiPercent: number;
    bestRoi: number;
  };
  gradeFunnel: { grade: string; count: number }[];
  heatBreakdown: { heat: string; count: number }[];
  eventPerformance: { name: string; revenue: number; cost: number; roi: number }[];
}

const HEAT_COLORS: Record<string, string> = { HOT: "#EF4444", WARM: "#F59E0B", COLD: "#3B82F6" };

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardData>("/api/dashboard"),
  });

  if (isLoading || !data) return <p className="text-muted">Loading dashboard…</p>;

  const k = data.kpis;
  const inr = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

  return (
    <div>
      <h1 className="text-lg font-bold mb-5">📊 Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Total Events" value={String(k.totalEvents)} color="text-accent" />
        <Kpi label="Total Leads" value={k.totalLeads.toLocaleString()} color="text-accent" />
        <Kpi label="Revenue" value={inr(k.revenue)} color="text-green" />
        <Kpi label="Total Spend" value={inr(k.totalSpend)} color="text-gold" />
        <Kpi label="Cost / Lead" value={`₹${k.costPerLead}`} color="text-purple" />
        <Kpi label="ROI %" value={`${k.roiPercent}%`} color="text-green" />
        <Kpi label="Best ROI" value={`${k.bestRoi}x`} color="text-gold" />
        <Kpi label="Hot Pipeline" value={String(data.heatBreakdown.find((h) => h.heat === "HOT")?.count ?? 0)} color="text-danger" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-bold mb-3">Event Performance (Revenue vs Cost)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.eventPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1E2D45" }} />
              <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-sm font-bold mb-3">Lead Heat Breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.heatBreakdown}
                dataKey="count"
                nameKey="heat"
                outerRadius={100}
                label
              >
                {data.heatBreakdown.map((h) => (
                  <Cell key={h.heat} fill={HEAT_COLORS[h.heat] ?? "#8B5CF6"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1E2D45" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value}</div>
    </div>
  );
}
