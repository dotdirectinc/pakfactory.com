/**
 * Per-provider height adapters for the auto-sizing embed (bodyEmbed).
 *
 * Cross-origin iframes can only be auto-sized if the embedded page posts its
 * height. There is no universal format, so each cooperating provider gets a
 * small adapter that recognizes its host and parses its message shape. Providers
 * with no adapter fall back to `genericHeightFromMessage` (common shapes), and
 * providers that never post a height (e.g. Google Forms) simply keep the
 * configured fallback height — there is nothing to adapt.
 */

export type EmbedHeightAdapter = {
  id: string;
  /** Does this adapter apply to the embed host? (host is normalized, no `www.`) */
  matches: (host: string) => boolean;
  /** Extract a positive pixel height from a postMessage payload, or null. */
  parseHeight: (data: unknown) => number | null;
};

function toPositive(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) {
    const parsed = Number.parseFloat(value);
    return parsed > 0 ? parsed : null;
  }
  return null;
}

/**
 * Zoho Survey posts `{ zohosurvey: { height, width, action: "surveySize" } }`
 * from survey.zohopublic.com.
 *
 * Note: there is intentionally no Google Forms adapter — Google Forms never
 * posts its height cross-origin, so `docs.google.com` embeds use a fixed height.
 */
const zohoSurvey: EmbedHeightAdapter = {
  id: "zoho-survey",
  matches: (host) =>
    host === "zohopublic.com" || host.endsWith(".zohopublic.com"),
  parseHeight: (data) => {
    if (!data || typeof data !== "object") return null;
    const payload = (data as { zohosurvey?: unknown }).zohosurvey;
    if (!payload || typeof payload !== "object") return null;
    return toPositive((payload as { height?: unknown }).height);
  },
};

const ADAPTERS: EmbedHeightAdapter[] = [zohoSurvey];

/** The height adapter for a host, if one is registered. */
export function adapterForHost(host: string): EmbedHeightAdapter | null {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  return ADAPTERS.find((adapter) => adapter.matches(normalized)) ?? null;
}

/** Best-effort fallback for embeds with no specific adapter (common shapes). */
export function genericHeightFromMessage(data: unknown): number | null {
  const direct = toPositive(data);
  if (direct != null) return direct;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of [
      "height",
      "pakfactoryEmbedHeight",
      "frameHeight",
      "scrollHeight",
      "documentHeight",
    ]) {
      const height = toPositive(record[key]);
      if (height != null) return height;
    }
  }
  return null;
}
