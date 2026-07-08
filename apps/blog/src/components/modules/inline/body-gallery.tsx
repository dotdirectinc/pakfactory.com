import Image from "next/image";
import { CAPTION_CLASS } from "@/lib/blog-caption";
import type { PostBodyGallery } from "@/lib/blog-post";
import { sanityImageUrl } from "@/lib/sanity-image";

type BodyGalleryProps = {
  value: PostBodyGallery;
};

/** Horizontally scrollable image gallery. Shows ~1 full image + 20-30% peek at the next. */
export function BodyGallery({ value }: BodyGalleryProps) {
  const images = (value.images ?? []).filter((img) =>
    Boolean(sanityImageUrl(img.asset, 1200)),
  );
  if (images.length === 0) return null;

  const caption = value.caption?.trim();
  const isSquare = value.aspectRatio === "1:1";
  const aspectClass = isSquare ? "aspect-square" : "aspect-video";
  // 16:9 images: width 800, height 450; 1:1: width 800, height 800
  const imgHeight = isSquare ? 800 : 450;

  return (
    <figure className="my-8">
      <div
        className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {images.map((img, i) => {
          const src = sanityImageUrl(img.asset, 1200);
          if (!src) return null;
          return (
            <div
              key={img._key ?? i}
              className="w-[75%] flex-shrink-0"
              style={{ scrollSnapAlign: "start" }}
            >
              <Image
                src={src}
                alt={img.alt ?? ""}
                width={800}
                height={imgHeight}
                className={`${aspectClass} h-auto w-full rounded-lg object-cover`}
              />
            </div>
          );
        })}
      </div>
      {caption ? (
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
