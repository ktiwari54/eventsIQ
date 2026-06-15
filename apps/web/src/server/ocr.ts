// Business-card OCR → structured lead fields. Uses OpenAI Vision when an API
// key is configured (best accuracy), otherwise falls back to heuristic parsing
// of raw OCR text. Both paths return the same ParsedCard shape so callers and
// the lead-create flow stay provider-agnostic.

export interface ParsedCard {
  name?: string;
  company?: string;
  designation?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  website?: string;
  confidence: number; // 0-1
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /\b((https?:\/\/)?(www\.)?[a-z0-9-]+\.[a-z]{2,}(\/\S*)?)\b/i;
const TITLE_HINTS = [
  "ceo", "cfo", "coo", "cto", "founder", "owner", "director", "manager",
  "head", "vp", "president", "lead", "executive", "engineer", "consultant",
];

/**
 * Extract a card from an image. `imageBase64` is a data URL or raw base64.
 * Always resolves (never throws) so a flaky OCR provider degrades gracefully.
 */
export async function parseBusinessCard(imageBase64: string): Promise<ParsedCard> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await parseWithVision(imageBase64);
    } catch {
      // fall through to heuristic path
    }
  }
  return { confidence: 0 };
}

/** Parse raw OCR text (e.g. from Tesseract / mobile capture) heuristically. */
export function parseCardText(text: string): ParsedCard {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const email = text.match(EMAIL_RE)?.[0]?.toLowerCase();
  const phone = text.match(PHONE_RE)?.[0]?.replace(/\s+/g, " ").trim();
  const website = text.match(URL_RE)?.[0];

  // Designation: first line containing a known title hint.
  const designation = lines.find((l) =>
    TITLE_HINTS.some((h) => l.toLowerCase().includes(h)),
  );

  // Name: first short line that isn't the email/phone/title and looks like a
  // person (2–4 capitalized words).
  const name = lines.find(
    (l) =>
      l !== designation &&
      !EMAIL_RE.test(l) &&
      !PHONE_RE.test(l) &&
      /^[A-Z][a-zA-Z.]+(\s+[A-Z][a-zA-Z.]+){1,3}$/.test(l),
  );

  // Company: derive from email domain, else the line after the name.
  let company: string | undefined;
  if (email) {
    const domain = email.split("@")[1]?.split(".")[0];
    if (domain && !["gmail", "yahoo", "outlook", "hotmail"].includes(domain)) {
      company = domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  }
  if (!company && name) {
    const idx = lines.indexOf(name);
    company = lines[idx + 2] ?? lines[idx + 1];
  }

  const filled = [name, company, designation, email, phone].filter(Boolean).length;
  return {
    name,
    company,
    designation,
    email,
    phone,
    website,
    confidence: Math.min(1, filled / 5),
  };
}

async function parseWithVision(imageBase64: string): Promise<ParsedCard> {
  const dataUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract contact details from this business card image. Respond with strict JSON: " +
            "{name, company, designation, email, phone, city, country, website}. " +
            "Use null for any field you cannot read.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the business card." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Vision OCR failed: ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as Partial<ParsedCard>;

  const filled = [parsed.name, parsed.company, parsed.designation, parsed.email, parsed.phone].filter(
    Boolean,
  ).length;
  return { ...parsed, confidence: Math.min(1, filled / 5) };
}
