import { eventCaptureUrl } from "@/server/qr";
import { emailLayout } from "@/lib/email";

describe("event capture URL", () => {
  it("builds a capture link carrying the event id", () => {
    expect(eventCaptureUrl("https://app.eventiq.dev", "evt_123")).toBe(
      "https://app.eventiq.dev/leads/capture?event=evt_123",
    );
  });
});

describe("email layout", () => {
  it("embeds the title and body in branded HTML", () => {
    const html = emailLayout("Budget approved", "The booth budget is approved.");
    expect(html).toContain("EVENT IQ");
    expect(html).toContain("Budget approved");
    expect(html).toContain("The booth budget is approved.");
  });
});
