/**
 * The Spec Map opened on one record (2026-10-15): the Catalog is for reading and comparing, the Map for
 * editing and relations, and this is the way from one to the other.
 */
export const mapHref = (level: string, id: string) => `/spec/map?focus=${encodeURIComponent(`${level}:${id}`)}`;

/** `?focus=level:id` → its parts; anything else → null. */
export function parseMapFocus(v: string | string[] | undefined): { level: string; id: string } | null {
  const s = Array.isArray(v) ? v[0] : v;
  const at = s?.indexOf(":") ?? -1;
  return s && at > 0 && at < s.length - 1 ? { level: s.slice(0, at), id: s.slice(at + 1) } : null;
}
