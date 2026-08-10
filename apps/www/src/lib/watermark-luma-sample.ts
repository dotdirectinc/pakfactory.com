import { watermarkHexagonSampleRect } from "@pakfactory/components/commons/watermark-geometry";
import {
  WATERMARK_SAMPLE_MAX_PX,
  maxLuminanceFromRgba,
} from "@pakfactory/components/commons/watermark-variant";

/**
 * Max luminance (0–1) under the hexagonal logo mark (PROD-2244).
 * Lazy-loads Sharp so a native-binding failure becomes a caught null / 502
 * instead of crashing the route module on import (PROD-2206 Vercel 500s).
 */
export async function sampleCornerLuminanceFromBuffer(
  imageBuffer: Buffer,
): Promise<number | null> {
  try {
    const { default: sharp } = await import("sharp");
    const meta = await sharp(imageBuffer, { failOn: "none" }).metadata();
    const w = meta.width ?? 1;
    const h = meta.height ?? 1;
    const { left, top, width: extractW, height: extractH } =
      watermarkHexagonSampleRect(w, h);

    const outW = Math.min(WATERMARK_SAMPLE_MAX_PX, Math.max(extractW, 1));
    const outH = Math.min(
      WATERMARK_SAMPLE_MAX_PX,
      Math.max(1, Math.round((outW * extractH) / extractW)),
    );

    const { data } = await sharp(imageBuffer, { failOn: "none" })
      .extract({ left, top, width: extractW, height: extractH })
      .resize({
        width: outW,
        height: outH,
        fit: "fill",
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return maxLuminanceFromRgba(data);
  } catch (err) {
    console.error("[watermark-luma-sample] Sharp sample failed", err);
    return null;
  }
}
