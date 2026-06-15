import { parseCardText } from "@/server/ocr";

describe("business card text parser", () => {
  it("extracts name, title, email and phone from a typical card", () => {
    const text = [
      "Rajan Gupta",
      "Director of Sales",
      "Alpha Electronics Pvt Ltd",
      "rajan@alphaelectronics.com",
      "+91 98765 43210",
      "www.alphaelectronics.com",
    ].join("\n");

    const card = parseCardText(text);
    expect(card.name).toBe("Rajan Gupta");
    expect(card.designation?.toLowerCase()).toContain("director");
    expect(card.email).toBe("rajan@alphaelectronics.com");
    expect(card.phone).toContain("98765");
    expect(card.company).toBe("Alphaelectronics");
    expect(card.confidence).toBeGreaterThan(0.5);
  });

  it("ignores generic email domains when deriving company", () => {
    const card = parseCardText("Meena Iyer\nManager\nmeena@gmail.com\n+91 90000 11111");
    expect(card.company).not.toBe("Gmail");
  });

  it("returns low confidence for sparse text", () => {
    const card = parseCardText("Hello there");
    expect(card.confidence).toBeLessThan(0.5);
  });
});
