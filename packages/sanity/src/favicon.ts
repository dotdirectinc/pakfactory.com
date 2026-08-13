/**
 * Favicon link descriptors from the Global Settings `favicon` field (PROD-2200).
 *
 * Shared by `apps/blog` and `apps/www`: both read the same `settings` singleton
 * through `BLOG_GLOBAL_SETTINGS_QUERY` and feed the result to Next's
 * `metadata.icons`. The return shape is structurally compatible with Next's
 * `Metadata['icons']` without this package depending on `next`.
 *
 * Two rules drive the output:
 *
 * 1. **SVG is served as-is.** The Sanity image pipeline only transforms JPEG,
 *    PNG, WebP, PJPG, TIFF, AVIF and GIF — an SVG asset cannot be resized or
 *    rasterised via URL params. So an SVG favicon emits one `type="image/svg+xml"`
 *    link (every modern browser scales it) plus the static `.ico` for legacy
 *    ones, and no `apple-touch-icon` (Apple does not render SVG there).
 * 2. **Raster sources are resized on the CDN** to the sizes browsers actually
 *    ask for, with `fit=fill` so a non-square upload is padded rather than
 *    cropped (transparent background on PNG output).
 */

/** `favicon` projection returned by `BLOG_GLOBAL_SETTINGS_QUERY`. */
export type FaviconAsset =
  | {
      url?: string | null;
      extension?: string | null;
      mimeType?: string | null;
      width?: number | null;
      height?: number | null;
    }
  | null
  | undefined;

export type IconDescriptor = {
  url: string;
  type?: string;
  sizes?: string;
};

export type FaviconIcons = {
  icon: IconDescriptor[];
  apple?: IconDescriptor[];
};

/** Tab / bookmark sizes. 192 is the Android home-screen icon. */
const RASTER_ICON_SIZES = [32, 192] as const;
/** iOS home-screen icon — Apple's documented size. */
const APPLE_TOUCH_SIZE = 180;

function isSvg(favicon: NonNullable<FaviconAsset>): boolean {
  return (
    favicon.extension?.trim().toLowerCase() === "svg" ||
    favicon.mimeType?.trim().toLowerCase() === "image/svg+xml"
  );
}

/** Square Sanity CDN variant: padded (never cropped), PNG so every browser can read it. */
function sanityIconUrl(url: string, size: number): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}w=${size}&h=${size}&fit=fill&fm=png`;
}

/**
 * Map the Global Settings favicon to `metadata.icons`.
 *
 * @param favicon      `settings.favicon` projection — null/blank falls back.
 * @param fallbackHref URL of the app's bundled default favicon. Blog must pass a
 *                     base-path-aware URL (`absoluteUrl('/favicon.ico')`);
 *                     `basePath` is not applied to metadata icon hrefs.
 */
export function buildFaviconIcons(
  favicon: FaviconAsset,
  fallbackHref: string,
): FaviconIcons {
  const url = favicon?.url?.trim();
  if (!favicon || !url) {
    return { icon: [{ url: fallbackHref, sizes: "any" }] };
  }

  if (isSvg(favicon)) {
    // Legacy `.ico` first, SVG second: browsers that understand both prefer the
    // later, more specific declaration.
    return {
      icon: [
        { url: fallbackHref, sizes: "32x32" },
        { url, type: "image/svg+xml" },
      ],
    };
  }

  return {
    icon: RASTER_ICON_SIZES.map((size) => ({
      url: sanityIconUrl(url, size),
      sizes: `${size}x${size}`,
      type: "image/png",
    })),
    apple: [
      {
        url: sanityIconUrl(url, APPLE_TOUCH_SIZE),
        sizes: `${APPLE_TOUCH_SIZE}x${APPLE_TOUCH_SIZE}`,
        type: "image/png",
      },
    ],
  };
}
