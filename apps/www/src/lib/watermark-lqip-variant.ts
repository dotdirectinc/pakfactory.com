/**
 * Re-export Sharp-free LQIP variant picker for www page SSR (PROD-2206).
 * Do not import from watermark-compose here — that pulls native Sharp.
 */
export {
  resolveWatermarkVariantFromLqip,
  type WatermarkVariant,
} from "@pakfactory/components/commons/watermark-lqip-variant";
