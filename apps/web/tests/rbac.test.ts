import { can, assertCan, ForbiddenError } from "@/lib/rbac";

describe("RBAC", () => {
  it("grants super admin everything", () => {
    expect(can("SUPER_ADMIN", "budget:delete")).toBe(true);
    expect(can("SUPER_ADMIN", "anything:goes")).toBe(true);
  });

  it("honours resource-level wildcards", () => {
    expect(can("FINANCE_MANAGER", "budget:create")).toBe(true);
    expect(can("FINANCE_MANAGER", "budget:approve")).toBe(true);
  });

  it("denies out-of-scope permissions", () => {
    expect(can("SALES_EXECUTIVE", "budget:approve")).toBe(false);
    expect(can("VENDOR", "lead:read")).toBe(false);
  });

  it("assertCan throws ForbiddenError when denied", () => {
    expect(() => assertCan("VENDOR", "event:create")).toThrow(ForbiddenError);
  });
});
