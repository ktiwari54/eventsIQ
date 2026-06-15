import { LeadGrade, LeadHeat } from "@prisma/client";

export interface ScoringInput {
  monthlyPurchaseVolume?: number | null;
  companySize?: number | null; // employee count if known
  designation?: string | null;
  buyingTimelineDays?: number | null; // 0 = immediate
  previousInteractions?: number | null;
  interestedBrands?: string[];
  region?: string | null;
}

export interface ScoringResult {
  score: number; // 0-100
  grade: LeadGrade;
  heat: LeadHeat;
  factors: Record<string, number>;
  suggestion: string;
}

// Each factor contributes a weighted sub-score. Weights sum to 100.
const WEIGHTS = {
  purchaseVolume: 28,
  companySize: 14,
  designation: 16,
  buyingTimeline: 18,
  previousInteraction: 10,
  productInterest: 8,
  region: 6,
} as const;

const SENIOR_TITLES = ["ceo", "cfo", "coo", "founder", "owner", "director", "vp", "head", "president"];
const MID_TITLES = ["manager", "lead", "principal", "gm"];
const PRIORITY_REGIONS = ["delhi", "mumbai", "bangalore", "dubai", "new delhi"];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Deterministic, explainable AI lead-scoring engine. Produces a 0–100 score,
 * a letter grade, a heat rating and a next-best-action suggestion. Kept pure
 * so it is trivially unit-testable and can run inside a BullMQ worker.
 */
export function scoreLead(input: ScoringInput): ScoringResult {
  const factors: Record<string, number> = {};

  // Purchase volume: saturates around ₹50L/month.
  const volRatio = clamp01((input.monthlyPurchaseVolume ?? 0) / 5_000_000);
  factors.purchaseVolume = volRatio * WEIGHTS.purchaseVolume;

  // Company size: saturates around 2000 employees.
  const sizeRatio = clamp01((input.companySize ?? 0) / 2000);
  factors.companySize = sizeRatio * WEIGHTS.companySize;

  // Designation seniority.
  const title = (input.designation ?? "").toLowerCase();
  const titleRatio = SENIOR_TITLES.some((t) => title.includes(t))
    ? 1
    : MID_TITLES.some((t) => title.includes(t))
      ? 0.6
      : title
        ? 0.3
        : 0;
  factors.designation = titleRatio * WEIGHTS.designation;

  // Buying timeline: sooner is better. 0 days = full marks, >180 days = ~0.
  const timeline = input.buyingTimelineDays ?? 180;
  const timelineRatio = clamp01(1 - timeline / 180);
  factors.buyingTimeline = timelineRatio * WEIGHTS.buyingTimeline;

  // Previous interactions: saturates at 5.
  const interactionRatio = clamp01((input.previousInteractions ?? 0) / 5);
  factors.previousInteraction = interactionRatio * WEIGHTS.previousInteraction;

  // Product interest: any declared brand interest counts; more is better.
  const brands = input.interestedBrands ?? [];
  const interestRatio = clamp01(brands.length / 3);
  factors.productInterest = interestRatio * WEIGHTS.productInterest;

  // Region priority.
  const region = (input.region ?? "").toLowerCase();
  const regionRatio = PRIORITY_REGIONS.some((r) => region.includes(r)) ? 1 : region ? 0.4 : 0;
  factors.region = regionRatio * WEIGHTS.region;

  const score = Math.round(
    Object.values(factors).reduce((a, b) => a + b, 0),
  );

  const grade = toGrade(score);
  const heat = toHeat(score, timelineRatio);
  const suggestion = toSuggestion(score, heat);

  return { score, grade, heat, factors, suggestion };
}

export function toGrade(score: number): LeadGrade {
  if (score >= 90) return LeadGrade.A_PLUS;
  if (score >= 78) return LeadGrade.A;
  if (score >= 60) return LeadGrade.B;
  if (score >= 40) return LeadGrade.C;
  return LeadGrade.D;
}

export function toHeat(score: number, timelineRatio: number): LeadHeat {
  if (score >= 78 && timelineRatio >= 0.5) return LeadHeat.HOT;
  if (score >= 55) return LeadHeat.WARM;
  return LeadHeat.COLD;
}

export function toSuggestion(score: number, heat: LeadHeat): string {
  if (heat === LeadHeat.HOT && score >= 90) return "Call Immediately";
  if (heat === LeadHeat.HOT) return "Send Proposal";
  if (heat === LeadHeat.WARM && score >= 70) return "Assign To Manager";
  if (heat === LeadHeat.WARM) return "Follow Up In 2 Days";
  return "Nurture Campaign";
}
