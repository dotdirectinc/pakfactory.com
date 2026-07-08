/**
 * Per-provider size adapters for the auto-sizing embed (bodyEmbed).
 *
 * Cross-origin iframes can only be auto-sized if the embedded page posts its
 * dimensions. There is no universal format, so each cooperating provider gets a
 * small adapter that recognizes its host and parses its message shape. Providers
 * with no adapter fall back to `genericSizeFromMessage` (common shapes), and
 * providers that never post their size (e.g. Google Forms) simply keep the
 * configured fallback size — there is nothing to adapt.
 */

export type EmbedSize = { width?: number; height?: number };

export type EmbedSizeAdapter = {
  id: string;
  /** Does this adapter apply to the embed host? (host is normalized, no `www.`) */
  matches: (host: string) => boolean;
  /** Extract a positive width/height from a postMessage payload, or null. */
  parseSize: (data: unknown) => EmbedSize | null;
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

function size(width: number | null, height: number | null): EmbedSize | null {
  if (width == null && height == null) return null;
  return {
    ...(width != null ? { width } : {}),
    ...(height != null ? { height } : {}),
  };
}

/**
 * Zoho Survey posts `{ zohosurvey: { height, width, action: "surveySize" } }`
 * from survey.zohopublic.com — the survey form's actual dimensions.
 *
 * Note: there is intentionally no Google Forms adapter — Google Forms never
 * posts its size cross-origin, so `docs.google.com` embeds use a fixed size.
 */
const zohoSurvey: EmbedSizeAdapter = {
  id: "zoho-survey",
  matches: (host) =>
    host === "zohopublic.com" || host.endsWith(".zohopublic.com"),
  parseSize: (data) => {
    if (!data || typeof data !== "object") return null;
    const payload = (data as { zohosurvey?: unknown }).zohosurvey;
    if (!payload || typeof payload !== "object") return null;
    const record = payload as { height?: unknown; width?: unknown };
    return size(toPositive(record.width), toPositive(record.height));
  },
};

const ADAPTERS: EmbedSizeAdapter[] = [zohoSurvey];

/** The size adapter for a host, if one is registered. */
export function adapterForHost(host: string): EmbedSizeAdapter | null {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  return ADAPTERS.find((adapter) => adapter.matches(normalized)) ?? null;
}

/** Best-effort fallback for embeds with no specific adapter (common shapes). */
export function genericSizeFromMessage(data: unknown): EmbedSize | null {
  const direct = toPositive(data);
  if (direct != null) return { height: direct };
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    let height: number | null = null;
    let width: number | null = null;
    for (const key of [
      "height",
      "pakfactoryEmbedHeight",
      "frameHeight",
      "scrollHeight",
      "documentHeight",
    ]) {
      height = height ?? toPositive(record[key]);
    }
    for (const key of ["width", "frameWidth", "scrollWidth"]) {
      width = width ?? toPositive(record[key]);
    }
    return size(width, height);
  }
  return null;
}
