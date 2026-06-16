// Centralised number/currency formatting. Currency + locale are configurable
// via env so the hardcoded ₹ assumption can be localised per deployment.

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "INR";
const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "en-IN";

/** Full currency, e.g. ₹2,10,00,000. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(value);
}

/** Compact currency for KPIs: ₹2.1Cr / ₹55L / ₹6,500 (Indian scale by default). */
export function formatCompactCurrency(value: number): string {
  const symbol = currencySymbol();
  if (CURRENCY === "INR") {
    if (value >= 1e7) return `${symbol}${round(value / 1e7)}Cr`;
    if (value >= 1e5) return `${symbol}${round(value / 1e5)}L`;
    return `${symbol}${Math.round(value).toLocaleString(LOCALE)}`;
  }
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

function currencySymbol(): string {
  const parts = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? "";
}

function round(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
