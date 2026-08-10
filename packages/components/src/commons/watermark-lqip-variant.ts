/**
 * Sharp-free light/dark watermark pick from Sanity LQIP (PROD-2206 / PROD-2244).
 * Safe for page SSR — no native Sharp / libvips.
 */
import { decode as decodeJpeg } from "jpeg-js";
import {
  WATERMARK_HEXAGON_WIDTH_FRACTION,
  watermarkHexagonSampleRect,
} from "./watermark-geometry";
import {
  WATERMARK_LUMINANCE_THRESHOLD,
  maxLuminanceFromRgba,
} from "./watermark-variant";

export type WatermarkVariant = "light" | "dark";

/** Hexagon sample pixel count below this → expand sample (LQIP is often ~20px wide). */
const MIN_SAMPLE_PIXELS = 24;
/** Expand to this fraction of each axis when the hexagon sample is too small. */
const TINY_LQIP_CORNER_FRACTION = 0.35;

function extractRectRgba(
  data: Uint8Array | Uint8ClampedArray,
  imageW: number,
  left: number,
  top: number,
  fw: number,
  fh: number,
): Uint8ClampedArray {
  const sample = new Uint8ClampedArray(fw * fh * 4);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const src = ((top + y) * imageW + (left + x)) * 4;
      const dst = (y * fw + x) * 4;
      sample[dst] = data[src] ?? 0;
      sample[dst + 1] = data[src + 1] ?? 0;
      sample[dst + 2] = data[src + 2] ?? 0;
      sample[dst + 3] = data[src + 3] ?? 255;
    }
  }
  return sample;
}

/**
 * Pick light vs dark watermark from Sanity's LQIP data-URI.
 * Missing / invalid LQIP → null → overlay falls back to the light mark.
 *
 * Uses **max** luminance under the **hexagon mark** (left fraction of the logo
 * footprint) vs `WATERMARK_LUMINANCE_THRESHOLD`. On tiny LQIPs the geometric
 * hexagon can be too few pixels — expand the bottom-right corner, then sample
 * the left hexagon fraction of that expanded region (PROD-2244).
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

    let { left, top, width: fw, height: fh } = watermarkHexagonSampleRect(
      width,
      height,
    );

    // Tiny LQIP: geometric hexagon is too few pixels for a meaningful max.
    // Expand the bottom-right corner, then keep the left hexagon fraction.
    if (fw * fh < MIN_SAMPLE_PIXELS || width < 48) {
      const cornerW = Math.max(
        fw,
        Math.ceil(width * TINY_LQIP_CORNER_FRACTION),
      );
      const cornerH = Math.max(
        fh,
        Math.ceil(height * TINY_LQIP_CORNER_FRACTION),
      );
      const cornerLeft = Math.max(0, width - cornerW);
      const cornerTop = Math.max(0, height - cornerH);
      const cornerFw = width - cornerLeft;
      const cornerFh = height - cornerTop;
      fw = Math.max(1, Math.round(cornerFw * WATERMARK_HEXAGON_WIDTH_FRACTION));
      fh = cornerFh;
      left = cornerLeft;
      top = cornerTop;
    }

    const sample = extractRectRgba(data, width, left, top, fw, fh);
    const lum = maxLuminanceFromRgba(sample);
    if (lum == null) return null;
    return lum < WATERMARK_LUMINANCE_THRESHOLD ? "light" : "dark";
  } catch {
    return null;
  }
}
