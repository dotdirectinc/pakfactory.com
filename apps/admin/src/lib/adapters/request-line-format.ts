export type StoredDimensions = {
  unit: "in" | "mm";
  external?: { axis: string; value: string }[];
  internal?: { axis: string; value: string }[];
  externalNote?: string;
  internalNote?: string;
  consultation?: boolean;
};

/**
 * Same wording as the backend's Zoho description and receipt (pakfactory.com-backend
 * src/services/request/line-format.ts), so sales reads one request the same way everywhere.
 */
export function formatDimensions(d: StoredDimensions | undefined): string {
  if (!d) return "";
  if (d.consultation) return "Specialist to advise";
  const side = (label: string, m: StoredDimensions["external"], note?: string) =>
    m?.length
      ? `${label} ${m.map((x) => x.value).join(" × ")} ${d.unit} (${m.map((x) => x.axis).join(" × ")})${note ? ` — ${note}` : ""}`
      : null;
  return [side("Ext", d.external, d.externalNote), side("Int", d.internal, d.internalNote)]
    .filter((s): s is string => s !== null)
    .join(" · ");
}

/** "Soft Touch [Surface Finish] (Matte) — lid only" — the backend's `formatPick`. */
export function formatPick(c: { label: string; type?: string; properties?: string[]; note?: string }): string {
  return [
    c.label,
    c.type ? ` [${c.type}]` : "",
    c.properties?.length ? ` (${c.properties.join(", ")})` : "",
    c.note ? ` — ${c.note}` : "",
  ].join("");
}
