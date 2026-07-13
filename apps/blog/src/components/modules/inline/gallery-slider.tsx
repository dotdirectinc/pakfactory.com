"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type SliderImage = {
  key: string;
  src: string;
  alt: string;
  isSquare: boolean;
};

/** Client-side peek-scroll gallery with free-drag and scroll-progress bar. */
export function GallerySlider({ images }: { images: SliderImage[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Mouse-drag state — no scroll-snap so the track stops exactly where released.
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setProgress(max > 0 ? track.scrollLeft / max : 0);
  }

  function onMouseDown(e: React.MouseEvent) {
    const track = trackRef.current;
    if (!track) return;
    isDragging.current = true;
    dragStartX.current = e.pageX - track.offsetLeft;
    dragStartScrollLeft.current = track.scrollLeft;
    track.style.cursor = "grabbing";
    track.style.userSelect = "none";
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const track = trackRef.current;
    if (!track) return;
    const x = e.pageX - track.offsetLeft;
    track.scrollLeft = dragStartScrollLeft.current - (x - dragStartX.current);
  }

  function onMouseUp() {
    const track = trackRef.current;
    if (!track) return;
    isDragging.current = false;
    track.style.cursor = "";
    track.style.userSelect = "";
  }

  const isSquare = images[0]?.isSquare ?? false;
  const aspectClass = isSquare ? "aspect-square" : "aspect-video";
  const imgHeight = isSquare ? 800 : 450;

  return (
    <div>
      {/* Scrollable slide track — no scroll-snap; drag stops exactly where released */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className="flex cursor-grab gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img) => (
          <div key={img.key} className="w-[75%] flex-shrink-0">
            <Image
              src={img.src}
              alt={img.alt}
              width={800}
              height={imgHeight}
              draggable={false}
              className={`${aspectClass} h-auto w-full rounded-lg object-cover`}
            />
            {img.alt ? (
              <p className="mt-2 select-none text-sm text-muted-foreground">
                {img.alt}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Scroll progress bar */}
      {images.length > 1 ? (
        <div className="mt-4 h-px w-full bg-border">
          <div
            className="h-full bg-foreground transition-[width] duration-100"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
