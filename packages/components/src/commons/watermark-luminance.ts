/**
 * Client-only corner luminance sample for adaptive watermarks (PROD-2206).
 * Uses a tiny Sanity CDN proxy — never a full-resolution bitmap.
 */

import {
  WATERMARK_PADDING_PERCENT,
  WATERMARK_WIDTH_PERCENT,
} from "./watermark-geometry";
import {
  WATERMARK_SAMPLE_MAX_PX,
  averageLuminanceFromRgba,
} from "./watermark-variant";

/** Build a small CDN sample URL when the host is Sanity. */
export function watermarkSampleUrl(photoSrc: string): string {
  try {
    const url = new URL(photoSrc);
    if (url.hostname === "cdn.sanity.io") {
      url.searchParams.set("w", String(WATERMARK_SAMPLE_MAX_PX));
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", "max");
      return url.toString();
    }
  } catch {
    /* keep original */
  }
  return photoSrc;
}

/**
 * Average luminance (0–1) of the bottom-right watermark footprint.
 * Returns `null` on CORS / decode failure (caller should fall back).
 */
export function sampleCornerLuminance(
  photoSrc: string,
): Promise<number | null> {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return Promise.resolve(null);
  }

  const sampleUrl = watermarkSampleUrl(photoSrc);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        const regionW = Math.max(
          1,
          Math.round((w * WATERMARK_WIDTH_PERCENT) / 100),
        );
        const pad = Math.max(
          0,
          Math.round((w * WATERMARK_PADDING_PERCENT) / 100),
        );
        const box = Math.max(regionW + pad, 1);
        const sx = Math.max(0, w - box);
        const sy = Math.max(0, h - box);
        const sw = Math.min(box, w - sx);
        const sh = Math.min(box, h - sy);

        const out = Math.min(WATERMARK_SAMPLE_MAX_PX, Math.max(sw, sh, 1));
        const canvas = document.createElement("canvas");
        canvas.width = out;
        canvas.height = out;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out, out);
        const { data } = ctx.getImageData(0, 0, out, out);
        resolve(averageLuminanceFromRgba(data));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = sampleUrl;
  });
}
