/**
 * Dates and times for every app — formatted in a named time zone, never the
 * machine's.
 *
 * `toLocaleString()` with no `timeZone` uses the zone of whatever runs it. Server
 * Components, and the first render of Client Components, run on Vercel in UTC, so
 * an untreated date is hours off — and a calendar date can be a day off (a post
 * published at 9 p.m. in Toronto reads as the next day).
 *
 * Which zone (industry practice; PakFactory's choice):
 * - **The viewer's own** for signed-in surfaces and anything with a time of day
 *   (admin office, a buyer's requests): render with `<LocalTime>` from
 *   `@pakfactory/ui/components/local-time`, which starts in `OFFICE_TIME_ZONE`
 *   and switches to the browser's zone once mounted.
 * - **The publisher's** (`OFFICE_TIME_ZONE`) for public, cached, date-only text
 *   (blog post dates, newsroom): `formatDateTime(iso, "shortDate")`. Label the
 *   zone ("ET") if a public page ever shows a time of day in it.
 */

/** PakFactory's own zone: the publisher's date, and what a date shows before the viewer's zone is known. */
export const OFFICE_TIME_ZONE = "America/Toronto";

/** The formats in use. Add one here rather than formatting a date inline. */
export const DATE_TIME_PRESETS = {
  /** Oct 16, 2026, 10:35 a.m. — admin records and runs. */
  dateTime: { locale: "en-CA", options: { dateStyle: "medium", timeStyle: "short" } },
  /** October 16, 2026 at 10:35 AM — a request's submitted time. */
  longDateTime: { locale: "en-US", options: { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } },
  /** Oct 16, 10:35 AM — a list row. */
  shortDateTime: { locale: "en-US", options: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } },
  /** October 16, 2026 — a document's date. */
  longDate: { locale: "en-US", options: { month: "long", day: "numeric", year: "numeric" } },
  /** Oct 16, 2026 — post dates, list dates, search subtitles. */
  shortDate: { locale: "en-US", options: { month: "short", day: "numeric", year: "numeric" } },
  /** October 16 — a timeline's day heading. */
  monthDay: { locale: "en-US", options: { month: "long", day: "numeric" } },
  /** 10:35 AM — a timeline entry. */
  time: { locale: "en-US", options: { hour: "numeric", minute: "2-digit" } },
  /** Thursday, October 16, 2026 at 10:35:00 a.m. EDT — the full value, e.g. a tooltip. */
  full: { locale: "en-CA", options: { dateStyle: "full", timeStyle: "long" } },
} as const satisfies Record<string, { locale: string; options: Intl.DateTimeFormatOptions }>;

export type DateTimePreset = keyof typeof DATE_TIME_PRESETS;

/**
 * An ISO timestamp (or Date) as text, in `timeZone` — the office zone when omitted.
 * Pass `null` for the runtime's own zone: only ever in the browser, after mount.
 * An empty or unreadable value returns `fallback`.
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  preset: DateTimePreset = "dateTime",
  timeZone: string | null = OFFICE_TIME_ZONE,
  fallback = "—",
): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const { locale, options } = DATE_TIME_PRESETS[preset];
  return date.toLocaleString(locale, timeZone ? { ...options, timeZone } : options);
}
