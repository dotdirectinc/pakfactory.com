import posthog from "posthog-js";

import { classifyAcquisitionChannel } from "@/lib/analytics";

/**
 * PostHog client init (Next.js `instrumentation-client` convention — runs
 * once before the app becomes interactive). Env-gated: no key ⇒ no init, no
 * network requests (local + preview deploys stay silent).
 *
 * `defaults: "2026-01-30"` enables PostHog's current recommended defaults,
 * including `capture_pageview: "history_change"` — SPA/App Router
 * navigations produce `$pageview` automatically.
 *
 * Session recording stays OFF (no consent banner yet — see the Consent Mode
 * open question on the brain's site-integrations-settings page).
 */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2026-01-30",
    disable_session_recording: true,
    respect_dnt: true,
  });

  // First-touch acquisition channel (incl. the `ai_referral` bucket that
  // tests the AEO thesis). `register_once` = set once per device, stable
  // across the whole journey.
  posthog.register_once({
    acquisition_channel: classifyAcquisitionChannel(
      document.referrer,
      window.location.href,
    ),
  });
}
