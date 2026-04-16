export function normalizeSegment(segment: string): string {
  return segment.toLowerCase();
}

/** Last URL segment may include a legacy `.html` suffix. */
export function normalizeHandle(segment: string): string {
  const lower = segment.toLowerCase();
  return lower.endsWith(".html") ? lower.slice(0, -".html".length) : lower;
}
