import { prisma } from "@/lib/prisma";

export interface KnowledgeHit {
  source: string; // "event" | "lead" | "document" | "vendor"
  title: string;
  snippet: string;
}

const STOP = new Set(["the", "a", "an", "of", "for", "and", "to", "in", "on", "which", "what", "show", "me", "is", "are", "from", "how", "many"]);

/**
 * Lightweight retrieval (RAG) over the org's textual records — event objectives,
 * lead notes, document names and vendor profiles. Keyword/ILIKE based (no vector
 * store required); returns the top snippets to ground Copilot answers.
 */
export async function searchKnowledge(orgId: string, query: string, limit = 6): Promise<KnowledgeHit[]> {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
    .slice(0, 6);
  if (terms.length === 0) return [];

  const orFor = (fields: string[]) =>
    fields.flatMap((f) => terms.map((t) => ({ [f]: { contains: t, mode: "insensitive" as const } })));

  const [events, leads, documents, vendors] = await Promise.all([
    prisma.event.findMany({
      where: { orgId, OR: orFor(["name", "objectives", "city"]) },
      select: { name: true, objectives: true, city: true },
      take: limit,
    }),
    prisma.lead.findMany({
      where: { orgId, OR: orFor(["name", "company", "notes"]) },
      select: { name: true, company: true, notes: true },
      take: limit,
    }),
    prisma.document.findMany({
      where: { event: { orgId }, OR: orFor(["fileName"]) },
      select: { fileName: true, fileUrl: true, event: { select: { name: true } } },
      take: limit,
    }),
    prisma.vendor.findMany({
      where: { orgId, OR: orFor(["name", "vendorType", "city"]) },
      select: { name: true, vendorType: true, city: true },
      take: limit,
    }),
  ]);

  const hits: KnowledgeHit[] = [
    ...events.map((e) => ({ source: "event", title: e.name, snippet: e.objectives ?? `Event in ${e.city ?? "—"}` })),
    ...leads.map((l) => ({ source: "lead", title: l.name, snippet: l.notes ?? `Lead at ${l.company ?? "—"}` })),
    ...documents.map((d) => ({ source: "document", title: d.fileName ?? "file", snippet: `Attached to ${d.event.name}` })),
    ...vendors.map((v) => ({ source: "vendor", title: v.name, snippet: `${v.vendorType} · ${v.city ?? "—"}` })),
  ];

  return hits.slice(0, limit);
}
