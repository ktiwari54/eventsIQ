import { NextRequest } from "next/server";
import { verifyOrigin } from "@/lib/api";

function reqWith(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://app.eventiq.dev/api/leads", { headers });
}

describe("CSRF origin verification", () => {
  it("allows same-origin requests (origin host matches request host)", () => {
    expect(verifyOrigin(reqWith({ origin: "https://app.eventiq.dev", host: "app.eventiq.dev" }))).toBe(true);
  });

  it("blocks cross-origin requests", () => {
    expect(verifyOrigin(reqWith({ origin: "https://evil.example", host: "app.eventiq.dev" }))).toBe(false);
  });

  it("allows requests with no Origin/Referer (non-browser callers)", () => {
    expect(verifyOrigin(reqWith({ host: "app.eventiq.dev" }))).toBe(true);
  });

  it("honours NEXTAUTH_URL as an allowed origin", () => {
    const prev = process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_URL = "https://staging.eventiq.dev";
    expect(verifyOrigin(reqWith({ origin: "https://staging.eventiq.dev", host: "internal" }))).toBe(true);
    process.env.NEXTAUTH_URL = prev;
  });

  it("rejects a malformed Origin header", () => {
    expect(verifyOrigin(reqWith({ origin: "not-a-url", host: "app.eventiq.dev" }))).toBe(false);
  });
});
