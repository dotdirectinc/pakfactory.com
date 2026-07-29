import { CAPTION_CLASS } from "@/lib/blog-caption";
import type { PostBodyGallery } from "@/lib/blog-post";
import { resolveImageAlt, sanityImageBaseUrl } from "@/lib/sanity-image";
import { resolveWatermarkVariantFromLqip } from "@/lib/watermark-lqip-variant";
import { GallerySlider, type SliderImage } from "@pakfactory/components/modules/gallery-slider";

type BodyGalleryProps = {
  value: PostBodyGallery;
  /** Article title used as tier-3 alt when CMS alts are blank. */
  titleFallback?: string;
};

/** Server wrapper — resolves Sanity CDN URLs + LQIP watermark variants, then hands off to the client slider. */
export async function BodyGallery({ value, titleFallback }: BodyGalleryProps) {
  const isSquare = value.aspectRatio === "1:1";
  const resolved: SliderImage[] = [];
  for (const [i, img] of (value.images ?? []).entries()) {
    const src = sanityImageBaseUrl(img.asset);
    if (!src) continue;
    const watermarkVariant = await resolveWatermarkVariantFromLqip(img.lqip);
    resolved.push({
      key: img._key ?? String(i),
      src,
      alt: resolveImageAlt(img, titleFallback),
      isSquare,
      applyWatermark: img.applyWatermark !== false,
      watermarkVariant,
    });
  }

  if (resolved.length === 0) return null;

  const caption = value.caption?.trim();

  return (
    <figure className="my-8">
      <GallerySlider images={resolved} />
      {caption ? (
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
