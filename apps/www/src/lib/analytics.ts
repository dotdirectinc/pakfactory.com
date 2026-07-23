"use client";

import {sendGTMEvent} from "@next/third-parties/google";

/**
 * GTM analytics helpers (client-only) for apps/www.
 *
 * GTM is Sanity-gated: when Global Settings `gtmId` is unset (or the layout
 * skips inject outside production), `sendGTMEvent` is a silent no-op with a
 * soft console warning.
 */

/** Fire a custom event into GTM's dataLayer; no-op when GTM is not mounted. */
export function captureEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  sendGTMEvent({event: name, ...properties});
}
