'use client';

import {useEffect, useRef, useState} from 'react';
import {Maximize2Icon, PackageIcon, XIcon} from 'lucide-react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';
import {MediaSettleZoom} from '@/components/ui/media-settle-zoom';
import {SanityImage} from '@/components/ui/sanity-image';
import type {CatalogMedia} from '@/lib/catalog/types';
import {
    sanityImageLoader,
    sanitySquareImageLoader,
} from '@/lib/sanity/image';
import {useSanityImageSettle} from '@/lib/sanity/use-sanity-image-settle';
import {
    MEDIA_DISSOLVE_MS,
    mediaDissolveTransitionClass,
} from '@/lib/ui/media-dissolve';

type ProductGalleryProps = {
    media: CatalogMedia[];
    productTitle: string;
    /** Playable MP4/MOV for feature (index 0); YouTube / missing → still only. */
    featuredVideoUrl?: string | null;
    /**
     * Feature-well `sizes` for Next/Sanity CDN. PDP defaults under-report for
     * speed; customization detail passes a larger slot so the hero is sharp.
     */
    wellSizes?: string;
    /** Idle prefetch width matching {@link wellSizes} × ~2 DPR (clamped by loader). */
    wellPrefetchWidth?: number;
};

/**
 * Feature well (PDP default): under-report so 2× DPR lands near ~720–800, not
 * full-viewport 1080–1920 (PROD-3102).
 */
const GALLERY_WELL_SIZES = '(max-width: 1024px) 50vw, 360px';

/** Prefetch width ≈ 360 CSS × 2 DPR / common Next bucket for {@link GALLERY_WELL_SIZES}. */
const GALLERY_WELL_PREFETCH_WIDTH = 750;

/**
 * Customization detail hero: ~3/5 of content column ≈ 720–800 CSS; 2× DPR →
 * near CDN max so the square well is not soft/pixelated.
 */
export const CUSTOMIZATION_GALLERY_WELL_SIZES =
    '(max-width: 1024px) 92vw, 800px';
export const CUSTOMIZATION_GALLERY_WELL_PREFETCH_WIDTH = 1600;

/** Near-viewport lightbox stage — full asset, no square crop. */
const GALLERY_LIGHTBOX_SIZES = '(max-width: 640px) 96vw, min(96vw, 56rem)';

/**
 * Prefetch / loader width for lightbox (`fit=max`). Below the global CDN cap
 * so enlarge requests `w=1200` instead of the 1600 clamp (PROD-3135).
 */
const GALLERY_LIGHTBOX_PREFETCH_WIDTH = 1200;

/** Main well crop quality — PDP + customization share this gallery. */
const GALLERY_WELL_QUALITY = 85;

/** Lightbox quality — matches warmed prefetch URL (PROD-3135). */
const GALLERY_LIGHTBOX_QUALITY = 90;

const LIGHTBOX_CLOSE_CLASS =
    'absolute top-4 right-4 z-30 inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/80 text-foreground shadow-sm transition-opacity hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReduced(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return reduced;
}

/** Below `sm` (640px) — no hover video on narrow viewports. */
function useIsMobileViewport(): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 639px)');
        const sync = () => setIsMobile(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return isMobile;
}

function GalleryRailThumb({
    src,
    kind,
    lqip,
}: {
    src: string;
    kind?: CatalogMedia['kind'];
    lqip?: string;
}) {
    const {onLoad, onError, imageClassName} = useSanityImageSettle(src);

    return (
        <MediaSettleZoom
            mediaKind={kind === 'lifestyle' ? 'lifestyle' : 'product'}
        >
            <SanityImage
                src={src}
                alt=""
                square
                fill
                sizes="64px"
                className={cn('object-fill', imageClassName)}
                onLoad={onLoad}
                onError={onError}
                {...(lqip
                    ? {placeholder: 'blur' as const, blurDataURL: lqip}
                    : {})}
            />
        </MediaSettleZoom>
    );
}

function GalleryWellSlideImage({
    src,
    alt,
    priority,
    lqip,
    sizes,
    onReady,
}: {
    src: string;
    alt: string;
    priority: boolean;
    lqip?: string;
    sizes: string;
    onReady: () => void;
}) {
    const {onLoad, onError, imageClassName} = useSanityImageSettle(src, {
        onReady,
    });

    return (
        <SanityImage
            src={src}
            alt={alt}
            square
            fill
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            sizes={sizes}
            quality={GALLERY_WELL_QUALITY}
            className={cn('object-fill', imageClassName)}
            onLoad={onLoad}
            onError={onError}
            {...(lqip
                ? {placeholder: 'blur' as const, blurDataURL: lqip}
                : {})}
        />
    );
}

function GalleryLightboxImage({
    src,
    alt,
    lqip,
}: {
    src: string;
    alt: string;
    lqip?: string;
}) {
    const {onLoad, onError, imageClassName} = useSanityImageSettle(src);

    return (
        <SanityImage
            src={src}
            alt={alt}
            applyWatermark
            fill
            sizes={GALLERY_LIGHTBOX_SIZES}
            quality={GALLERY_LIGHTBOX_QUALITY}
            maxLoaderWidth={GALLERY_LIGHTBOX_PREFETCH_WIDTH}
            className={cn('object-contain', imageClassName)}
            onLoad={onLoad}
            onError={onError}
            {...(lqip
                ? {placeholder: 'blur' as const, blurDataURL: lqip}
                : {})}
        />
    );
}

export function ProductGallery({
    media,
    productTitle,
    featuredVideoUrl,
    wellSizes = GALLERY_WELL_SIZES,
    wellPrefetchWidth = GALLERY_WELL_PREFETCH_WIDTH,
}: ProductGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [visibleIndex, setVisibleIndex] = useState(0);
    const [underIndex, setUnderIndex] = useState(0);
    /** Panel enter fade — false until rAF so switches dissolve, not hard-swap. */
    const [topRevealed, setTopRevealed] = useState(true);
    /** Slide 0 decoded — unlock idle prefetch of other well crops (PROD-3102). */
    const [heroReady, setHeroReady] = useState(false);
    const [enlargeOpen, setEnlargeOpen] = useState(false);
    const [playing, setPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const wellRef = useRef<HTMLDivElement>(null);
    const loadedRef = useRef<Set<number>>(new Set());
    /** Lightbox `fit=max` URLs already warmed via View larger intent. */
    const lightboxPrefetchedRef = useRef(new Set<string>());
    const activeIndexRef = useRef(0);
    const visibleIndexRef = useRef(0);
    const prefersReducedMotion = usePrefersReducedMotion();
    const isMobile = useIsMobileViewport();
    const wellPrefetchWidthRef = useRef(wellPrefetchWidth);
    wellPrefetchWidthRef.current = wellPrefetchWidth;

    const items = media.length > 0 ? media : [{alt: productTitle}];
    const active = items[activeIndex] ?? items[0];
    const showRail = items.length > 1;

    activeIndexRef.current = activeIndex;
    visibleIndexRef.current = visibleIndex;

    const prefetchLightbox = (src: string | undefined) => {
        if (!src || lightboxPrefetchedRef.current.has(src)) return;
        lightboxPrefetchedRef.current.add(src);
        const url = sanityImageLoader({
            src,
            width: GALLERY_LIGHTBOX_PREFETCH_WIDTH,
            quality: GALLERY_LIGHTBOX_QUALITY,
        });
        const img = new window.Image();
        img.src = url;
    };

    const videoUrl = featuredVideoUrl?.trim() || '';
    const allowVideoPlay =
        Boolean(videoUrl) && !prefersReducedMotion && !isMobile;
    const showVideo =
        allowVideoPlay && activeIndex === 0 && Boolean(active?.src);

    const commitVisible = (index: number) => {
        const prev = visibleIndexRef.current;
        if (prev === index) return;
        visibleIndexRef.current = index;
        setUnderIndex(prev);
        setVisibleIndex(index);
        if (prefersReducedMotion) {
            setTopRevealed(true);
        } else {
            setTopRevealed(false);
        }
    };

    const markReady = (index: number) => {
        loadedRef.current.add(index);
        if (index === 0) setHeroReady(true);
        if (activeIndexRef.current === index) {
            commitVisible(index);
        }
    };

    const selectSlide = (index: number) => {
        setActiveIndex(index);
        const item = items[index];
        if (
            !item?.src ||
            loadedRef.current.has(index) ||
            index === visibleIndexRef.current
        ) {
            commitVisible(index);
        }
    };

    useEffect(() => {
        if (!enlargeOpen) return;
        prefetchLightbox(active?.src);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- warm active on open
    }, [enlargeOpen, active?.src]);

    useEffect(() => {
        items.forEach((item, index) => {
            if (!item.src) {
                loadedRef.current.add(index);
                if (index === 0) setHeroReady(true);
            }
        });
        const well = wellRef.current;
        if (!well) return;
        // Cached / already-decoded slides may not re-fire `onLoad` after hydrate.
        well
            .querySelectorAll<HTMLImageElement>('[data-gallery-slide] img')
            .forEach((img) => {
                const raw = img
                    .closest('[data-gallery-slide]')
                    ?.getAttribute('data-gallery-slide');
                const index = raw == null ? Number.NaN : Number(raw);
                if (
                    Number.isFinite(index) &&
                    img.complete &&
                    img.naturalWidth > 0
                ) {
                    markReady(index);
                }
            });
    }, [items]);

    useEffect(() => {
        if (underIndex === visibleIndex) return;
        if (prefersReducedMotion) {
            setUnderIndex(visibleIndex);
            return;
        }
        const timer = window.setTimeout(() => {
            setUnderIndex(visibleIndex);
        }, MEDIA_DISSOLVE_MS);
        return () => window.clearTimeout(timer);
    }, [visibleIndex, underIndex, prefersReducedMotion]);

    // Paint top at opacity-0, then reveal so CSS dissolve runs on every switch.
    useEffect(() => {
        if (topRevealed) return;
        let inner = 0;
        const outer = window.requestAnimationFrame(() => {
            inner = window.requestAnimationFrame(() => {
                setTopRevealed(true);
            });
        });
        return () => {
            window.cancelAnimationFrame(outer);
            window.cancelAnimationFrame(inner);
        };
    }, [visibleIndex, topRevealed]);

    // After LCP hero is ready, warm other well crops so first thumb click dissolves.
    useEffect(() => {
        if (!heroReady || items.length <= 1) return;

        let cancelled = false;
        const prefetches: HTMLImageElement[] = [];

        const run = () => {
            if (cancelled) return;
            items.forEach((item, index) => {
                if (index === 0 || !item.src || loadedRef.current.has(index)) {
                    return;
                }
                const url = sanitySquareImageLoader({
                    src: item.src,
                    width: wellPrefetchWidthRef.current,
                    quality: GALLERY_WELL_QUALITY,
                });
                const img = new window.Image();
                prefetches.push(img);
                const done = () => {
                    if (cancelled) return;
                    loadedRef.current.add(index);
                };
                img.onload = done;
                img.onerror = done;
                img.src = url;
            });
        };

        let idleId: number | undefined;
        let timeoutId: number | undefined;
        if (typeof window.requestIdleCallback === 'function') {
            idleId = window.requestIdleCallback(run);
        } else {
            timeoutId = window.setTimeout(run, 1);
        }

        return () => {
            cancelled = true;
            if (
                idleId != null &&
                typeof window.cancelIdleCallback === 'function'
            ) {
                window.cancelIdleCallback(idleId);
            }
            if (timeoutId != null) window.clearTimeout(timeoutId);
            for (const img of prefetches) {
                img.onload = null;
                img.onerror = null;
                img.src = '';
            }
        };
    }, [heroReady, items]);

    useEffect(() => {
        if (showVideo) return;
        const el = videoRef.current;
        if (!el) return;
        el.pause();
        el.currentTime = 0;
        setPlaying(false);
    }, [showVideo, activeIndex]);

    const startVideo = () => {
        if (!showVideo) return;
        const el = videoRef.current;
        if (!el) return;
        void el.play().then(
            () => setPlaying(true),
            () => setPlaying(false),
        );
    };

    const stopVideo = () => {
        const el = videoRef.current;
        if (!el) return;
        el.pause();
        el.currentTime = 0;
        setPlaying(false);
    };

    return (
        <div className="flex items-start gap-6 self-start lg:sticky lg:top-8">
            {showRail ? (
                <div className="relative w-16 shrink-0">
                    <div className="flex flex-col gap-4">
                        {items.map((item, index) => {
                            const selected = index === activeIndex;
                            return (
                                <button
                                    key={`${item.alt}-${index}`}
                                    type="button"
                                    aria-label={`Show image ${index + 1}`}
                                    aria-pressed={selected}
                                    onClick={() => selectSlide(index)}
                                    className={cn(
                                        'group relative aspect-square w-full shrink-0 cursor-pointer overflow-hidden rounded-sm bg-product-image-bg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                                        !selected &&
                                            'opacity-30 hover:opacity-100',
                                    )}
                                >
                                    {item.src ? (
                                        <GalleryRailThumb
                                            src={item.src}
                                            kind={item.kind}
                                            lqip={item.lqip}
                                        />
                                    ) : (
                                        <span className="flex h-full items-center justify-center">
                                            <PackageIcon
                                                className="size-5 text-muted-foreground opacity-40"
                                                aria-hidden
                                            />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
            <div
                ref={wellRef}
                className={cn(
                    'relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl bg-product-image-bg',
                    showVideo && 'cursor-pointer',
                )}
                onPointerEnter={showVideo ? startVideo : undefined}
                onPointerLeave={showVideo ? stopVideo : undefined}
            >
                {items.map((item, index) => {
                    const isTop = index === visibleIndex;
                    const isUnder =
                        index === underIndex && index !== visibleIndex;
                    // Mount the active slide even before commit so it can load
                    // (gate waits on markReady — do not eager-load the whole set).
                    const isActivePending =
                        index === activeIndex && index !== visibleIndex;
                    const showSlide = isTop || isUnder || isActivePending;
                    if (!showSlide) return null;

                    const panelOpacity = isUnder
                        ? 'opacity-100'
                        : isTop
                          ? topRevealed
                              ? 'opacity-100'
                              : 'opacity-0'
                          : 'opacity-0';

                    return (
                        <div
                            key={`${item.alt}-${index}`}
                            data-gallery-slide={index}
                            aria-hidden={!isTop}
                            className={cn(
                                // Opaque muted panel so transparent PNGs dissolve
                                // against chrome, not the under-slide product (PROD-3102).
                                'absolute inset-0 bg-product-image-bg',
                                isTop ? 'z-10' : 'z-0',
                                mediaDissolveTransitionClass,
                                panelOpacity,
                                !isTop && 'pointer-events-none',
                            )}
                        >
                            {item.src ? (
                                <GalleryWellSlideImage
                                    src={item.src}
                                    alt={isTop ? item.alt : ''}
                                    priority={index === 0}
                                    lqip={item.lqip}
                                    sizes={wellSizes}
                                    onReady={() => markReady(index)}
                                />
                            ) : (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <PackageIcon
                                        className="size-32 text-muted-foreground opacity-40"
                                        aria-hidden
                                    />
                                </span>
                            )}
                        </div>
                    );
                })}
                {showVideo ? (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        muted
                        loop
                        playsInline
                        preload="none"
                        aria-hidden
                        className={cn(
                            'absolute inset-0 z-20 size-full object-fill',
                            mediaDissolveTransitionClass,
                            playing
                                ? 'opacity-100'
                                : 'pointer-events-none opacity-0',
                        )}
                    />
                ) : null}
                {showVideo ? (
                    <p
                        aria-hidden
                        className={cn(
                            'pointer-events-none absolute bottom-4 right-4 z-20 hidden max-w-[11rem] rounded-sm bg-black/30 px-2 py-1 text-right text-xs font-medium leading-snug tracking-wide text-white sm:block',
                            mediaDissolveTransitionClass,
                            playing ? 'opacity-0' : 'opacity-100',
                        )}
                    >
                        Hover to see the effects
                    </p>
                ) : null}
                {active?.src ? (
                    <button
                        type="button"
                        aria-label="View larger"
                        className={cn(
                            'group absolute top-4 right-4 z-30 inline-flex h-10 cursor-pointer items-center overflow-hidden bg-white/80 text-sm font-medium text-foreground',
                            'rounded-xl hover:rounded-full focus-visible:rounded-full',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            !prefersReducedMotion &&
                                'transition-[border-radius] duration-200 ease-out',
                        )}
                        onPointerDown={(event) => event.stopPropagation()}
                        onPointerEnter={() => prefetchLightbox(active.src)}
                        onFocus={() => prefetchLightbox(active.src)}
                        onClick={(event) => {
                            event.stopPropagation();
                            prefetchLightbox(active.src);
                            setEnlargeOpen(true);
                        }}
                    >
                        <span
                            className={cn(
                                'overflow-hidden whitespace-nowrap',
                                'max-w-0 opacity-0 pl-0',
                                'group-hover:max-w-[7.5rem] group-hover:opacity-100 group-hover:pl-3',
                                'group-focus-visible:max-w-[7.5rem] group-focus-visible:opacity-100 group-focus-visible:pl-3',
                                !prefersReducedMotion &&
                                    'transition-[max-width,opacity,padding] duration-200 ease-out',
                            )}
                        >
                            View larger
                        </span>
                        <span className="inline-flex size-10 shrink-0 items-center justify-center">
                            <Maximize2Icon
                                className="size-4"
                                aria-hidden
                            />
                        </span>
                    </button>
                ) : null}
            </div>
            <Dialog open={enlargeOpen} onOpenChange={setEnlargeOpen}>
                <DialogContent
                    showCloseButton={false}
                    className="flex aspect-square size-[min(96vmin,72rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
                    aria-describedby={undefined}
                >
                    <DialogHeader className="sr-only">
                        <DialogTitle>
                            {active?.alt?.trim() || productTitle}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogClose
                        type="button"
                        aria-label="Close"
                        className={LIGHTBOX_CLOSE_CLASS}
                    >
                        <XIcon className="size-4" aria-hidden />
                    </DialogClose>
                    <div className="relative min-h-0 w-full flex-1 bg-product-image-bg">
                        {active?.src ? (
                            <GalleryLightboxImage
                                src={active.src}
                                alt={active.alt || productTitle}
                                lqip={active.lqip}
                            />
                        ) : (
                            <span className="absolute inset-0 flex items-center justify-center">
                                <PackageIcon
                                    className="size-32 text-muted-foreground opacity-40"
                                    aria-hidden
                                />
                            </span>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/**
 * Loading chrome for {@link ProductGallery} — main square well only (common
 * single-image PDP). Same sticky flex shell as the live gallery.
 */
export function ProductGallerySkeleton() {
    return (
        <div
            className="flex items-start gap-6 self-start lg:sticky lg:top-8"
            aria-busy="true"
            aria-live="polite"
        >
            <span className="sr-only">Loading product gallery</span>
            <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl bg-product-image-bg">
                <Skeleton className="absolute inset-0 rounded-2xl" />
            </div>
        </div>
    );
}
