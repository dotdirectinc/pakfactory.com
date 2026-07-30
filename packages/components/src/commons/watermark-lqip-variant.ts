/**
 * Sharp-free light/dark watermark pick from Sanity LQIP (PROD-2206).
 * Safe for page SSR — no native Sharp / libvips.
 */
import { decode as decodeJpeg } from "jpeg-js";
import { watermarkFootprintRect } from "./watermark-geometry";
import {
  WATERMARK_LUMINANCE_THRESHOLD,
  maxLuminanceFromRgba,
} from "./watermark-variant";

export type WatermarkVariant = "light" | "dark";

/** Footprint pixel count below this → expand sample (LQIP is often ~20px wide). */
const MIN_FOOTPRINT_PIXELS = 24;
/** Expand to this fraction of each axis when the logo footprint is too small to sample. */
const TINY_LQIP_CORNER_FRACTION = 0.35;

/**
 * Pick light vs dark watermark from Sanity's LQIP data-URI.
 * Missing / invalid LQIP → null → overlay falls back to the light mark.
 *
 * Uses **max** footprint luminance vs `WATERMARK_LUMINANCE_THRESHOLD`. On tiny
 * LQIPs the geometric logo footprint can be 2×1 px — expand to the bottom-right
 * corner so max luma still reflects light-gray diagrams.
 */
export function resolveWatermarkVariantFromLqip(
  lqip: string | null | undefined,
): WatermarkVariant | null {
  if (!lqip || !lqip.startsWith("data:")) return null;
  const comma = lqip.indexOf(",");
  if (comma < 0) return null;

  try {
    const buf = Buffer.from(lqip.slice(comma + 1), "base64");
    const { data, width, height } = decodeJpeg(buf, { useTArray: true });
    if (!width || !height || !data?.length) return null;

    let { left, top, width: fw, height: fh } = watermarkFootprintRect(
      width,
      height,
    );

    // Tiny LQIP: geometric footprint is too few pixels for a meaningful max.
    if (fw * fh < MIN_FOOTPRINT_PIXELS || width < 48) {
      const cornerW = Math.max(fw, Math.ceil(width * TINY_LQIP_CORNER_FRACTION));
      const cornerH = Math.max(fh, Math.ceil(height * TINY_LQIP_CORNER_FRACTION));
      left = Math.max(0, width - cornerW);
      top = Math.max(0, height - cornerH);
      fw = width - left;
      fh = height - top;
    }

    // Extract sample RGBA into a dense buffer for maxLuminanceFromRgba.
    const footprint = new Uint8ClampedArray(fw * fh * 4);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const src = ((top + y) * width + (left + x)) * 4;
        const dst = (y * fw + x) * 4;
        footprint[dst] = data[src] ?? 0;
        footprint[dst + 1] = data[src + 1] ?? 0;
        footprint[dst + 2] = data[src + 2] ?? 0;
        footprint[dst + 3] = data[src + 3] ?? 255;
      }
    }

    const lum = maxLuminanceFromRgba(footprint);
    if (lum == null) return null;
    return lum < WATERMARK_LUMINANCE_THRESHOLD ? "light" : "dark";
  } catch {
    return null;
  }
}
