import { toCsv, type Dataset } from "@/server/report-data";

describe("report CSV serializer", () => {
  const ds: Dataset = {
    title: "Test",
    headers: ["Name", "Amount", "Note"],
    rows: [
      ["Alpha", 100, "ok"],
      ['Beta, Inc', 200, 'has "quotes"'],
      ["Gamma", null, "line\nbreak"],
    ],
  };

  it("emits a header row followed by data rows", () => {
    const csv = toCsv(ds);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Amount,Note");
    expect(csv).toContain("Alpha,100,ok");
  });

  it("quotes and escapes values containing commas, quotes or newlines", () => {
    const csv = toCsv(ds);
    expect(csv).toContain('"Beta, Inc"');
    expect(csv).toContain('"has ""quotes"""');
    expect(csv).toContain('"line\nbreak"');
  });

  it("renders null cells as empty", () => {
    const csv = toCsv(ds);
    expect(csv).toContain("Gamma,,");
  });
});
