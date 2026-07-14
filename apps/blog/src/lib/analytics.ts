"use client";

import posthog from "posthog-js";

/**
 * PostHog analytics helpers (client-only). Canon: brain page
 * *blog-analytics-funnels* + docs/plans/posthog-blog-instrumentation-brief.md.
 *
 * PostHog is env-gated: when `NEXT_PUBLIC_POSTHOG_KEY` is unset (local,
 * previews) init never runs and every helper below is a silent no-op.
 * Autocapture covers link/CTA clicks (funnels filter by element href);
 * custom events exist only where autocapture can't reach.
 */

/**
 * AI answer-engine referrer hosts → `acquisition_channel: "ai_referral"`.
 * Marketing owns this list — extend as new engines appear.
 */
const AI_REFERRER_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "bing.com", // covers copilot/chat referrals; classified before organic_search
] as const;

const SEARCH_REFERRER_HOSTS = [
  "google.",
  "duckduckgo.com",
  "search.yahoo.com",
  "baidu.com",
  "yandex.",
] as const;

const SOCIAL_REFERRER_HOSTS = [
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "t.co",
  "youtube.com",
  "reddit.com",
  "pinterest.",
] as const;

export type AcquisitionChannel =
  | "ai_referral"
  | "organic_search"
  | "paid"
  | "social"
  | "referral"
  | "direct";

export function classifyAcquisitionChannel(
  referrer: string,
  currentUrl: string,
): AcquisitionChannel {
  try {
    const params = new URL(currentUrl).searchParams;
    const medium = params.get("utm_medium")?.toLowerCase();
    if (medium && ["cpc", "ppc", "paid", "paid_social"].includes(medium)) {
      return "paid";
    }
  } catch {
    /* ignore malformed URL */
  }

  if (!referrer) return "direct";

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "direct";
  }

  if (AI_REFERRER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return "ai_referral";
  }
  if (SEARCH_REFERRER_HOSTS.some((h) => host.includes(h))) {
    return "organic_search";
  }
  if (SOCIAL_REFERRER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`) || host.includes(h))) {
    return "social";
  }
  return "referral";
}

/** True when PostHog was initialized (key present) and is safe to call. */
function isEnabled(): boolean {
  return typeof window !== "undefined" && Boolean(posthog.__loaded);
}

/** Fire a custom event; silent no-op when PostHog is disabled. */
export function captureEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  if (!isEnabled()) return;
  posthog.capture(name, properties);
}
