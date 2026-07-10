"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [modalIndex, setModalIndex] = useState<number | null>(null);

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
  }

  function onMouseLeave() {
    if (isDragging.current) onMouseUp();
  }

  // Suppress click after drag so images don't open the modal on drag-release
  function onClickCapture(e: React.MouseEvent) {
    if (hasDragged.current) e.stopPropagation();
  }

  // Lightbox keyboard nav
  useEffect(() => {
    if (modalIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalIndex(null);
      if (e.key === "ArrowRight")
        setModalIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i));
      if (e.key === "ArrowLeft")
        setModalIndex((i) => (i !== null && i > 0 ? i - 1 : i));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalIndex, images.length]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = modalIndex !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalIndex]);

  const modalImg = modalIndex !== null ? images[modalIndex] : undefined;
  const isSquare = images[0]?.isSquare ?? false;
  const aspectClass = isSquare ? "aspect-square" : "aspect-video";
  const imgHeight = isSquare ? 800 : 450;

  return (
    <>
      {/* Slider track — no scroll-snap so drag stops exactly where released */}
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
        >
          {images.map((img, idx) => (
            <div
              key={img.key}
              className="w-[75%] flex-shrink-0"
              onClick={() => setModalIndex(idx)}
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={800}
                height={imgHeight}
                draggable={false}
                className={`${aspectClass} h-auto w-full cursor-pointer rounded-lg object-cover transition-opacity hover:opacity-90`}
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

      {/* Lightbox modal */}
      {modalIndex !== null && modalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setModalIndex(null)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Prev */}
          {modalIndex > 0 && (
            <button
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); setModalIndex(modalIndex - 1); }}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image */}
          <div
            className="flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={modalImg.src}
              alt={modalImg.alt}
              width={1400}
              height={900}
              className="max-h-[82vh] w-auto max-w-full rounded-lg object-contain"
            />
            {(modalImg.caption || modalImg.alt) && (
              <p className="text-center text-sm text-white/70">
                {modalImg.caption ?? modalImg.alt}
              </p>
            )}
            {images.length > 1 && (
              <p className="text-xs text-white/40">
                {modalIndex + 1} / {images.length}
              </p>
            )}
          </div>

          {/* Next */}
          {modalIndex < images.length - 1 && (
            <button
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); setModalIndex(modalIndex + 1); }}
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
