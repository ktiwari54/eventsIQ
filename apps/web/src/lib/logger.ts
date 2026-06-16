// Structured JSON logger. Emits one JSON object per line (level, msg, time +
// arbitrary fields) so logs are machine-parseable by any aggregator (Datadog,
// Loki, CloudWatch). Falls back to pretty output in development.

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? LEVELS.info;
const isDev = process.env.NODE_ENV === "development";

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (LEVELS[level] < MIN) return;
  const entry = { level, msg, time: new Date().toISOString(), ...fields };
  const line = isDev ? `[${level}] ${msg}${fields ? " " + JSON.stringify(fields) : ""}` : JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
  /** Serialize an unknown error into log-friendly fields. */
  errFields: (err: unknown): Record<string, unknown> =>
    err instanceof Error ? { error: err.message, stack: err.stack } : { error: String(err) },
};
