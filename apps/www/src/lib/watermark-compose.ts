import sharp from "sharp";
import {
  WATERMARK_PADDING_PERCENT,
  WATERMARK_WIDTH_PERCENT,
} from "@pakfactory/components/commons/watermark-geometry";
import {
  WATERMARK_LUMINANCE_THRESHOLD,
  pickWatermarkSrc,
} from "@pakfactory/components/commons/watermark-variant";
import { sampleCornerLuminanceFromBuffer } from "@/lib/watermark-luma-sample";

export { sampleCornerLuminanceFromBuffer } from "@/lib/watermark-luma-sample";

/**
 * Pick light vs dark watermark from Sanity's LQIP data-URI (PROD-2206).
 * Missing / invalid LQIP → null → overlay falls back to the light mark.
 */
export async function resolveWatermarkVariantFromLqip(
  lqip: string | null | undefined,
): Promise<"light" | "dark" | null> {
  if (!lqip || !lqip.startsWith("data:")) return null;
  const comma = lqip.indexOf(",");
  if (comma < 0) return null;
  const buf = Buffer.from(lqip.slice(comma + 1), "base64");
  const lum = await sampleCornerLuminanceFromBuffer(buf);
  if (lum == null) return null;
  return lum < WATERMARK_LUMINANCE_THRESHOLD ? "light" : "dark";
}

export type CompositeWatermarkInput = {
  imageBuffer: Buffer;
  /** Single mark (legacy) or light mark when both provided. */
  watermarkBuffer?: Buffer;
  watermarkLightBuffer?: Buffer;
  watermarkDarkBuffer?: Buffer;
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

async function resolveWatermarkBuffer(input: {
  resizedImageBuffer: Buffer;
  watermarkBuffer?: Buffer;
  watermarkLightBuffer?: Buffer;
  watermarkDarkBuffer?: Buffer;
}): Promise<Buffer | null> {
  const light =
    input.watermarkLightBuffer ?? input.watermarkBuffer ?? null;
  const dark = input.watermarkDarkBuffer ?? null;
  if (light && !dark) return light;
  if (dark && !light) return dark;
  if (!light && !dark) return null;
  const luminance = await sampleCornerLuminanceFromBuffer(
    input.resizedImageBuffer,
  );
  const choice = pickWatermarkSrc({
    lightSrc: "light",
    darkSrc: "dark",
    luminance,
  });
  return choice === "dark" ? dark : light;
}

/**
 * Resize source, composite logo bottom-right (ticket geometry), emit WebP.
 * Server-only — do not import from client components.
 * When light + dark marks are provided, picks by corner luminance on the resized frame.
 */
export async function compositeWatermark({
  imageBuffer,
  watermarkBuffer,
  watermarkLightBuffer,
  watermarkDarkBuffer,
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

  const chosen = await resolveWatermarkBuffer({
    resizedImageBuffer: resizedBuf,
    watermarkBuffer,
    watermarkLightBuffer,
    watermarkDarkBuffer,
  });
  if (!chosen) {
    throw new Error("No watermark buffer provided");
  }

  const { width: imgW = targetW, height: imgH = targetW } =
    await sharp(resizedBuf).metadata();

  const wmWidth = Math.max(1, Math.round((imgW * WATERMARK_WIDTH_PERCENT) / 100));
  const pad = Math.max(0, Math.round((imgW * WATERMARK_PADDING_PERCENT) / 100));

  const wmResized = await sharp(chosen, { failOn: "none" })
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
