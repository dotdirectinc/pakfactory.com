import type {
  WatermarkConfig,
  WatermarkMode,
} from "@pakfactory/components/ui/watermark-context";

type WatermarkRow = {
  enabled?: boolean | null;
  imageUrl?: string | null;
  opacity?: number | null;
} | null | undefined;

function resolveWatermarkMode(): WatermarkMode {
  const raw = process.env.NEXT_PUBLIC_WATERMARK_MODE?.trim().toLowerCase();
  return raw === "serve" ? "serve" : "overlay";
}

/** Map Global Settings watermark projection → client provider value. */
export function toWatermarkConfig(
  watermark: WatermarkRow,
  apiPath: string,
): WatermarkConfig {
  const opacity =
    typeof watermark?.opacity === "number" && Number.isFinite(watermark.opacity)
      ? Math.min(1, Math.max(0, watermark.opacity))
      : 0.85;
  return {
    enabled: watermark?.enabled !== false,
    src: watermark?.imageUrl?.trim() || null,
    opacity,
    mode: resolveWatermarkMode(),
    apiPath,
  };
}
