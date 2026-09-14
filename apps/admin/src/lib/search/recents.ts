const STORAGE_KEY = "admin-search-recents-v1";
const MAX_RECENTS = 8;

export type AdminSearchRecent = {
  query: string;
  at: number;
};

export function readSearchRecents(): AdminSearchRecent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is AdminSearchRecent =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as AdminSearchRecent).query === "string" &&
          typeof (item as AdminSearchRecent).at === "number",
      )
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function pushSearchRecent(query: string): AdminSearchRecent[] {
  const q = query.trim();
  if (!q) return readSearchRecents();
  const next = [
    { query: q, at: Date.now() },
    ...readSearchRecents().filter(
      (r) => r.query.toLowerCase() !== q.toLowerCase(),
    ),
  ].slice(0, MAX_RECENTS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
  return next;
}

export function clearSearchRecents(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
