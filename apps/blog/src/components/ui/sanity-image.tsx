"use client";

import Image, { type ImageProps } from "next/image";
import { sanityImageLoader } from "@/lib/sanity-image";

export type SanityImageProps = Omit<ImageProps, "loader">;

/**
 * `next/image` wrapper for Sanity CDN sources. Uses {@link sanityImageLoader}
 * so each srcset width is requested from Sanity (full detail, no Next upscale).
 * Pass a base URL from {@link sanityImageBaseUrl} as `src`.
 *
 * Client component: custom loaders are functions and cannot be passed from
 * Server Components into `next/image`.
 */
export function SanityImage(props: SanityImageProps) {
  return <Image {...props} loader={sanityImageLoader} />;
}
