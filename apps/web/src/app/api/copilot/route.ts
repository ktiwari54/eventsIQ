import { handler } from "@/lib/api";
import { askCopilot } from "@/server/copilot";
import { z } from "zod";

const askSchema = z.object({ question: z.string().min(2).max(500) });

// POST /api/copilot — natural-language Q&A grounded in the org's live data.
export const POST = handler(
  "copilot:use",
  async (req, ctx) => {
    const { question } = askSchema.parse(await req.json());
    return askCopilot(ctx.orgId, question);
  },
  { auditAction: "copilot.ask" },
);
