import { computeRoi, forecastRevenue } from "@/server/roi";

describe("ROI engine", () => {
  it("computes ROI multiple and per-lead economics", () => {
    const r = computeRoi({
      totalCost: 5_500_000,
      revenue: 21_000_000,
      totalLeads: 842,
      qualifiedLeads: 250,
      convertedLeads: 67,
    });
    expect(r.roi).toBeCloseTo(3.82, 1);
    expect(r.verdict).toBe("REPEAT");
    expect(r.costPerLead).toBeGreaterThan(0);
    expect(r.conversionRate).toBeCloseTo(7.96, 1);
  });

  it("flags low ROI events as AVOID", () => {
    const r = computeRoi({ totalCost: 3_000_000, revenue: 3_300_000, totalLeads: 195, qualifiedLeads: 40, convertedLeads: 5 });
    expect(r.roi).toBeCloseTo(1.1, 1);
    expect(r.verdict).toBe("AVOID");
  });

  it("handles zero cost without dividing by zero", () => {
    const r = computeRoi({ totalCost: 0, revenue: 1000, totalLeads: 0, qualifiedLeads: 0, convertedLeads: 0 });
    expect(Number.isFinite(r.roi)).toBe(true);
  });

  it("forecasts an upward trend", () => {
    const f = forecastRevenue([100, 200, 300, 400]);
    expect(f.trend).toBe("up");
    expect(f.projected).toBeGreaterThan(400);
  });
});
