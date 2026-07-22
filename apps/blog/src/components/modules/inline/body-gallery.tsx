import { CAPTION_CLASS } from "@/lib/blog-caption";
import type { PostBodyGallery } from "@/lib/blog-post";
import { resolveImageAlt, sanityImageBaseUrl } from "@/lib/sanity-image";
import { GallerySlider } from "@pakfactory/components/modules/gallery-slider";

type BodyGalleryProps = {
  value: PostBodyGallery;
  /** Article title used as tier-3 alt when CMS alts are blank. */
  titleFallback?: string;
};

type ResolvedImage = {
  key: string;
  src: string;
  alt: string;
  isSquare: boolean;
};

/** Server wrapper — resolves Sanity CDN URLs then hands off to the client slider. */
export function BodyGallery({ value, titleFallback }: BodyGalleryProps) {
  const isSquare = value.aspectRatio === "1:1";
  const resolved: ResolvedImage[] = (value.images ?? [])
    .map((img, i) => {
      const src = sanityImageBaseUrl(img.asset);
      if (!src) return null;
      return {
        key: img._key ?? String(i),
        src,
        alt: resolveImageAlt(img, titleFallback),
        isSquare,
      };
    })
    .filter((x): x is ResolvedImage => x !== null);

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
