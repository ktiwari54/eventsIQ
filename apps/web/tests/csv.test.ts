import { parseCsv } from "@/server/csv";

describe("CSV parser", () => {
  it("parses headers and rows into lower-cased keyed objects", () => {
    const rows = parseCsv("Name,Email\nRajan,rajan@x.com\nMeena,meena@y.com");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "Rajan", email: "rajan@x.com" });
    expect(rows[1].email).toBe("meena@y.com");
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const rows = parseCsv('name,company\n"Gupta, R","Alpha ""Pvt"" Ltd"');
    expect(rows[0].name).toBe("Gupta, R");
    expect(rows[0].company).toBe('Alpha "Pvt" Ltd');
  });

  it("supports newlines inside quoted fields", () => {
    const rows = parseCsv('name,notes\nRajan,"line1\nline2"');
    expect(rows).toHaveLength(1);
    expect(rows[0].notes).toBe("line1\nline2");
  });

  it("skips fully blank rows", () => {
    const rows = parseCsv("name,email\nRajan,r@x.com\n\n");
    expect(rows).toHaveLength(1);
  });
});
