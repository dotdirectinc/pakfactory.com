"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type SliderImage = {
  key: string;
  src: string;
  alt: string;
  caption?: string | null;
  isSquare: boolean;
};

export function GallerySlider({ images }: { images: SliderImage[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setProgress(max > 0 ? track.scrollLeft / max : 0);
  }

  const isSquare = images[0]?.isSquare ?? false;
  const aspectClass = isSquare ? "aspect-square" : "aspect-video";
  const imgHeight = isSquare ? 800 : 450;

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {images.map((img) => (
          <div
            key={img.key}
            className="w-[75%] flex-shrink-0"
            style={{ scrollSnapAlign: "start" }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={800}
              height={imgHeight}
              className={`${aspectClass} h-auto w-full rounded-lg object-cover`}
            />
            {(img.caption || img.alt) && (
              <p className="mt-2 text-sm text-muted-foreground">
                {img.caption ?? img.alt}
              </p>
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="mt-4 h-px w-full bg-border">
          <div
            className="h-full bg-foreground transition-[width] duration-100"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
