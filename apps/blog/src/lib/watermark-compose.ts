import sharp from "sharp";
import {
  WATERMARK_PADDING_PERCENT,
  WATERMARK_WIDTH_PERCENT,
} from "@pakfactory/components/commons/watermark-geometry";

export type CompositeWatermarkInput = {
  imageBuffer: Buffer;
  watermarkBuffer: Buffer;
  /** Target max width (fit inside / cover width). */
  width: number;
  quality: number;
  opacity: number;
  /** Centre-crop to square. */
  square?: boolean;
  /** Centre-crop to 16:9 (matches aspect-video + object-cover heroes). */
  cover16x9?: boolean;
};

export type CompositeWatermarkResult = {
  buffer: Buffer;
  contentType: "image/webp";
};

/**
 * Resize source, composite logo bottom-right (ticket geometry), emit WebP.
 * Server-only — do not import from client components.
 */
export async function compositeWatermark({
  imageBuffer,
  watermarkBuffer,
  width,
  quality,
  opacity,
  square = false,
  cover16x9 = false,
}: CompositeWatermarkInput): Promise<CompositeWatermarkResult> {
  const clampedOpacity = Math.min(1, Math.max(0, opacity));
  const targetW = Math.max(1, Math.round(width));
  const q = Math.min(100, Math.max(1, Math.round(quality)));

  let resizeOpts: {
    width: number;
    height?: number;
    fit: "cover" | "inside";
    position?: "centre";
    withoutEnlargement?: boolean;
  };
  if (square) {
    resizeOpts = {
      width: targetW,
      height: targetW,
      fit: "cover",
      position: "centre",
    };
  } else if (cover16x9) {
    const targetH = Math.max(1, Math.round((targetW * 9) / 16));
    resizeOpts = {
      width: targetW,
      height: targetH,
      fit: "cover",
      position: "centre",
    };
  } else {
    resizeOpts = {
      width: targetW,
      fit: "inside",
      withoutEnlargement: true,
    };
  }

  const resizedBuf = await sharp(imageBuffer, { failOn: "none" })
    .rotate()
    .resize(resizeOpts)
    .toBuffer();

  const { width: imgW = targetW, height: imgH = targetW } =
    await sharp(resizedBuf).metadata();

  const wmWidth = Math.max(1, Math.round((imgW * WATERMARK_WIDTH_PERCENT) / 100));
  const pad = Math.max(0, Math.round((imgW * WATERMARK_PADDING_PERCENT) / 100));

  const wmResized = await sharp(watermarkBuffer, { failOn: "none" })
    .resize({ width: wmWidth })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = wmResized;
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i]! * clampedOpacity);
  }

  const wmPng = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  const left = Math.max(0, imgW - info.width - pad);
  const top = Math.max(0, imgH - info.height - pad);

  const buffer = await sharp(resizedBuf)
    .composite([{ input: wmPng, left, top }])
    .webp({ quality: q })
    .toBuffer();

  return { buffer, contentType: "image/webp" };
}
