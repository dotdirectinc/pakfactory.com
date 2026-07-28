/**
 * Light vs dark watermark selection (PROD-2206).
 * Pure helpers — safe for client and Node (no DOM / Sharp).
 */

/**
 * Below this average footprint luminance → use light (white) watermark.
 * Dark mark only on near-white corners (soft watermarks; mid-tones like beige
 * prefer the light mark). Raised from 0.45 so product photography stays light.
 */
export const WATERMARK_LUMINANCE_THRESHOLD = 0.85;

/** Max edge for client/server sample canvases (never full-res). */
export const WATERMARK_SAMPLE_MAX_PX = 64;

export type WatermarkSrcPair = {
  lightSrc: string | null | undefined;
  darkSrc: string | null | undefined;
};

/**
 * Pick which logo URL to draw.
 * - Only one uploaded → that one.
 * - Both + unknown luminance → prefer **light** (white logo) when sample/API fails.
 * - Both + luminance → light unless footprint is near-white (≥ threshold).
 */
export function pickWatermarkSrc({
  lightSrc,
  darkSrc,
  luminance,
}: WatermarkSrcPair & {
  /** `null` = not sampled yet / failed. */
  luminance: number | null;
}): string | null {
  const light = lightSrc?.trim() || null;
  const dark = darkSrc?.trim() || null;
  if (light && !dark) return light;
  if (dark && !light) return dark;
  if (!light && !dark) return null;
  if (luminance == null) return light;
  return luminance < WATERMARK_LUMINANCE_THRESHOLD ? light : dark;
}

/** True when at least one watermark asset URL is available. */
export function hasWatermarkSrc(pair: WatermarkSrcPair): boolean {
  return Boolean(pair.lightSrc?.trim() || pair.darkSrc?.trim());
}

/** Average perceived luminance from raw RGBA bytes (0–1). */
export function averageLuminanceFromRgba(
  data: ArrayLike<number>,
): number | null {
  let sum = 0;
  let count = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a < 16) continue;
    sum +=
      (0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255;
    count += 1;
  }
  return count > 0 ? sum / count : null;
}
