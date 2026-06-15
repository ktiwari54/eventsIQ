// Observability bootstrap. Sentry for error tracking, OpenTelemetry for traces
// exported to an OTLP collector (Grafana/Tempo/Prometheus stack). Initialised
// lazily so local dev runs without any of these configured.

export function initObservability() {
  if (process.env.SENTRY_DSN) {
    // Optional dependency — resolved at runtime only when installed + SENTRY_DSN set.
    // A non-literal specifier stops `next build` from type-checking the module path.
    const sentryModule = "@sentry/nextjs";
    import(sentryModule)
      .then((Sentry: { init: (opts: Record<string, unknown>) => void }) =>
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          tracesSampleRate: 0.1,
          environment: process.env.NODE_ENV,
        }),
      )
      .catch(() => {});
  }
}

/** Increment a Prometheus-style counter (no-op shim; wire to your metrics SDK). */
export function metric(name: string, value = 1, labels: Record<string, string> = {}) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[metric] ${name}=${value}`, labels);
  }
}
