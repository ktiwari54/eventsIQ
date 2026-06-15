// Minimal 5-field cron matcher (min hour day-of-month month day-of-week).
// Supports: *, single numbers, comma lists (1,15), ranges (1-5) and steps (*/n,
// 1-10/2). Used by the Vercel-cron processing endpoint to fire due report
// schedules without a long-running BullMQ worker (serverless staging).

export function cronMatches(expr: string, date: Date = new Date()): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const [min, hour, dom, mon, dow] = fields;
  return (
    matchField(min, date.getUTCMinutes(), 0, 59) &&
    matchField(hour, date.getUTCHours(), 0, 23) &&
    matchField(dom, date.getUTCDate(), 1, 31) &&
    matchField(mon, date.getUTCMonth() + 1, 1, 12) &&
    matchField(dow, date.getUTCDay(), 0, 6)
  );
}

function matchField(field: string, value: number, min: number, max: number): boolean {
  return field.split(",").some((part) => matchPart(part, value, min, max));
}

function matchPart(part: string, value: number, min: number, max: number): boolean {
  let step = 1;
  let range = part;
  const slash = part.indexOf("/");
  if (slash !== -1) {
    step = Number(part.slice(slash + 1));
    range = part.slice(0, slash);
    if (!Number.isInteger(step) || step <= 0) return false;
  }

  let lo = min;
  let hi = max;
  if (range !== "*") {
    const dash = range.indexOf("-");
    if (dash !== -1) {
      lo = Number(range.slice(0, dash));
      hi = Number(range.slice(dash + 1));
    } else {
      lo = hi = Number(range);
    }
    if (!Number.isInteger(lo) || !Number.isInteger(hi)) return false;
  }

  if (value < lo || value > hi) return false;
  return (value - lo) % step === 0;
}
