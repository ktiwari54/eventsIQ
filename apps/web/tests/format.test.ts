import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/format";

describe("currency/number formatting (INR default)", () => {
  it("formats compact crores and lakhs", () => {
    expect(formatCompactCurrency(21_000_000)).toBe("₹2.1Cr");
    expect(formatCompactCurrency(5_500_000)).toBe("₹55L");
  });

  it("formats sub-lakh amounts with grouping", () => {
    expect(formatCompactCurrency(6500)).toBe("₹6,500");
  });

  it("formats full currency and plain numbers", () => {
    expect(formatCurrency(100)).toContain("₹");
    expect(formatNumber(4821)).toBe("4,821");
  });
});
