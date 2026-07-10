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

  // Mouse-drag state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const hasDragged = useRef(false);

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
    hasDragged.current = false;
    dragStartX.current = e.pageX - track.offsetLeft;
    dragStartScrollLeft.current = track.scrollLeft;
    track.style.cursor = "grabbing";
    track.style.userSelect = "none";
    // Disable scroll-snap while dragging so it doesn't fight the drag
    track.style.scrollSnapType = "none";
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const track = trackRef.current;
    if (!track) return;
    const x = e.pageX - track.offsetLeft;
    const delta = x - dragStartX.current;
    if (Math.abs(delta) > 4) hasDragged.current = true;
    track.scrollLeft = dragStartScrollLeft.current - delta;
  }

  function onMouseUp() {
    const track = trackRef.current;
    if (!track) return;
    isDragging.current = false;
    track.style.cursor = "";
    track.style.userSelect = "";
    // Re-enable scroll-snap and snap to nearest slide
    track.style.scrollSnapType = "x mandatory";
  }

  function onMouseLeave() {
    if (isDragging.current) onMouseUp();
  }

  // Prevent click-through after a drag (e.g. on images wrapped in links)
  function onClickCapture(e: React.MouseEvent) {
    if (hasDragged.current) e.stopPropagation();
  }

  const isSquare = images[0]?.isSquare ?? false;
  const aspectClass = isSquare ? "aspect-square" : "aspect-video";
  const imgHeight = isSquare ? 800 : 450;

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClickCapture={onClickCapture}
        className="flex cursor-grab gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              draggable={false}
              className={`${aspectClass} h-auto w-full rounded-lg object-cover`}
            />
            {(img.caption || img.alt) && (
              <p className="mt-2 select-none text-sm text-muted-foreground">
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
