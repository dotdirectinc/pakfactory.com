"use client";

import { useEffect, useState } from "react";
import { formatDateTime, OFFICE_TIME_ZONE, type DateTimePreset } from "@pakfactory/utilities/date-time";

/**
 * The zone to format in: `OFFICE_TIME_ZONE` on the server and the first browser
 * render (so both produce the same text and hydration never mismatches), then
 * `null` — the viewer's own zone — once mounted. For dates that must be plain
 * strings, e.g. a prop of another component:
 * `formatDateTime(iso, "longDate", useViewerTimeZone())`.
 */
export function useViewerTimeZone(): string | null {
  const [zone, setZone] = useState<string | null>(OFFICE_TIME_ZONE);
  useEffect(() => {
    setZone(null);
  }, []);
  return zone;
}

/**
 * A timestamp in the viewer's local time (see `@pakfactory/utilities/date-time`),
 * in a `<time>` element whose tooltip is the full date, time and zone.
 */
export function LocalTime({
  iso,
  preset = "dateTime",
  fallback = "—",
  className,
}: {
  iso: string | null | undefined;
  preset?: DateTimePreset;
  fallback?: string;
  className?: string;
}) {
  const zone = useViewerTimeZone();
  const text = formatDateTime(iso, preset, zone, fallback);
  if (!iso || text === fallback) return <span className={className}>{fallback}</span>;
  return (
    <time dateTime={iso} title={formatDateTime(iso, "full", zone)} className={className}>
      {text}
    </time>
  );
}
