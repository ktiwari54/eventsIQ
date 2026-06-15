import { prisma } from "@/lib/prisma";
import { forecastRevenue } from "./roi";
import { searchKnowledge } from "./knowledge";

// AI Copilot: a natural-language query interface over EventIQ data. It grounds
// answers in live DB aggregates (a lightweight RAG pattern) and optionally
// passes them to OpenAI for a polished narrative response.

export interface CopilotAnswer {
  answer: string;
  data?: unknown;
  source: "openai" | "rules";
}

/** Build a compact, factual context snapshot for the org. */
async function buildContext(orgId: string) {
  const [events, leadAgg, hotLeads, roi] = await Promise.all([
    prisma.event.findMany({
      where: { orgId },
      select: { name: true, expectedRevenue: true, roiMetric: true },
      orderBy: { startDate: "desc" },
      take: 20,
    }),
    prisma.lead.groupBy({ by: ["grade"], where: { orgId }, _count: true }),
    prisma.lead.count({ where: { orgId, heat: "HOT" } }),
    prisma.roiMetric.findMany({
      where: { event: { orgId } },
      include: { event: { select: { name: true } } },
      orderBy: { roi: "desc" },
      take: 10,
    }),
  ]);
  return { events, leadAgg, hotLeads, roi };
}

export async function askCopilot(orgId: string, question: string): Promise<CopilotAnswer> {
  const ctx = await buildContext(orgId);
  const q = question.toLowerCase();

  // Deterministic answers for the canonical queries — always grounded in data.
  if (q.includes("highest roi") || q.includes("best roi")) {
    const top = ctx.roi[0];
    if (top)
      return {
        source: "rules",
        answer: `🏆 ${top.event.name} generated the highest ROI at ${top.roi}x (revenue ₹${Number(top.revenue).toLocaleString()}).`,
        data: top,
      };
  }
  if (q.includes("hot lead")) {
    return {
      source: "rules",
      answer: `🔥 You currently have ${ctx.hotLeads} hot leads across all events.`,
      data: { hotLeads: ctx.hotLeads },
    };
  }
  if (q.includes("forecast")) {
    const history = ctx.roi.map((r) => Number(r.revenue)).reverse();
    const f = forecastRevenue(history);
    return {
      source: "rules",
      answer: `🔮 Projected next-period revenue is ₹${f.projected.toLocaleString()} (trend: ${f.trend}).`,
      data: f,
    };
  }
  if (q.includes("compare") && q.includes("event")) {
    const list = ctx.roi
      .slice(0, 5)
      .map((r) => `${r.event.name}: ${r.roi}x`)
      .join(" · ");
    return { source: "rules", answer: `📊 Last events by ROI — ${list}`, data: ctx.roi.slice(0, 5) };
  }

  // RAG: retrieve matching records (documents, notes, objectives, vendors).
  const hits = await searchKnowledge(orgId, question);

  // Fall back to OpenAI with the grounded context + retrieved docs.
  if (process.env.OPENAI_API_KEY) {
    try {
      return await askOpenAI(question, { ...ctx, knowledge: hits });
    } catch {
      /* fall through to generic */
    }
  }

  // No LLM key — surface the retrieved snippets directly when we found any.
  if (hits.length) {
    const cited = hits.map((h) => `• [${h.source}] ${h.title}: ${h.snippet}`).join("\n");
    return {
      source: "rules",
      answer: `Here's what I found in your records:\n${cited}`,
      data: hits,
    };
  }

  return {
    source: "rules",
    answer:
      "I can answer questions about ROI, hot leads, revenue forecasts, event comparisons, and search your events, leads, documents and vendors. Try: \"Which event had the best ROI?\"",
  };
}

async function askOpenAI(question: string, ctx: unknown): Promise<CopilotAnswer> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are EventIQ Copilot. Answer using ONLY the provided JSON context. Be concise and cite numbers. If the data is insufficient, say so.",
        },
        { role: "user", content: `Context:\n${JSON.stringify(ctx)}\n\nQuestion: ${question}` },
      ],
    }),
  });
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return {
    source: "openai",
    answer: json.choices?.[0]?.message?.content ?? "No answer.",
  };
}
