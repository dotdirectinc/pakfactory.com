'use client';

import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type PointerEvent,
} from 'react';
import {Maximize2Icon, PackageIcon, XIcon} from 'lucide-react';
import {Dialog as DialogPrimitive} from 'radix-ui';
import {
    Dialog,
    DialogClose,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';
import {CarouselNavButtons} from '@/components/ui/carousel-nav-buttons';
import {MediaSettleZoom} from '@/components/ui/media-settle-zoom';
import {SanityImage} from '@/components/ui/sanity-image';
import {
    lightboxSlotIsBright,
    lightboxStepTarget,
    lightboxSwipeIntent,
    lightboxTrack,
} from '@/lib/catalog/lightbox-track';
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
     * Feature-well `sizes` for Next/Sanity CDN. PDP reports the desktop well
     * (~800px) so a 1× monitor does not download 384. Customization detail
     * passes a wider slot.
     */
    wellSizes?: string;
    /** Idle prefetch width. PDP matches {@link GALLERY_WELL_MAX_WIDTH}. */
    wellPrefetchWidth?: number;
    /**
     * Cap the well CDN width. PDP stays at 800 so retina does not jump to
     * 1600. Customization passes its own prefetch width.
     */
    wellMaxLoaderWidth?: number;
};

/**
 * PDP feature well (PROD-3148). The square is ~700–800 CSS px. Reporting
 * 360px made a 1× monitor select the 384 step and look soft, while retina
 * (×2) selected 750. Desktop now reports 800px. Below `lg` the hint stays
 * `50vw` so phones do not download a larger crop.
 */
const GALLERY_WELL_SIZES = '(max-width: 1023px) 50vw, 800px';

/** CDN ceiling for the PDP well. Retina stays here instead of 1600. */
const GALLERY_WELL_MAX_WIDTH = 800;

/** Prefetch matches {@link GALLERY_WELL_MAX_WIDTH} so warmed slides are the file the well shows. */
const GALLERY_WELL_PREFETCH_WIDTH = GALLERY_WELL_MAX_WIDTH;

/**
 * Customization detail hero: ~3/5 of content column ≈ 720–800 CSS; 2× DPR →
 * near CDN max so the square well is not soft/pixelated.
 */
export const CUSTOMIZATION_GALLERY_WELL_SIZES =
    '(max-width: 1024px) 92vw, 800px';
export const CUSTOMIZATION_GALLERY_WELL_PREFETCH_WIDTH = 1600;

/** Lightbox card — peek plus room under the square for carousel nav. */
const GALLERY_LIGHTBOX_SIZES =
    '(max-width: 767px) min(calc(100vw - 7rem), calc(100dvh - 7rem), 64rem), min(calc(100vmin - 16rem), 64rem)';

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

/** Matches `--motion-base` — slide then snap the track. */
const LIGHTBOX_SLIDE_MS = 300;

/** CSS size kept in sync with slide `translateX` and `sizes`. */
const LIGHTBOX_CARD_SIZE = 'var(--lightbox-card-size)';

/**
 * Full-viewport transparent stage so same-size neighbors can sit in the
 * overlay gutters. Kills the default centered zoom box.
 */
const LIGHTBOX_STAGE_CLASS =
    'fixed inset-0 top-0 left-0 z-50 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none outline-none touch-pan-y sm:max-w-none data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 [--lightbox-card-size:min(calc(100vw-7rem),calc(100dvh-7rem),64rem)] md:[--lightbox-card-size:min(calc(100vmin-16rem),64rem)]';

const LIGHTBOX_CARD_SIZE_CLASS = 'size-[var(--lightbox-card-size)]';

const LIGHTBOX_CARD_CLASS = cn(
    'relative shrink-0 overflow-hidden rounded-lg bg-product-image-bg shadow-lg',
    LIGHTBOX_CARD_SIZE_CLASS,
);

const LIGHTBOX_DRAG_AXIS_PX = 8;

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
    maxLoaderWidth,
    onReady,
}: {
    src: string;
    alt: string;
    priority: boolean;
    lqip?: string;
    sizes: string;
    maxLoaderWidth?: number;
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
            maxLoaderWidth={maxLoaderWidth}
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

function GalleryLightboxCardMedia({
    item,
    productTitle,
    decorative,
}: {
    item: CatalogMedia | undefined;
    productTitle: string;
    decorative?: boolean;
}) {
    if (!item?.src) {
        return (
            <span className="absolute inset-0 flex items-center justify-center">
                <PackageIcon
                    className="size-32 text-muted-foreground opacity-40"
                    aria-hidden
                />
            </span>
        );
    }

    return (
        <GalleryLightboxImage
            src={item.src}
            alt={decorative ? '' : item.alt || productTitle}
            lqip={item.lqip}
        />
    );
}

function lightboxSlotKey(offset: number): string {
    return `lightbox-slot-${offset}`;
}

function measureLightboxStep(track: HTMLElement | null): number {
    const card = track?.querySelector('[data-lightbox-card]');
    if (!(card instanceof HTMLElement) || track == null) return 0;
    const gap = Number.parseFloat(getComputedStyle(track).gap) || 16;
    return card.getBoundingClientRect().width + gap;
}

function GalleryLightbox({
    open,
    onOpenChange,
    items,
    activeIndex,
    productTitle,
    prefersReducedMotion,
    onSelectSlide,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: CatalogMedia[];
    activeIndex: number;
    productTitle: string;
    prefersReducedMotion: boolean;
    onSelectSlide: (index: number) => void;
}) {
    const [slideDir, setSlideDir] = useState(0);
    const [animating, setAnimating] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [dragX, setDragX] = useState(0);
    const [dimSnap, setDimSnap] = useState(false);
    const animatingRef = useRef(false);
    const targetRef = useRef<number | null>(null);
    const goRef = useRef<(direction: -1 | 1) => void>(() => {});
    const trackRef = useRef<HTMLDivElement>(null);
    const suppressClickRef = useRef(false);
    const dragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        lastX: number;
        lastT: number;
        velocityX: number;
        axis: 'undecided' | 'x' | 'y';
        moved: boolean;
    } | null>(null);

    const active = items[activeIndex] ?? items[0];
    const title = active?.alt?.trim() || productTitle;
    const slots = lightboxTrack(items.length, activeIndex);
    const canPrev = lightboxStepTarget(items.length, activeIndex, -1) != null;
    const canNext = lightboxStepTarget(items.length, activeIndex, 1) != null;
    const travelDir: -1 | 0 | 1 =
        slideDir !== 0
            ? (slideDir as -1 | 1)
            : dragging && dragX !== 0
              ? dragX > 0
                  ? -1
                  : 1
              : 0;
    const pendingIndex =
        targetRef.current ??
        (travelDir !== 0
            ? lightboxStepTarget(items.length, activeIndex, travelDir)
            : null);

    const settleSlide = () => {
        if (!animatingRef.current) return;
        animatingRef.current = false;
        const target = targetRef.current;
        targetRef.current = null;
        setDimSnap(true);
        setAnimating(false);
        setSlideDir(0);
        setDragX(0);
        setDragging(false);
        if (target != null) onSelectSlide(target);
    };
    const settleSlideRef = useRef(settleSlide);
    settleSlideRef.current = settleSlide;

    const go = (direction: -1 | 1) => {
        if (animatingRef.current) return;
        const target = lightboxStepTarget(
            items.length,
            activeIndex,
            direction,
        );
        if (target == null) return;
        setDragging(false);
        setDragX(0);
        if (prefersReducedMotion) {
            onSelectSlide(target);
            return;
        }
        animatingRef.current = true;
        targetRef.current = target;
        setSlideDir(direction);
        setAnimating(true);
    };

    goRef.current = go;

    const resetMotion = () => {
        animatingRef.current = false;
        targetRef.current = null;
        dragRef.current = null;
        setAnimating(false);
        setSlideDir(0);
        setDragX(0);
        setDragging(false);
        setDimSnap(false);
    };

    useEffect(() => {
        if (open) return;
        resetMotion();
    }, [open]);

    useLayoutEffect(() => {
        if (!dimSnap) return;
        const frame = window.requestAnimationFrame(() => setDimSnap(false));
        return () => window.cancelAnimationFrame(frame);
    }, [dimSnap]);

    useEffect(() => {
        if (!animating) return;
        const timer = window.setTimeout(
            () => settleSlideRef.current(),
            LIGHTBOX_SLIDE_MS + 50,
        );
        return () => window.clearTimeout(timer);
    }, [animating]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                return;
            }
            const eventTarget = event.target;
            if (
                eventTarget instanceof HTMLElement &&
                (eventTarget.tagName === 'INPUT' ||
                    eventTarget.tagName === 'TEXTAREA' ||
                    eventTarget.tagName === 'SELECT' ||
                    eventTarget.isContentEditable)
            ) {
                return;
            }
            event.preventDefault();
            goRef.current(event.key === 'ArrowLeft' ? -1 : 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const stepFromEventTarget = (target: EventTarget | null): -1 | 1 | 0 => {
        if (!(target instanceof Element)) return 0;
        const control = target.closest('[data-lightbox-step]');
        if (!(control instanceof HTMLElement)) return 0;
        const step = Number(control.dataset.lightboxStep);
        return step === -1 || step === 1 ? step : 0;
    };

    const onTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        if (animatingRef.current) return;
        if (
            event.target instanceof Element &&
            event.target.closest('[aria-label="Close"]')
        ) {
            return;
        }
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastT: event.timeStamp,
            velocityX: 0,
            axis: 'undecided',
            moved: false,
        };
    };

    const onTrackPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (drag == null || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (drag.axis === 'undecided') {
            if (
                Math.abs(dx) < LIGHTBOX_DRAG_AXIS_PX &&
                Math.abs(dy) < LIGHTBOX_DRAG_AXIS_PX
            ) {
                return;
            }
            drag.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
            if (drag.axis === 'x') {
                trackRef.current?.setPointerCapture(event.pointerId);
            }
        }
        if (drag.axis !== 'x') return;
        event.preventDefault();
        drag.moved = true;
        const dt = event.timeStamp - drag.lastT;
        if (dt > 0) {
            drag.velocityX = (event.clientX - drag.lastX) / dt;
        }
        drag.lastX = event.clientX;
        drag.lastT = event.timeStamp;
        if (prefersReducedMotion) return;
        let nextX = dx;
        if (!canNext && nextX < 0) nextX = 0;
        if (!canPrev && nextX > 0) nextX = 0;
        setDragging(true);
        setDragX(nextX);
    };

    const onTrackPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (drag == null || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (trackRef.current?.hasPointerCapture(event.pointerId)) {
            trackRef.current.releasePointerCapture(event.pointerId);
        }
        const controlStep = stepFromEventTarget(event.target);
        const commitSwipe = () => {
            suppressClickRef.current = true;
            window.setTimeout(() => {
                suppressClickRef.current = false;
            }, 0);
        };

        if (!drag.moved || drag.axis !== 'x') {
            setDragging(false);
            setDragX(0);
            if (controlStep !== 0) go(controlStep);
            return;
        }

        const dx = event.clientX - drag.startX;
        const step = measureLightboxStep(trackRef.current);
        const intent = lightboxSwipeIntent(dx, step, drag.velocityX);
        const allowed =
            intent === 0
                ? 0
                : lightboxStepTarget(items.length, activeIndex, intent) ==
                    null
                  ? 0
                  : intent;
        if (allowed !== 0) {
            commitSwipe();
            if (prefersReducedMotion) {
                setDragging(false);
                setDragX(0);
            }
            go(allowed);
            return;
        }
        setDragging(false);
        setDragX(0);
        if (controlStep !== 0) {
            go(controlStep);
            return;
        }
        if (prefersReducedMotion) return;
        animatingRef.current = true;
        setAnimating(true);
    };

    const trackTransform = dragging
        ? `translateX(${dragX}px)`
        : slideDir === 0
          ? 'translateX(0px)'
          : `translateX(calc(${-slideDir} * (${LIGHTBOX_CARD_SIZE} + 1rem)))`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/80" />
                <DialogPrimitive.Content
                    className={LIGHTBOX_STAGE_CLASS}
                    aria-describedby={undefined}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        const stage = event.currentTarget;
                        if (!(stage instanceof HTMLElement)) return;
                        const close = stage.querySelector('[aria-label="Close"]');
                        if (close instanceof HTMLElement) close.focus();
                    }}
                    onPointerDown={(event) => {
                        if (event.target === event.currentTarget) {
                            onOpenChange(false);
                        }
                    }}
                >
                <DialogHeader className="sr-only">
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <p className="sr-only" aria-live="polite">
                    {`Image ${activeIndex + 1} of ${items.length}. ${title}`}
                </p>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                    <div
                        ref={trackRef}
                        className={cn(
                            'pointer-events-auto flex touch-none select-none items-center gap-4',
                            animating &&
                                !dragging &&
                                'transition-transform duration-(--motion-base) ease-in-out motion-reduce:transition-none',
                        )}
                        style={{transform: trackTransform}}
                        onDragStart={(event) => event.preventDefault()}
                        onPointerDown={onTrackPointerDown}
                        onPointerMove={onTrackPointerMove}
                        onPointerUp={onTrackPointerUp}
                        onPointerCancel={onTrackPointerUp}
                        onTransitionEnd={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.propertyName !== 'transform') return;
                            settleSlide();
                        }}
                    >
                        {slots.map((slot) => {
                            const item =
                                slot.index == null
                                    ? undefined
                                    : items[slot.index];
                            const isBright = lightboxSlotIsBright(
                                slot.index,
                                activeIndex,
                                pendingIndex,
                            );
                            const canHoverBright =
                                Math.abs(slot.offset) === 1 &&
                                pendingIndex == null &&
                                travelDir === 0;
                            const dimClass = cn(
                                dimSnap
                                    ? 'transition-none'
                                    : mediaDissolveTransitionClass,
                                isBright ? 'opacity-100' : 'opacity-30',
                                canHoverBright &&
                                    'hover:opacity-100 focus-visible:opacity-100',
                            );

                            if (item == null) {
                                return (
                                    <div
                                        key={lightboxSlotKey(slot.offset)}
                                        aria-hidden
                                        className={cn(
                                            'shrink-0',
                                            LIGHTBOX_CARD_SIZE_CLASS,
                                        )}
                                    />
                                );
                            }

                            const isPrev = slot.offset < 0;
                            const isControl =
                                Math.abs(slot.offset) === 1 &&
                                (isPrev ? canPrev : canNext);
                            const step = isPrev ? -1 : 1;

                            return (
                                <div
                                    key={lightboxSlotKey(slot.offset)}
                                    data-lightbox-card=""
                                    data-lightbox-step={
                                        isControl ? String(step) : undefined
                                    }
                                    aria-hidden={
                                        isControl || slot.offset === 0
                                            ? undefined
                                            : true
                                    }
                                    role={isControl ? 'button' : undefined}
                                    tabIndex={
                                        isControl && !animating
                                            ? 0
                                            : undefined
                                    }
                                    aria-label={
                                        isControl
                                            ? isPrev
                                                ? 'Previous image'
                                                : 'Next image'
                                            : undefined
                                    }
                                    className={cn(
                                        LIGHTBOX_CARD_CLASS,
                                        dimClass,
                                        slot.offset === 0 || isControl
                                            ? 'pointer-events-auto'
                                            : 'pointer-events-none',
                                        isControl &&
                                            'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    )}
                                    onClick={
                                        isControl
                                            ? (event) => {
                                                  event.stopPropagation();
                                                  if (
                                                      suppressClickRef.current ||
                                                      animating
                                                  ) {
                                                      return;
                                                  }
                                                  go(step);
                                              }
                                            : undefined
                                    }
                                    onKeyDown={
                                        isControl
                                            ? (event) => {
                                                  if (
                                                      event.key !==
                                                          'Enter' &&
                                                      event.key !== ' '
                                                  ) {
                                                      return;
                                                  }
                                                  event.preventDefault();
                                                  if (
                                                      suppressClickRef.current ||
                                                      animating
                                                  ) {
                                                      return;
                                                  }
                                                  go(step);
                                              }
                                            : undefined
                                    }
                                >
                                    {slot.offset === 0 ? (
                                        <DialogClose
                                            type="button"
                                            aria-label="Close"
                                            className={LIGHTBOX_CLOSE_CLASS}
                                            onPointerDown={(event) => {
                                                event.stopPropagation();
                                            }}
                                        >
                                            <XIcon
                                                className="size-4"
                                                aria-hidden
                                            />
                                        </DialogClose>
                                    ) : null}
                                    <GalleryLightboxCardMedia
                                        item={item}
                                        productTitle={productTitle}
                                        decorative={slot.offset !== 0}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
                {items.length > 1 ? (
                    <div
                        className="pointer-events-none absolute inset-x-0 z-40 flex justify-center top-[calc(50%+(var(--lightbox-card-size)/2)+1rem)] md:top-[calc(50%+(var(--lightbox-card-size)/2))] md:bottom-0 md:items-center"
                    >
                        <div
                            className="pointer-events-auto"
                            onPointerDown={(event) => {
                                event.stopPropagation();
                            }}
                        >
                            <CarouselNavButtons
                                tone="onDark"
                                onPrev={() => go(-1)}
                                onNext={() => go(1)}
                                canPrev={canPrev}
                                canNext={canNext}
                                prevLabel="Previous image"
                                nextLabel="Next image"
                            />
                        </div>
                    </div>
                ) : null}
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

export function ProductGallery({
    media,
    productTitle,
    featuredVideoUrl,
    wellSizes = GALLERY_WELL_SIZES,
    wellPrefetchWidth = GALLERY_WELL_PREFETCH_WIDTH,
    wellMaxLoaderWidth = GALLERY_WELL_MAX_WIDTH,
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

    const prefetchLightboxTrack = (index: number) => {
        for (const slot of lightboxTrack(items.length, index)) {
            if (slot.index == null) continue;
            prefetchLightbox(items[slot.index]?.src);
        }
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
        prefetchLightboxTrack(activeIndex);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- warm visible lightbox slots
    }, [enlargeOpen, activeIndex, items]);

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
                                    maxLoaderWidth={wellMaxLoaderWidth}
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
                        onPointerEnter={() => prefetchLightboxTrack(activeIndex)}
                        onFocus={() => prefetchLightboxTrack(activeIndex)}
                        onClick={(event) => {
                            event.stopPropagation();
                            prefetchLightboxTrack(activeIndex);
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
            <GalleryLightbox
                open={enlargeOpen}
                onOpenChange={setEnlargeOpen}
                items={items}
                activeIndex={activeIndex}
                productTitle={productTitle}
                prefersReducedMotion={prefersReducedMotion}
                onSelectSlide={selectSlide}
            />
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
