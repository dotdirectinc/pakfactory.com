export const LIST_THUMB_SIZE = 64;

/** Sanity CDN image URL with resize params for small list thumbnails. */
export function sizedCdnThumb(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const px = String(LIST_THUMB_SIZE * 2);
  try {
    const u = new URL(url);
    u.searchParams.set("w", px);
    u.searchParams.set("h", px);
    u.searchParams.set("fit", "crop");
    u.searchParams.set("auto", "format");
    return u.toString();
  } catch {
    return `${url}?w=${px}&h=${px}&fit=crop&auto=format`;
  }
}
