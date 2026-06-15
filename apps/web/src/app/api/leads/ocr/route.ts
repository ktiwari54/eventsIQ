import { handler } from "@/lib/api";
import { parseBusinessCard, parseCardText } from "@/server/ocr";
import { z } from "zod";

// POST /api/leads/ocr — parse a business card into draft lead fields.
// Accepts either { image } (base64/data-URL, OpenAI Vision) or { text } (raw
// OCR text from a mobile/Tesseract capture). Returns a non-persisted ParsedCard
// that the capture form pre-fills; the user confirms before POST /api/leads.
const ocrSchema = z
  .object({
    image: z.string().min(16).optional(),
    text: z.string().min(2).optional(),
  })
  .refine((d) => d.image || d.text, { message: "Provide image or text" });

export const POST = handler(
  "lead:create",
  async (req) => {
    const { image, text } = ocrSchema.parse(await req.json());
    const card = text ? parseCardText(text) : await parseBusinessCard(image!);
    return { card };
  },
  { auditAction: "lead.ocr" },
);
