export interface RoiInput {
  totalCost: number;
  revenue: number;
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
}

export interface RoiOutput {
  roi: number; // multiple, e.g. 3.8 means revenue is 3.8x of cost
  roiPercent: number;
  costPerLead: number;
  costPerQL: number;
  revenuePerLead: number;
  conversionRate: number;
  verdict: "REPEAT" | "KEEP" | "REVIEW" | "AVOID";
}

/**
 * Core ROI engine. ROI = (Revenue - Cost) / Cost, also surfaced as a revenue
 * multiple plus per-lead economics used across the dashboard and reports.
 */
export function computeRoi(input: RoiInput): RoiOutput {
  const { totalCost, revenue, totalLeads, qualifiedLeads, convertedLeads } = input;
  const safeCost = totalCost > 0 ? totalCost : 1;

  const roiMultiple = revenue / safeCost;
  const roiPercent = ((revenue - totalCost) / safeCost) * 100;
  const costPerLead = totalLeads > 0 ? totalCost / totalLeads : 0;
  const costPerQL = qualifiedLeads > 0 ? totalCost / qualifiedLeads : 0;
  const revenuePerLead = totalLeads > 0 ? revenue / totalLeads : 0;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  let verdict: RoiOutput["verdict"] = "REVIEW";
  if (roiMultiple >= 3) verdict = "REPEAT";
  else if (roiMultiple >= 1.8) verdict = "KEEP";
  else if (roiMultiple >= 1.2) verdict = "REVIEW";
  else verdict = "AVOID";

  return {
    roi: round2(roiMultiple),
    roiPercent: round2(roiPercent),
    costPerLead: round2(costPerLead),
    costPerQL: round2(costPerQL),
    revenuePerLead: round2(revenuePerLead),
    conversionRate: round2(conversionRate),
    verdict,
  };
}

/**
 * Naive linear revenue forecast based on historical event revenues. Returns a
 * projected next-period value plus a simple trend direction. A production
 * deployment would swap this for a model served behind the AI worker.
 */
export function forecastRevenue(history: number[]): { projected: number; trend: "up" | "down" | "flat" } {
  if (history.length === 0) return { projected: 0, trend: "flat" };
  const n = history.length;
  const xMean = (n - 1) / 2;
  const yMean = history.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  history.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const projected = Math.max(0, round2(slope * n + intercept));
  return { projected, trend: slope > 0.01 ? "up" : slope < -0.01 ? "down" : "flat" };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
