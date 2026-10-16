/**
 * A post's date is the publisher's date, so it is formatted in PakFactory's zone.
 * Without a `timeZone` it used the server's (UTC on Vercel): a post published at
 * 9 p.m. in Toronto showed the next day.
 *
 * TODO: once www-new-release merges into staging, use `formatDateTime(iso,
 * "shortDate")` from `@pakfactory/utilities/date-time` — the same rule, shared by
 * every app. That package does not exist on staging yet.
 */
const POST_TIME_ZONE = "America/Toronto";

export function formatPostDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", {
    timeZone: POST_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatReadTime(minutes?: number | null): string | undefined {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) {
    return undefined;
  }
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded}min read`;
}
