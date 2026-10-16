"use client";

import { useEffect, useState } from "react";
import { formatDateTime, OFFICE_TIME_ZONE, type DateTimePreset } from "@/lib/date-time";

/**
 * A timestamp in the viewer's local time (see lib/date-time.ts).
 *
 * The server and the first browser render both use the office zone, so they
 * agree and hydration never mismatches; after mount it re-renders in the
 * viewer's own zone. The full date and time, with the zone, is the tooltip.
 */
export function LocalTime({ iso, preset = "dateTime", fallback = "—", className }: {
  iso: string | null | undefined;
  preset?: DateTimePreset;
  fallback?: string;
  className?: string;
}) {
  const [zone, setZone] = useState<string | null>(OFFICE_TIME_ZONE);
  useEffect(() => { setZone(null); }, []);
  const text = formatDateTime(iso, preset, zone, fallback);
  if (!iso || text === fallback) return <span className={className}>{fallback}</span>;
  const full = new Date(iso).toLocaleString("en-CA", { dateStyle: "full", timeStyle: "long", ...(zone ? { timeZone: zone } : {}) });
  return <time dateTime={iso} title={full} className={className}>{text}</time>;
}
