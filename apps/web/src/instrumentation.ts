// Next.js instrumentation hook — runs once when the server process boots.
// Initialises Sentry (if SENTRY_DSN is set). Metrics are collected lazily by
// the API handler and exposed at /api/metrics.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initObservability } = await import("./lib/observability");
    initObservability();
  }
}
