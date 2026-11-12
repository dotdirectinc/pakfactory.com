export type AnnualSpendCurrency = "USD" | "CAD";

export const ANNUAL_SPEND_CURRENCIES: readonly AnnualSpendCurrency[] = [
  "USD",
  "CAD",
];

export function isAnnualSpendCurrency(
  value: unknown,
): value is AnnualSpendCurrency {
  return value === "USD" || value === "CAD";
}

export function digitsOnlySpend(
  value: string | number | null | undefined,
): string {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

/** Store/display with grouping commas, no currency symbol. */
export function formatSpendInput(
  value: string | number | null | undefined,
): string {
  const digits = digitsOnlySpend(value);
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("en-US");
}

/** Label chip: `$50,000` or `$50,000 CAD` when a currency is provided. */
export function formatSpendLabel(
  value: string | number | null | undefined,
  currency?: AnnualSpendCurrency | null,
): string {
  const formatted = formatSpendInput(value);
  if (!formatted) return "";
  return currency ? `$${formatted} ${currency}` : `$${formatted}`;
}

/** Numeric spend label or raw band string (e.g. `100k-250k`). */
export function formatAnnualSpendDisplay(
  value: string | number | null | undefined,
  currency?: AnnualSpendCurrency | null,
): string {
  const labeled = formatSpendLabel(value, currency);
  if (labeled) return labeled;
  const raw = String(value ?? "").trim();
  return raw;
}

/**
 * Currency for display: use the stored code when present; otherwise USD for a
 * pure numeric amount. Legacy band strings (`100k-250k`) return undefined so the
 * label is left alone.
 */
export function resolveAnnualSpendCurrency(
  value: string | number | null | undefined,
  currency?: AnnualSpendCurrency | null,
): AnnualSpendCurrency | undefined {
  if (currency === "USD" || currency === "CAD") return currency;
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  // Pure digits / comma-grouped number → treat missing currency as USD.
  if (/^[0-9,]+$/.test(raw) && digitsOnlySpend(raw)) return "USD";
  return undefined;
}
