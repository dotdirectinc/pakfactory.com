/**
 * Every date and time the admin office shows goes through here, in local time.
 *
 * `toLocaleString()` with no time zone uses the zone of the machine it runs on.
 * In the browser that is the viewer's own, but Server Components — and the first
 * render of Client Components — run on Vercel, in UTC, so a frame approved at
 * 10:35 in Toronto read "2:35 p.m.". Two ways in:
 *
 * - `<LocalTime>` (components/ui/local-time.tsx) for anything rendered: the same
 *   text on the server and in the first browser render (the office zone below),
 *   then the viewer's own zone once mounted. Use it wherever you can.
 * - `formatDateTime()` for text that must be a plain string (search subtitles,
 *   sentences, grouping keys). With no zone given it uses the office zone, never
 *   the machine's.
 */

/** The office's zone: what a date shows before the viewer's own zone is known. */
export const OFFICE_TIME_ZONE = "America/Toronto";

/** The formats in use. Add one here rather than formatting a date inline. */
export const DATE_TIME_PRESETS = {
  /** Oct 16, 2026, 10:35 a.m. — the default for records and runs. */
  dateTime: { locale: "en-CA", options: { dateStyle: "medium", timeStyle: "short" } },
  /** October 16, 2026 at 10:35 AM — a request's submitted time. */
  longDateTime: { locale: "en-US", options: { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } },
  /** Oct 16, 10:35 AM — the requests list. */
  shortDateTime: { locale: "en-US", options: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } },
  /** October 16, 2026 — a request document's date. */
  longDate: { locale: "en-US", options: { month: "long", day: "numeric", year: "numeric" } },
  /** Oct 16, 2026 — search subtitles. */
  shortDate: { locale: "en-US", options: { month: "short", day: "numeric", year: "numeric" } },
  /** October 16 — a timeline's day heading. */
  monthDay: { locale: "en-US", options: { month: "long", day: "numeric" } },
  /** 10:35 AM — a timeline entry. */
  time: { locale: "en-US", options: { hour: "numeric", minute: "2-digit" } },
} as const satisfies Record<string, { locale: string; options: Intl.DateTimeFormatOptions }>;

export type DateTimePreset = keyof typeof DATE_TIME_PRESETS;

/**
 * An ISO timestamp as text, in `timeZone` (the office zone when omitted).
 * Pass `null` for the runtime's own zone — only ever in the browser, after mount.
 * An empty or unreadable value returns `fallback`.
 */
export function formatDateTime(
  iso: string | null | undefined,
  preset: DateTimePreset = "dateTime",
  timeZone: string | null = OFFICE_TIME_ZONE,
  fallback = "—",
): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  const { locale, options } = DATE_TIME_PRESETS[preset];
  return date.toLocaleString(locale, timeZone ? { ...options, timeZone } : options);
}
