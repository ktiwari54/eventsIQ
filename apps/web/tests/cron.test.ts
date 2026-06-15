import { cronMatches } from "@/server/cron";

// All dates are UTC since cronMatches uses UTC fields.
const at = (iso: string) => new Date(iso);

describe("cron matcher", () => {
  it("matches a specific minute/hour/day-of-week", () => {
    // Monday 2027-02-01 08:00 UTC (getUTCDay === 1)
    expect(cronMatches("0 8 * * 1", at("2027-02-01T08:00:00Z"))).toBe(true);
    expect(cronMatches("0 8 * * 1", at("2027-02-01T09:00:00Z"))).toBe(false); // wrong hour
    expect(cronMatches("0 8 * * 1", at("2027-02-02T08:00:00Z"))).toBe(false); // Tuesday
  });

  it("supports wildcards, lists, ranges and steps", () => {
    expect(cronMatches("* * * * *", at("2027-01-01T00:00:00Z"))).toBe(true);
    expect(cronMatches("15,45 * * * *", at("2027-01-01T10:45:00Z"))).toBe(true);
    expect(cronMatches("15,45 * * * *", at("2027-01-01T10:30:00Z"))).toBe(false);
    expect(cronMatches("0 9-17 * * *", at("2027-01-01T13:00:00Z"))).toBe(true);
    expect(cronMatches("*/15 * * * *", at("2027-01-01T10:30:00Z"))).toBe(true);
    expect(cronMatches("*/15 * * * *", at("2027-01-01T10:31:00Z"))).toBe(false);
  });

  it("rejects malformed expressions", () => {
    expect(cronMatches("not a cron", at("2027-01-01T00:00:00Z"))).toBe(false);
    expect(cronMatches("0 8 * *", at("2027-01-01T00:00:00Z"))).toBe(false); // only 4 fields
  });
});
