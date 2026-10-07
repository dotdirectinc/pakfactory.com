'use client';

import {useEffect, useRef, useState} from 'react';
import {PackageIcon} from 'lucide-react';
import {Badge} from '@pakfactory/ui/components/badge';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';
import {MediaSettleZoom} from '@/components/ui/media-settle-zoom';
import {SanityImage} from '@/components/ui/sanity-image';
import type {CatalogMedia} from '@/lib/catalog/types';
import {mediaDissolveTransitionClass} from '@/lib/ui/media-dissolve';

type ProductGalleryProps = {
    media: CatalogMedia[];
    productTitle: string;
    /** Optional chip overlaid on the feature image (e.g. Inspiration). */
    badgeLabel?: string;
    /** Playable MP4/MOV for feature (index 0); YouTube / missing → still only. */
    featuredVideoUrl?: string | null;
};

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

export function ProductGallery({
    media,
    productTitle,
    badgeLabel,
    featuredVideoUrl,
}: ProductGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const prefersReducedMotion = usePrefersReducedMotion();
    const isMobile = useIsMobileViewport();

    const items = media.length > 0 ? media : [{alt: productTitle}];
    const active = items[activeIndex] ?? items[0];
    const showRail = items.length > 1;

    const videoUrl = featuredVideoUrl?.trim() || '';
    const allowVideoPlay =
        Boolean(videoUrl) && !prefersReducedMotion && !isMobile;
    const showVideo =
        allowVideoPlay && activeIndex === 0 && Boolean(active?.src);

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
                                    onClick={() => setActiveIndex(index)}
                                    className={cn(
                                        'group relative aspect-square w-full shrink-0 cursor-pointer overflow-hidden rounded-sm bg-muted outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                                        selected
                                            ? 'shadow-md'
                                            : 'opacity-60 hover:opacity-100',
                                    )}
                                >
                                    {item.src ? (
                                        <MediaSettleZoom
                                            mediaKind={
                                                item.kind === 'lifestyle'
                                                    ? 'lifestyle'
                                                    : 'product'
                                            }
                                        >
                                            <SanityImage
                                                src={item.src}
                                                alt=""
                                                square
                                                fill
                                                sizes="64px"
                                                className="object-fill"
                                            />
                                        </MediaSettleZoom>
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
                className={cn(
                    'relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl bg-muted',
                    showVideo && 'cursor-pointer',
                )}
                onPointerEnter={showVideo ? startVideo : undefined}
                onPointerLeave={showVideo ? stopVideo : undefined}
            >
                {active?.src ? (
                    <div className="absolute inset-0">
                        <SanityImage
                            src={active.src}
                            alt={active.alt}
                            square
                            fill
                            priority={activeIndex === 0}
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-fill"
                        />
                    </div>
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <PackageIcon
                            className="size-32 text-muted-foreground opacity-40"
                            aria-hidden
                        />
                    </span>
                )}
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
                            'absolute inset-0 size-full object-fill',
                            mediaDissolveTransitionClass,
                            playing ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                ) : null}
                {showVideo ? (
                    <p
                        aria-hidden
                        className={cn(
                            'pointer-events-none absolute bottom-4 right-4 z-10 hidden max-w-[11rem] rounded-sm bg-black/30 px-2 py-1 text-right text-xs font-medium leading-snug tracking-wide text-white sm:block',
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
                        className="pointer-events-none absolute right-4 top-4 z-10"
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
