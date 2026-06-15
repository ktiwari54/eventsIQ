import { scoreLead, toGrade } from "@/server/scoring";
import { LeadGrade, LeadHeat } from "@prisma/client";

describe("AI lead scoring engine", () => {
  it("scores a high-value, senior, immediate-buyer lead as hot A+", () => {
    const r = scoreLead({
      monthlyPurchaseVolume: 5_000_000,
      companySize: 2000,
      designation: "CEO",
      buyingTimelineDays: 0,
      previousInteractions: 5,
      interestedBrands: ["Samsung", "Apple", "Vivo"],
      region: "Mumbai",
    });
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.grade).toBe(LeadGrade.A_PLUS);
    expect(r.heat).toBe(LeadHeat.HOT);
    expect(r.suggestion).toBe("Call Immediately");
  });

  it("scores an empty lead as cold grade D", () => {
    const r = scoreLead({});
    expect(r.score).toBeLessThan(40);
    expect(r.grade).toBe(LeadGrade.D);
    expect(r.heat).toBe(LeadHeat.COLD);
  });

  it("keeps scores bounded between 0 and 100", () => {
    const r = scoreLead({ monthlyPurchaseVolume: 999_999_999, companySize: 999_999 });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("maps grade boundaries correctly", () => {
    expect(toGrade(90)).toBe(LeadGrade.A_PLUS);
    expect(toGrade(78)).toBe(LeadGrade.A);
    expect(toGrade(60)).toBe(LeadGrade.B);
    expect(toGrade(40)).toBe(LeadGrade.C);
    expect(toGrade(0)).toBe(LeadGrade.D);
  });
});
