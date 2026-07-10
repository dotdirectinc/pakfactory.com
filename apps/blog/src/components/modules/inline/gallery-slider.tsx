"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";

type SliderImage = {
  key: string;
  src: string;
  alt: string;
  isSquare: boolean;
};

/** Client-side carousel slider — receives pre-resolved image URLs from the server wrapper. */
export function GallerySlider({ images }: { images: SliderImage[] }) {
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

  const isSquare = images[0]?.isSquare ?? false;
  const aspectClass = isSquare ? "aspect-square" : "aspect-video";
  const imgHeight = isSquare ? 800 : 450;

  return (
    <div className="relative">
      {/* Scrollable slide track */}
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {images.map((img) => (
          <div
            key={img.key}
            className="w-[80%] flex-shrink-0 sm:w-[75%]"
            style={{ scrollSnapAlign: "start" }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={800}
              height={imgHeight}
              className={`${aspectClass} h-auto w-full rounded-lg object-cover`}
            />
          </div>
        ))}
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

      {/* Dot indicators */}
      {images.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Gallery images">
          {images.map((img, i) => (
            <button
              key={img.key}
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
    </div>
  );
}
