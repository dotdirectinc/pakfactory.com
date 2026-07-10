"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";
import { CAPTION_CLASS } from "@/lib/blog-caption";
import type { PostBodyGallery } from "@/lib/blog-post";
import { sanityImageUrl } from "@/lib/sanity-image";

type BodyGalleryProps = {
  value: PostBodyGallery;
};

/** Inline image gallery with prev/next arrow navigation and dot indicators. */
export function BodyGallery({ value }: BodyGalleryProps) {
  const images = (value.images ?? []).filter((img) =>
    Boolean(sanityImageUrl(img.asset, 1200)),
  );
  if (images.length === 0) return null;

  const caption = value.caption?.trim();
  const isSquare = value.aspectRatio === "1:1";
  const aspectClass = isSquare ? "aspect-square" : "aspect-video";
  const imgHeight = isSquare ? 800 : 450;

  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function scrollTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const item = track.children[index] as HTMLElement | undefined;
    if (!item) return;
    track.scrollTo({ left: item.offsetLeft, behavior: "smooth" });
    setActiveIndex(index);
  }

  const prev = () => scrollTo(Math.max(0, activeIndex - 1));
  const next = () => scrollTo(Math.min(images.length - 1, activeIndex + 1));

  return (
    <figure className="my-8">
      <div className="relative">
        {/* Scrollable slide track */}
        <div
          ref={trackRef}
          className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {images.map((img, i) => {
            const src = sanityImageUrl(img.asset, 1200);
            if (!src) return null;
            return (
              <div
                key={img._key ?? i}
                className="w-[80%] flex-shrink-0 sm:w-[75%]"
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

        {/* Prev / Next arrows */}
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={activeIndex === 0}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur-sm transition hover:bg-background disabled:opacity-30"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={activeIndex === images.length - 1}
              aria-label="Next image"
              className="absolute right-[22%] top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur-sm transition hover:bg-background disabled:opacity-30 sm:right-[27%]"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {/* Dot indicators */}
      {images.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Gallery images">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Image ${i + 1} of ${images.length}`}
              onClick={() => scrollTo(i)}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                i === activeIndex ? "bg-foreground" : "bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      ) : null}

      {caption ? (
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
