/**
 * Sharp-free light/dark watermark pick from Sanity LQIP (PROD-2206).
 * Safe for page SSR — no native Sharp / libvips.
 */
import { decode as decodeJpeg } from "jpeg-js";
import { watermarkFootprintRect } from "./watermark-geometry";
import {
  WATERMARK_LUMINANCE_THRESHOLD,
  averageLuminanceFromRgba,
} from "./watermark-variant";

export type WatermarkVariant = "light" | "dark";

/**
 * Pick light vs dark watermark from Sanity's LQIP data-URI.
 * Missing / invalid LQIP → null → overlay falls back to the light mark.
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

    const { left, top, width: fw, height: fh } = watermarkFootprintRect(
      width,
      height,
    );

    // Extract footprint RGBA into a dense buffer for averageLuminanceFromRgba.
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

    const lum = averageLuminanceFromRgba(footprint);
    if (lum == null) return null;
    return lum < WATERMARK_LUMINANCE_THRESHOLD ? "light" : "dark";
  } catch {
    return null;
  }
}
