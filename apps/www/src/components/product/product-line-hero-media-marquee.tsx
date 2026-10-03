'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent,
    type PointerEvent,
} from 'react';
import Image from 'next/image';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from '@pakfactory/ui/components/carousel';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    SolutionProductPreview,
    type SolutionHeroPreviewProduct,
} from '@/components/solution/solution-product-preview';
import {CarouselNavButtons} from '@/components/ui/carousel-nav-buttons';
import {SanityImage} from '@/components/ui/sanity-image';
import type {ProductLineHeroMediaCard} from '@/lib/catalog/product-line-landing';
import {productModelSrc} from '@/lib/catalog/product-3d-models';
import {isSanityCdnUrl} from '@/lib/sanity/image';
import {headingSettleProps} from '@/lib/ui/heading-settle';
import {
    MEDIA_DISSOLVE_MS,
    mediaDissolveTransitionClass,
} from '@/lib/ui/media-dissolve';

/** Movement before a gesture counts as a drag (not a click) — same as Finder cards. */
const DRAG_CLICK_PX = 8;

/** Embla slide: card sizes itself; gutter matches section rails. */
const HERO_MEDIA_ITEM_CLASS =
    'min-w-0 shrink-0 grow-0 basis-auto self-center pl-6';

export type ProductLineHeroMediaMarqueeProps = {
    cards: ProductLineHeroMediaCard[];
    className?: string;
    style?: CSSProperties;
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

function HeroMediaCard({
    card,
    priority,
    allowVideoPlay,
    onSelect,
}: {
    card: ProductLineHeroMediaCard;
    priority?: boolean;
    allowVideoPlay: boolean;
    onSelect?: (card: ProductLineHeroMediaCard) => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dragRef = useRef({startX: 0, startY: 0, moved: false});
    const [playing, setPlaying] = useState(false);
    const videoUrl = card.videoUrl?.trim() || '';
    const hasVideo = Boolean(videoUrl) && allowVideoPlay;
    const isInteractive = Boolean(card.detailHref && card.title && onSelect);
    const settle = headingSettleProps(card.settleIndex);

    const clearFadeOutTimer = () => {
        if (fadeOutTimerRef.current != null) {
            clearTimeout(fadeOutTimerRef.current);
            fadeOutTimerRef.current = null;
        }
    };

    const resetVideoEl = () => {
        const el = videoRef.current;
        if (el) {
            el.pause();
            el.currentTime = 0;
        }
    };

    const startVideo = () => {
        if (!hasVideo) return;
        clearFadeOutTimer();
        const el = videoRef.current;
        if (!el) return;
        void el.play().then(
            () => setPlaying(true),
            () => setPlaying(false),
        );
    };

    const stopVideo = () => {
        setPlaying(false);
        clearFadeOutTimer();
        fadeOutTimerRef.current = setTimeout(() => {
            resetVideoEl();
            fadeOutTimerRef.current = null;
        }, MEDIA_DISSOLVE_MS);
    };

    useEffect(
        () => () => {
            clearFadeOutTimer();
            resetVideoEl();
        },
        [],
    );

    const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
        };
    }, []);

    const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
        const drag = dragRef.current;
        if (drag.moved) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dx) > DRAG_CLICK_PX || Math.abs(dy) > DRAG_CLICK_PX) {
            drag.moved = true;
        }
    }, []);

    const onCardClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            if (!onSelect) return;
            if (dragRef.current.moved) {
                event.preventDefault();
                return;
            }
            onSelect(card);
        },
        [card, onSelect],
    );

    const stillClassName = cn(
        'object-contain',
        mediaDissolveTransitionClass,
        hasVideo && playing && 'opacity-0',
    );

    const still = isSanityCdnUrl(card.src) ? (
        <SanityImage
            src={card.src}
            alt={card.alt}
            fill
            sizes="(max-width: 639px) 40vw, 28rem"
            className={stillClassName}
            priority={priority}
        />
    ) : (
        <Image
            src={card.src}
            alt={card.alt}
            fill
            sizes="(max-width: 639px) 40vw, 28rem"
            className={stillClassName}
            priority={priority}
            unoptimized
        />
    );

    const shellClass = cn(
        'group/tile relative aspect-4/3 shrink-0 overflow-hidden rounded-2xl',
        'h-[min(40svh,20rem)] w-auto',
        'sm:h-[min(52svh,28rem)] sm:w-auto',
        settle.className,
        (hasVideo || isInteractive) && 'cursor-pointer',
        isInteractive &&
            'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    );

    const mark = isInteractive ? (
        <span
            aria-hidden
            className={cn(
                'pointer-events-none absolute right-4 top-4 z-10 text-black',
                'opacity-0 -rotate-15 translate-x-0 translate-y-0',
                'transition-[opacity,translate] duration-(--motion-slow) ease-in-out',
                'group-hover/tile:translate-x-1 group-hover/tile:-translate-y-1 group-hover/tile:opacity-50',
                'group-focus-visible/tile:translate-x-1 group-focus-visible/tile:-translate-y-1 group-focus-visible/tile:opacity-50',
                'motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:transition-none',
            )}
        >
            <PakFactoryMarkIcon size={28} />
        </span>
    ) : null;

    const media = (
        <>
            {still}
            {hasVideo ? (
                <video
                    ref={videoRef}
                    src={videoUrl}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden
                    className={cn(
                        'absolute inset-0 size-full object-contain',
                        mediaDissolveTransitionClass,
                        playing ? 'opacity-100' : 'opacity-0',
                    )}
                />
            ) : null}
            {mark}
        </>
    );

    if (isInteractive && onSelect) {
        return (
            <button
                type="button"
                className={shellClass}
                style={settle.style}
                onPointerEnter={startVideo}
                onPointerLeave={stopVideo}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onClick={onCardClick}
                aria-label={`View ${card.title}`}
            >
                {media}
            </button>
        );
    }

    return (
        <div
            className={shellClass}
            style={settle.style}
            onPointerEnter={startVideo}
            onPointerLeave={stopVideo}
            onFocus={startVideo}
            onBlur={stopVideo}
            tabIndex={hasVideo ? 0 : undefined}
        >
            {media}
        </div>
    );
}

/**
 * Bottom-bar hero media strip — full-bleed Embla carousel with shared
 * CarouselNavButtons; click opens SolutionProductPreview (same as solution hero).
 */
export function ProductLineHeroMediaMarquee({
    cards,
    className,
    style,
}: ProductLineHeroMediaMarqueeProps) {
    const reducedMotion = usePrefersReducedMotion();
    const isMobile = useIsMobileViewport();
    const allowVideoPlay = !reducedMotion && !isMobile;
    const [api, setApi] = useState<CarouselApi>();
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);
    const [selected, setSelected] = useState<SolutionHeroPreviewProduct | null>(
        null,
    );
    const [open, setOpen] = useState(false);

    const loop = cards.length > 1;
    const showNav = !reducedMotion && cards.length > 1;

    const onSelect = useCallback((carouselApi: CarouselApi) => {
        if (!carouselApi) return;
        setCanPrev(carouselApi.canScrollPrev());
        setCanNext(carouselApi.canScrollNext());
    }, []);

    useEffect(() => {
        if (!api) return;
        onSelect(api);
        api.on('reInit', onSelect);
        api.on('select', onSelect);
        return () => {
            api.off('reInit', onSelect);
            api.off('select', onSelect);
        };
    }, [api, onSelect]);

    if (cards.length === 0) return null;

    const handleSelect = (card: ProductLineHeroMediaCard) => {
        if (!card.title || !card.detailHref) return;
        const slug = card.id.replace(/-\d+$/, '');
        setSelected({
            id: slug,
            title: card.title,
            detailHref: card.detailHref,
            image: {src: card.src, alt: card.alt},
            modelSrc: productModelSrc(slug),
            customizations: card.customizations ?? [],
        });
        setOpen(true);
    };

    return (
        <div
            className={cn('relative flex w-full flex-col gap-8', className)}
            style={style}
        >
            {reducedMotion ? (
                <ul className="mx-auto flex max-w-full list-none gap-4 overflow-x-auto px-1 pb-1">
                    {cards.map((card) => (
                        <li key={card.id}>
                            <HeroMediaCard
                                card={card}
                                allowVideoPlay={false}
                                onSelect={handleSelect}
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <Carousel
                    setApi={setApi}
                    opts={{
                        align: 'start',
                        slidesToScroll: 1,
                        loop,
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-6 items-center pl-(--layout-gutter-outer) pr-(--layout-gutter-outer)">
                        {cards.map((card, index) => (
                            <CarouselItem
                                key={card.id}
                                className={HERO_MEDIA_ITEM_CLASS}
                            >
                                <HeroMediaCard
                                    card={card}
                                    priority={index === 0}
                                    allowVideoPlay={allowVideoPlay}
                                    onSelect={handleSelect}
                                />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            )}

            {showNav ? (
                <div className="mx-auto flex w-full max-w-[var(--layout-max)] justify-end px-layout-gutter-inner">
                    <CarouselNavButtons
                        onPrev={() => api?.scrollPrev()}
                        onNext={() => api?.scrollNext()}
                        canPrev={loop || canPrev}
                        canNext={loop || canNext}
                        prevLabel="Previous media"
                        nextLabel="Next media"
                    />
                </div>
            ) : null}

            <SolutionProductPreview
                product={selected}
                open={open}
                onOpenChange={setOpen}
            />
        </div>
    );
}
