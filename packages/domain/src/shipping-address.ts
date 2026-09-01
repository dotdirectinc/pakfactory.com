import type { ShippingAddress } from "./request";

export function formatAddressLines(
  address: ShippingAddress | null | undefined,
): string[] {
  if (!address || typeof address !== "object") return [];
  const lines: string[] = [];
  if (String(address.label ?? "").trim()) lines.push(address.label!.trim());
  if (String(address.line1 ?? "").trim()) lines.push(address.line1!.trim());
  const cityRegion = [address.city, address.region, address.postalCode]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  if (cityRegion) lines.push(cityRegion);
  if (String(address.country ?? "").trim()) {
    lines.push(address.country!.trim());
  }
  return lines;
}
