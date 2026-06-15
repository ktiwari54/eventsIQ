import { z } from "zod";

// Centralized Zod schemas — shared by API routes (server validation) and React
// Hook Form (client validation) so the contract is defined exactly once.

export const eventCreateSchema = z.object({
  name: z.string().min(2).max(160),
  type: z.enum([
    "TRADE_SHOW",
    "EXHIBITION",
    "CONFERENCE",
    "BRAND_LAUNCH",
    "ROADSHOW",
    "WEBINAR",
  ]),
  category: z.string().max(80).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  venue: z.string().max(160).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  organizer: z.string().max(160).optional(),
  objectives: z.string().max(2000).optional(),
  expectedLeads: z.number().int().nonnegative().default(0),
  expectedRevenue: z.number().nonnegative().default(0),
  budgetTotal: z.number().nonnegative().default(0),
}).refine((d) => d.endDate >= d.startDate, {
  message: "endDate must be on or after startDate",
  path: ["endDate"],
});

export const eventUpdateSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  status: z
    .enum(["DRAFT", "SUBMITTED", "APPROVED", "ACTIVE", "COMPLETED", "ARCHIVED"])
    .optional(),
  venue: z.string().max(160).optional(),
  city: z.string().max(80).optional(),
  objectives: z.string().max(2000).optional(),
  expectedLeads: z.number().int().nonnegative().optional(),
  expectedRevenue: z.number().nonnegative().optional(),
  budgetTotal: z.number().nonnegative().optional(),
});

export const leadCreateSchema = z.object({
  eventId: z.string().cuid().optional(),
  name: z.string().min(1).max(160),
  company: z.string().max(160).optional(),
  designation: z.string().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  interestedBrands: z.array(z.string()).default([]),
  monthlyPurchaseVolume: z.number().nonnegative().optional(),
  source: z
    .enum(["ZOHO_FORM", "QR_SCAN", "MANUAL", "CSV_UPLOAD", "BUSINESS_CARD_OCR", "MOBILE_APP"])
    .default("MANUAL"),
  notes: z.string().max(2000).optional(),
  // Optional scoring hints
  companySize: z.number().int().nonnegative().optional(),
  buyingTimelineDays: z.number().int().nonnegative().optional(),
  previousInteractions: z.number().int().nonnegative().optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const vendorCreateSchema = z.object({
  name: z.string().min(2).max(160),
  vendorType: z.string().min(2).max(80),
  gstNumber: z.string().max(20).optional(),
  pan: z.string().max(20).optional(),
  contactPerson: z.string().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  rating: z.number().min(0).max(5).default(0),
});

export const budgetCreateSchema = z.object({
  eventId: z.string().cuid(),
  category: z.enum([
    "BOOTH",
    "TRAVEL",
    "HOTEL",
    "PRINTING",
    "BRANDING",
    "LOGISTICS",
    "STAFFING",
    "FOOD",
    "MARKETING",
  ]),
  estimated: z.number().nonnegative().default(0),
  approved: z.number().nonnegative().default(0),
  actual: z.number().nonnegative().default(0),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type VendorCreateInput = z.infer<typeof vendorCreateSchema>;
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
