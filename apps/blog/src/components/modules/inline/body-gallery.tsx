import Image from "next/image";
import type { PostBodyGallery } from "@/lib/blog-post";
import { sanityImageUrl } from "@/lib/sanity-image";

type BodyGalleryProps = {
  value: PostBodyGallery;
};

/** Inline two-up image gallery authored in the post body portable text. */
export function BodyGallery({ value }: BodyGalleryProps) {
  const images = (value.images ?? []).filter((img) =>
    Boolean(sanityImageUrl(img.asset, 800)),
  );
  if (images.length === 0) return null;

  const caption = value.caption?.trim();

  return (
    <figure className="my-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {images.map((img, i) => {
          const src = sanityImageUrl(img.asset, 800);
          if (!src) return null;
          return (
            <Image
              key={img._key ?? i}
              src={src}
              alt={img.alt ?? ""}
              width={800}
              height={800}
              className="aspect-square h-auto w-full rounded-lg object-cover"
            />
          );
        })}
      </div>
      {caption ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
