export function formatPostDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return undefined;
  }
}

export function formatReadTime(minutes?: number | null): string | undefined {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) {
    return undefined;
  }
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded}min read`;
}
