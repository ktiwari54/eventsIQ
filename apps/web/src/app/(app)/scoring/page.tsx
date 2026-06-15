"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/client";

interface Lead {
  id: string;
  name: string;
  company: string | null;
  score: number;
  grade: string;
  scoreFactors: Record<string, number> | null;
  aiSuggestion: string | null;
}

export default function ScoringPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["scoring"],
    queryFn: () => apiGet<{ items: Lead[] }>("/api/leads?pageSize=50"),
  });

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">🎯 AI Lead Scoring</h1>
      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted uppercase text-[10px]">
                <th className="py-2">Lead</th>
                <th>Company</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Top Factors</th>
                <th>Suggested Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((l) => {
                const top = Object.entries(l.scoreFactors ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([k]) => k)
                  .join(", ");
                return (
                  <tr key={l.id} className="border-t border-border/40">
                    <td className="py-2 font-semibold">{l.name}</td>
                    <td>{l.company}</td>
                    <td className="font-bold">{l.score}</td>
                    <td><span className="pill bg-green/20 text-green">{l.grade}</span></td>
                    <td className="text-muted">{top || "—"}</td>
                    <td className="text-accent">{l.aiSuggestion}</td>
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
