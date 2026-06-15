import {
  eventCreateSchema,
  leadCreateSchema,
  reportScheduleSchema,
  userInviteSchema,
} from "@/server/validation";

describe("validation schemas", () => {
  it("accepts a valid event and rejects end-before-start", () => {
    const ok = eventCreateSchema.safeParse({
      name: "IMC 2027",
      type: "TRADE_SHOW",
      startDate: "2027-02-01",
      endDate: "2027-02-04",
    });
    expect(ok.success).toBe(true);

    const bad = eventCreateSchema.safeParse({
      name: "IMC 2027",
      type: "TRADE_SHOW",
      startDate: "2027-02-04",
      endDate: "2027-02-01",
    });
    expect(bad.success).toBe(false);
  });

  it("defaults lead source to MANUAL and requires a name", () => {
    const ok = leadCreateSchema.parse({ name: "Rajan" });
    expect(ok.source).toBe("MANUAL");
    expect(ok.interestedBrands).toEqual([]);
    expect(leadCreateSchema.safeParse({}).success).toBe(false);
  });

  it("validates a cron expression for report schedules", () => {
    expect(reportScheduleSchema.safeParse({ name: "Weekly", type: "ROI", cron: "0 8 * * 1" }).success).toBe(true);
    expect(reportScheduleSchema.safeParse({ name: "Bad", type: "ROI", cron: "not-cron" }).success).toBe(false);
  });

  it("requires a valid email for user invites", () => {
    expect(userInviteSchema.safeParse({ name: "A", email: "a@b.com" }).success).toBe(true);
    expect(userInviteSchema.safeParse({ name: "A", email: "nope" }).success).toBe(false);
  });
});
