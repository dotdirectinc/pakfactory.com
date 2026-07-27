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
};

function makeServeLoader(
  config: WatermarkConfig & { src: string },
  opts: { square?: boolean; cover?: boolean },
): ImageLoader {
  return ({ src, width, quality }) =>
    buildWatermarkApiUrl({
      apiPath: config.apiPath,
      src,
      width,
      quality: quality ?? 80,
      watermarkSrc: config.src,
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
 */
export function SanityImage({
  square,
  applyWatermark,
  fill,
  className,
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
      watermarkSrc={config.src}
      opacity={config.opacity}
      className={fill ? "absolute inset-0" : "relative inline-block max-w-full"}
    >
      {image}
    </ImageWatermarkOverlay>
  );
}
