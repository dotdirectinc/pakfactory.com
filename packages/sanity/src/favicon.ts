/**
 * Favicon link descriptors from the Global Settings `favicon` field (PROD-2200).
 *
 * Shared by `apps/blog` and `apps/www`: both read the same `settings` singleton
 * through `BLOG_GLOBAL_SETTINGS_QUERY` and feed the result to Next's
 * `metadata.icons`. The return shape is structurally compatible with Next's
 * `Metadata['icons']` without this package depending on `next`.
 *
 * `favicon` is a Sanity **file** asset, not an image one: `.ico` is not a
 * supported image upload format, and it is the format most brand kits ship. File
 * assets are outside the image-transform pipeline, so the uploaded file is
 * emitted as-is at every size — the `type` hint is all that varies, and iOS gets
 * the same file as its touch icon when the upload is a PNG.
 */

/** `favicon` projection returned by `BLOG_GLOBAL_SETTINGS_QUERY`. */
export type FaviconAsset =
  | {
      url?: string | null;
      extension?: string | null;
      mimeType?: string | null;
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

/** iOS home-screen icon — Apple ignores SVG and `.ico` here, so PNG only. */
const APPLE_TOUCH_SIZE = 180;

const MIME_BY_EXTENSION: Record<string, string> = {
  ico: "image/x-icon",
  png: "image/png",
  svg: "image/svg+xml",
};

function resolveExtension(favicon: NonNullable<FaviconAsset>): string {
  const extension = favicon.extension?.trim().toLowerCase();
  if (extension) return extension;
  const mimeType = favicon.mimeType?.trim().toLowerCase();
  const matched = Object.entries(MIME_BY_EXTENSION).find(
    ([, mime]) => mime === mimeType,
  );
  // `image/vnd.microsoft.icon` is the other registered .ico type.
  if (!matched && mimeType?.includes("icon")) return "ico";
  return matched?.[0] ?? "";
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

  const extension = resolveExtension(favicon);
  const type = MIME_BY_EXTENSION[extension];

  if (extension === "svg") {
    // Legacy `.ico` first, SVG second: browsers that understand both prefer the
    // later, more specific declaration. No apple-touch-icon — iOS ignores SVG.
    return {
      icon: [
        { url: fallbackHref, sizes: "32x32" },
        { url, type },
      ],
    };
  }

  if (extension === "png") {
    return {
      icon: [{ url, type }],
      apple: [
        { url, type, sizes: `${APPLE_TOUCH_SIZE}x${APPLE_TOUCH_SIZE}` },
      ],
    };
  }

  // `.ico` (and anything else that slipped past schema validation): a multi-size
  // .ico is `sizes="any"`, and iOS will not take it as a touch icon.
  return { icon: [{ url, sizes: "any", ...(type ? { type } : {}) }] };
}
