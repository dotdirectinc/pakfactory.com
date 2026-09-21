/**
 * Ticket midpoints were 10–15% width / 2–4% padding.
 * Padding bumped to 5% after review: rounded corners + object-cover were
 * clipping the mark at the bottom-right (PROD-2206).
 */
export const WATERMARK_WIDTH_PERCENT = 12;
export const WATERMARK_PADDING_PERCENT = 5;

/**
 * Studio light/dark watermark SVGs are ~244×64.
 * Used to size the luminance sample to the drawn logo footprint (not a corner square).
 */
export const WATERMARK_LOGO_ASPECT = 64 / 244;

/**
 * Hexagon mark is the left portion of the 244×64 Studio SVG (~x 0–54).
 * Luminance sampling uses this fraction of the overlay footprint (PROD-2244).
 */
export const WATERMARK_HEXAGON_WIDTH_FRACTION = 54 / 244;

export type WatermarkFootprintRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Pixel rect of the bottom-right logo overlay on an image of size `imageW`×`imageH`.
 * Matches CSS: width 12%, right/bottom padding 5%, height from logo aspect.
 */
export function watermarkFootprintRect(
  imageW: number,
  imageH: number,
): WatermarkFootprintRect {
  const w = Math.max(1, Math.round(imageW));
  const h = Math.max(1, Math.round(imageH));
  const wmW = Math.max(1, Math.round((w * WATERMARK_WIDTH_PERCENT) / 100));
  const pad = Math.max(0, Math.round((w * WATERMARK_PADDING_PERCENT) / 100));
  const wmH = Math.max(1, Math.round(wmW * WATERMARK_LOGO_ASPECT));
  const width = Math.min(wmW, w);
  const height = Math.min(wmH, h);
  const left = Math.max(0, w - pad - width);
  const top = Math.max(0, h - pad - height);
  return {
    left,
    top,
    width: Math.min(width, w - left),
    height: Math.min(height, h - top),
  };
}

/**
 * Pixel rect under the hexagonal logo mark (left fraction of the overlay footprint).
 * Overlay draw size/position is unchanged — only light/dark sampling uses this.
 */
export function watermarkHexagonSampleRect(
  imageW: number,
  imageH: number,
): WatermarkFootprintRect {
  const footprint = watermarkFootprintRect(imageW, imageH);
  const width = Math.max(
    1,
    Math.round(footprint.width * WATERMARK_HEXAGON_WIDTH_FRACTION),
  );
  return {
    left: footprint.left,
    top: footprint.top,
    width: Math.min(width, footprint.width),
    height: footprint.height,
  };
}
