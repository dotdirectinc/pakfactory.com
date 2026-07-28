/**
 * Client-safe URL builder for the bake-on-serve watermark API (PROD-2206).
 * Does not import Sharp — safe for loaders and client components.
 */

export type BuildWatermarkApiUrlParams = {
  /** Path to the API route, e.g. `/api/wm` or `/blog/api/wm`. */
  apiPath: string;
  /** Full-resolution Sanity CDN URL (loader will request resized bytes via this). */
  src: string;
  width: number;
  quality?: number;
  /** @deprecated Prefer watermarkLightSrc / watermarkDarkSrc. */
  watermarkSrc?: string;
  /** Light mark CDN URL (dark photo corners). */
  watermarkLightSrc?: string | null;
  /** Dark mark CDN URL (light photo corners). */
  watermarkDarkSrc?: string | null;
  opacity?: number;
  /** When true, ask the API to centre-crop square (`fit=crop`). */
  square?: boolean;
  /**
   * When true (typical for `fill` + `object-cover` heroes), centre-crop to 16:9
   * before compositing so the mark sits in the visible frame — not in pixels
   * that `object-cover` would crop away.
   */
  cover?: boolean;
};

/** Build `/api/wm?...` for a next/image srcset candidate. */
export function buildWatermarkApiUrl({
  apiPath,
  src,
  width,
  quality = 80,
  watermarkSrc,
  watermarkLightSrc,
  watermarkDarkSrc,
  opacity = 0.85,
  square = false,
  cover = false,
}: BuildWatermarkApiUrlParams): string {
  const params = new URLSearchParams();
  params.set("src", src);
  const light =
    watermarkLightSrc?.trim() || watermarkSrc?.trim() || "";
  const dark = watermarkDarkSrc?.trim() || "";
  if (light) params.set("wmLight", light);
  if (dark) params.set("wmDark", dark);
  // Legacy single-mark param for older callers / caches.
  if (light && !dark) params.set("wm", light);
  else if (dark && !light) params.set("wm", dark);
  params.set("w", String(Math.max(1, Math.round(width))));
  params.set("q", String(Math.min(100, Math.max(1, Math.round(quality)))));
  params.set("o", String(Math.min(1, Math.max(0, opacity))));
  if (square) params.set("square", "1");
  else if (cover) params.set("cover", "1");
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  return `${path}?${params.toString()}`;
}

/**
 * Derive the same-origin luminance probe path from the bake route
 * (`/api/wm` → `/api/wm-luma`, `/blog/api/wm` → `/blog/api/wm-luma`).
 */
export function watermarkLumaApiPath(apiPath: string): string {
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  if (path.endsWith("/wm")) return `${path}-luma`;
  return `${path.replace(/\/$/, "")}/wm-luma`;
}

/** Build `/api/wm-luma?src=` for client-side adaptive mark selection. */
export function buildWatermarkLumaApiUrl({
  apiPath,
  src,
}: {
  apiPath: string;
  src: string;
}): string {
  const params = new URLSearchParams();
  params.set("src", src);
  return `${watermarkLumaApiPath(apiPath)}?${params.toString()}`;
}
