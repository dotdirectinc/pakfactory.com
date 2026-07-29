/**
 * Client-side corner luminance sample for adaptive watermarks (PROD-2206).
 * Prefers same-origin `/api/wm-luma` (no CORS). Canvas CDN sample is fallback.
 */

import { buildWatermarkLumaApiUrl } from "./watermark-api-url";
import { watermarkFootprintRect } from "./watermark-geometry";
import {
  WATERMARK_SAMPLE_MAX_PX,
  averageLuminanceFromRgba,
} from "./watermark-variant";

/** Build a small CDN sample URL when the host is Sanity. */
export function watermarkSampleUrl(photoSrc: string): string {
  try {
    const url = new URL(photoSrc);
    if (url.hostname === "cdn.sanity.io") {
      // Fetch enough pixels that the logo footprint still has detail after extract.
      url.searchParams.set("w", String(Math.max(256, WATERMARK_SAMPLE_MAX_PX * 4)));
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", "max");
      return url.toString();
    }
  } catch {
    /* keep original */
  }
  return photoSrc;
}

async function sampleCornerLuminanceViaApi(
  photoSrc: string,
  apiPath: string,
): Promise<number | null> {
  try {
    const res = await fetch(
      buildWatermarkLumaApiUrl({ apiPath, src: photoSrc }),
      { credentials: "same-origin" },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { luminance?: unknown };
    return typeof body.luminance === "number" && Number.isFinite(body.luminance)
      ? Math.min(1, Math.max(0, body.luminance))
      : null;
  } catch {
    return null;
  }
}

function sampleCornerLuminanceViaCanvas(
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
        const { left: sx, top: sy, width: sw, height: sh } =
          watermarkFootprintRect(w, h);

        const outW = Math.min(WATERMARK_SAMPLE_MAX_PX, Math.max(sw, 1));
        const outH = Math.min(
          WATERMARK_SAMPLE_MAX_PX,
          Math.max(1, Math.round((outW * sh) / sw)),
        );
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        const { data } = ctx.getImageData(0, 0, outW, outH);
        resolve(averageLuminanceFromRgba(data));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = sampleUrl;
  });
}

/**
 * Average luminance (0–1) of the pixels under the watermark footprint.
 * Returns `null` on failure (caller falls back — prefer light when both marks).
 */
export async function sampleCornerLuminance(
  photoSrc: string,
  options?: { apiPath?: string | null },
): Promise<number | null> {
  const apiPath = options?.apiPath?.trim();
  if (apiPath) {
    const viaApi = await sampleCornerLuminanceViaApi(photoSrc, apiPath);
    if (viaApi != null) return viaApi;
  }
  return sampleCornerLuminanceViaCanvas(photoSrc);
}
