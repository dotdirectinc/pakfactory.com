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

/** Label chip: `$50,000`. */
export function formatSpendLabel(
  value: string | number | null | undefined,
): string {
  const formatted = formatSpendInput(value);
  return formatted ? `$${formatted}` : "";
}

/** Numeric spend label or raw band string (e.g. `100k-250k`). */
export function formatAnnualSpendDisplay(
  value: string | number | null | undefined,
): string {
  const labeled = formatSpendLabel(value);
  if (labeled) return labeled;
  const raw = String(value ?? "").trim();
  return raw;
}
