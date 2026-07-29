"use client";

import Image, { type ImageLoader, type ImageProps } from "next/image";
import { buildWatermarkApiUrl } from "@pakfactory/components/commons/watermark-api-url";
import { ImageWatermarkOverlay } from "@pakfactory/components/ui/image-watermark-overlay";
import {
  isServeWatermarkMode,
  shouldApplyWatermark,
  useWatermarkConfig,
  type WatermarkConfig,
} from "@pakfactory/components/ui/watermark-context";
import { sanityImageLoader } from "@/lib/sanity-image";

export type SanityImageProps = Omit<ImageProps, "loader"> & {
  /**
   * Opt-in watermark. Pass `true` for detail body/gallery images when Global Settings
   * watermark is enabled. Omit or pass `false` elsewhere (blocks, cards, author photos).
   */
  applyWatermark?: boolean;
};

function makeServeLoader(
  config: WatermarkConfig,
  opts: { cover?: boolean },
): ImageLoader {
  return ({ src, width, quality }) =>
    buildWatermarkApiUrl({
      apiPath: config.apiPath,
      src,
      width,
      quality: quality ?? 80,
      watermarkLightSrc: config.lightSrc,
      watermarkDarkSrc: config.darkSrc,
      opacity: config.opacity,
      cover: opts.cover,
    });
}

/**
 * `next/image` wrapper for Sanity CDN sources.
 *
 * Watermark modes (PROD-2206):
 * - `overlay` (default): CSS logo layer; Save as stays clean.
 * - `serve` (`NEXT_PUBLIC_WATERMARK_MODE=serve`): pixels baked via `/api/wm`.
 * Light vs dark mark is chosen from the photo corner luminance when both are set.
 */
export function SanityImage({
  applyWatermark,
  fill,
  className,
  src,
  ...props
}: SanityImageProps) {
  const config = useWatermarkConfig();
  const showWatermark = shouldApplyWatermark(config, applyWatermark);
  const serveMode = showWatermark && isServeWatermarkMode(config);
  // `fill` + object-cover heroes: bake into a 16:9 crop so the mark isn't
  // clipped by the container crop / rounded corners.
  const cover = Boolean(fill);
  const photoSrc = typeof src === "string" ? src : null;

  const image = (
    <Image
      {...props}
      src={src}
      fill={fill}
      className={className}
      loader={serveMode ? makeServeLoader(config, { cover }) : sanityImageLoader}
    />
  );

  if (!showWatermark || serveMode) return image;

  return (
    <ImageWatermarkOverlay
      photoSrc={photoSrc}
      lightSrc={config.lightSrc}
      darkSrc={config.darkSrc}
      apiPath={config.apiPath}
      opacity={config.opacity}
      className={fill ? "absolute inset-0" : "relative block w-full"}
    >
      {image}
    </ImageWatermarkOverlay>
  );
}
