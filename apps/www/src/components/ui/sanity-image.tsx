"use client";

import Image, { type ImageProps } from "next/image";
import { sanityImageLoader, sanitySquareImageLoader } from "@/lib/sanity/image";

export type SanityImageProps = Omit<ImageProps, "loader"> & {
  /**
   * Request a square centre crop from Sanity (`fit=crop`, `h=w`). Use for
   * `aspect-square` containers so a landscape source isn't upscaled to fill
   * the square (which looks blurry with the default `fit=max` loader).
   */
  square?: boolean;
};

/**
 * `next/image` wrapper for Sanity CDN sources. Uses {@link sanityImageLoader}
 * so each srcset width is requested from Sanity (full detail, no Next upscale).
 * Pass a base CDN URL (no baked-in `w`) as `src`. Set `square` for square crops.
 *
 * Client component: custom loaders are functions and cannot be passed from
 * Server Components into `next/image`.
 */
export function SanityImage({ square, ...props }: SanityImageProps) {
  return (
    <Image
      {...props}
      loader={square ? sanitySquareImageLoader : sanityImageLoader}
    />
  );
}
