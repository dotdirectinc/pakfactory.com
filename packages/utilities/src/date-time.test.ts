import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDateTime, OFFICE_TIME_ZONE } from "./date-time";

// Run with TZ=UTC (as Vercel does) to prove nothing falls back to the machine's zone.
describe("formatDateTime — a named zone, never the machine's", () => {
  // 14:35 UTC on 16 Oct 2026 is 10:35 in Toronto (EDT, UTC−4).
  const iso = "2026-10-16T14:35:00.000Z";

  it("defaults to the office zone", () => {
    assert.equal(OFFICE_TIME_ZONE, "America/Toronto");
    assert.match(formatDateTime(iso), /10:35/);
    assert.match(formatDateTime(iso, "time"), /^10:35\s?AM$/);
  });

  it("takes another zone when asked", () => {
    assert.match(formatDateTime(iso, "time", "UTC"), /^2:35\s?PM$/);
  });

  it("a date follows the office's calendar day, not UTC's", () => {
    // 01:00 UTC on 17 Oct is 9 p.m. on 16 Oct in Toronto.
    assert.equal(formatDateTime("2026-10-17T01:00:00.000Z", "shortDate"), "Oct 16, 2026");
    assert.equal(formatDateTime("2026-10-17T01:00:00.000Z", "monthDay"), "October 16");
  });

  it("accepts a Date", () => {
    assert.equal(formatDateTime(new Date(iso), "longDate"), "October 16, 2026");
  });

  it("an empty or unreadable value gives the fallback", () => {
    assert.equal(formatDateTime(null), "—");
    assert.equal(formatDateTime("not a date", "dateTime", OFFICE_TIME_ZONE, "n/a"), "n/a");
  });
});
