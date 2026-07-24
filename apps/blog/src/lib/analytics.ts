"use client";

import { sendGTMEvent } from "@next/third-parties/google";

/**
 * GTM analytics helpers (client-only). Canon: brain page
 * *blog-analytics-funnels*.
 *
 * GTM is Sanity-gated: when Global Settings `gtmId` is unset (or the layout
 * skips inject outside production), `sendGTMEvent` is a silent no-op with a
 * soft console warning. SPA pageviews: `virtual_pageview` via
 * `VirtualPageviewTracker` on client navigations only, not initial load
 * (PROD-2191). Other custom events exist only where autocapture can't reach.
 */

/** Fire a custom event into GTM's dataLayer; no-op when GTM is not mounted. */
export function captureEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  sendGTMEvent({ event: name, ...properties });
}
