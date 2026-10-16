'use client';

import {useEffect, useRef, useState} from 'react';
import {PackageIcon} from 'lucide-react';
import {Badge} from '@pakfactory/ui/components/badge';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';
import {MediaSettleZoom} from '@/components/ui/media-settle-zoom';
import {SanityImage} from '@/components/ui/sanity-image';
import type {CatalogMedia} from '@/lib/catalog/types';
import {useSanityImageSettle} from '@/lib/sanity/use-sanity-image-settle';
import {
    MEDIA_DISSOLVE_MS,
    mediaDissolveTransitionClass,
} from '@/lib/ui/media-dissolve';

type ProductGalleryProps = {
    media: CatalogMedia[];
    productTitle: string;
    /** Optional chip overlaid on the feature image (e.g. Inspiration). */
    badgeLabel?: string;
    /** Playable MP4/MOV for feature (index 0); YouTube / missing → still only. */
    featuredVideoUrl?: string | null;
};

/**
 * Feature well: under-report so 2× DPR lands near ~720–800, not full-viewport
 * 1080–1920 (PROD-3102).
 */
const GALLERY_WELL_SIZES = '(max-width: 1024px) 50vw, 360px';

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
    onReady,
}: {
    src: string;
    alt: string;
    priority: boolean;
    lqip?: string;
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
            sizes={GALLERY_WELL_SIZES}
            className={cn('object-fill', imageClassName)}
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
    badgeLabel,
    featuredVideoUrl,
}: ProductGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [visibleIndex, setVisibleIndex] = useState(0);
    const [underIndex, setUnderIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const wellRef = useRef<HTMLDivElement>(null);
    const loadedRef = useRef<Set<number>>(new Set());
    const activeIndexRef = useRef(0);
    const visibleIndexRef = useRef(0);
    const prefersReducedMotion = usePrefersReducedMotion();
    const isMobile = useIsMobileViewport();

    const items = media.length > 0 ? media : [{alt: productTitle}];
    const active = items[activeIndex] ?? items[0];
    const showRail = items.length > 1;

    activeIndexRef.current = activeIndex;
    visibleIndexRef.current = visibleIndex;

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
    };

    const markReady = (index: number) => {
        loadedRef.current.add(index);
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
        items.forEach((item, index) => {
            if (!item.src) loadedRef.current.add(index);
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
                                        'group relative aspect-square w-full shrink-0 cursor-pointer overflow-hidden rounded-sm bg-muted outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
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
                    'relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl bg-muted',
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

                    return (
                        <div
                            key={`${item.alt}-${index}`}
                            data-gallery-slide={index}
                            aria-hidden={!isTop}
                            className={cn(
                                // Opaque muted panel so transparent PNGs dissolve
                                // against chrome, not the under-slide product (PROD-3102).
                                'absolute inset-0 bg-muted',
                                isTop ? 'z-10' : 'z-0',
                                mediaDissolveTransitionClass,
                                isTop || isUnder ? 'opacity-100' : 'opacity-0',
                                !isTop && 'pointer-events-none',
                            )}
                        >
                            {item.src ? (
                                <GalleryWellSlideImage
                                    src={item.src}
                                    alt={isTop ? item.alt : ''}
                                    priority={index === 0}
                                    lqip={item.lqip}
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
                {badgeLabel ? (
                    <Badge
                        variant="default"
                        className="pointer-events-none absolute right-4 top-4 z-20"
                    >
                        {badgeLabel}
                    </Badge>
                ) : null}
            </div>
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
            <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl bg-muted">
                <Skeleton className="absolute inset-0 rounded-2xl" />
            </div>
        </div>
    );
}
