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
import { sanityImageLoader, sanitySquareImageLoader } from "@/lib/sanity/image";

export type SanityImageProps = Omit<ImageProps, "loader"> & {
  /**
   * Request a square centre crop from Sanity (`fit=crop`, `h=w`). Use for
   * `aspect-square` containers so a landscape source isn't upscaled to fill
   * the square (which looks blurry with the default `fit=max` loader).
   */
  square?: boolean;
  /**
   * Opt-in watermark. Pass `true` for detail body/gallery images when Global Settings
   * watermark is enabled. Omit or pass `false` elsewhere (blocks, cards, products).
   */
  applyWatermark?: boolean;
  /**
   * Server-resolved light/dark mark from Sanity LQIP (PROD-2206).
   * Client only forwards — never samples luminance here.
   */
  watermarkVariant?: "light" | "dark" | null;
};

function makeServeLoader(
  config: WatermarkConfig,
  opts: { square?: boolean; cover?: boolean },
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
      square: opts.square,
      cover: opts.cover,
    });
}

/**
 * `next/image` wrapper for Sanity CDN sources.
 *
 * Watermark modes (PROD-2206):
 * - `overlay` (default): CSS logo layer; Save as stays clean.
 * - `serve` (`NEXT_PUBLIC_WATERMARK_MODE=serve`): pixels baked via `/api/wm`.
 * Overlay light/dark is resolved server-side from LQIP and passed as `watermarkVariant`.
 */
export function SanityImage({
  square,
  applyWatermark,
  watermarkVariant = null,
  fill,
  className,
  src,
  ...props
}: SanityImageProps) {
  const config = useWatermarkConfig();
  const showWatermark = shouldApplyWatermark(config, applyWatermark);
  const serveMode = showWatermark && isServeWatermarkMode(config);
  const cover = Boolean(fill) && !square;

  const defaultLoader = square ? sanitySquareImageLoader : sanityImageLoader;

  const image = (
    <Image
      {...props}
      src={src}
      fill={fill}
      className={className}
      loader={
        serveMode
          ? makeServeLoader(config, { square: Boolean(square), cover })
          : defaultLoader
      }
    />
  );

  if (!showWatermark || serveMode) return image;

  return (
    <ImageWatermarkOverlay
      lightSrc={config.lightSrc}
      darkSrc={config.darkSrc}
      variant={watermarkVariant}
      opacity={config.opacity}
      className={fill ? "absolute inset-0" : "relative block w-full"}
    >
      {image}
    </ImageWatermarkOverlay>
  );
}
