'use client';

import {useEffect, useRef, useState, type CSSProperties} from 'react';
import Image from 'next/image';
import {Marquee} from '@pakfactory/ui/components/marquee';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    SolutionProductPreview,
    type SolutionHeroPreviewProduct,
} from '@/components/solution/solution-product-preview';
import {SanityImage} from '@/components/ui/sanity-image';
import type {ProductLineHeroMediaCard} from '@/lib/catalog/product-line-landing';
import {productModelSrc} from '@/lib/catalog/product-3d-models';
import {isSanityCdnUrl} from '@/lib/sanity/image';
import {headingSettleProps} from '@/lib/ui/heading-settle';
import {
    MEDIA_DISSOLVE_MS,
    mediaDissolveTransitionClass,
} from '@/lib/ui/media-dissolve';

/** Seconds for one card-width of travel — keeps scroll slow as density grows. */
const MARQUEE_SECONDS_PER_CARD = 48;
/** Never faster than this full-loop time (~12 cards × 8s ≈ 95). */
const MARQUEE_DURATION_FLOOR_S = 560;
const MARQUEE_GAP_REM = 1;

function marqueeDurationForCards(count: number): number {
    return Math.max(MARQUEE_DURATION_FLOOR_S, count * MARQUEE_SECONDS_PER_CARD);
}

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
                onClick={() => onSelect(card)}
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
 * Bottom-bar hero media strip — full-bleed Marquee (duration scales with
 * card count for constant slow scroll); product preview on click.
 */
export function ProductLineHeroMediaMarquee({
    cards,
    className,
    style,
}: ProductLineHeroMediaMarqueeProps) {
    const reducedMotion = usePrefersReducedMotion();
    const isMobile = useIsMobileViewport();
    const allowVideoPlay = !reducedMotion && !isMobile;
    const [selected, setSelected] = useState<SolutionHeroPreviewProduct | null>(
        null,
    );
    const [open, setOpen] = useState(false);

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

    const cardNodes = cards.map((card, index) => (
        <HeroMediaCard
            key={card.id}
            card={card}
            priority={index === 0}
            allowVideoPlay={allowVideoPlay}
            onSelect={handleSelect}
        />
    ));

    return (
        <div className={cn('relative w-full', className)} style={style}>
            {reducedMotion ? (
                <ul className="mx-auto flex max-w-full list-none gap-4 overflow-x-auto px-1 pb-1">
                    {cards
                        .filter(
                            (card, index, list) =>
                                list.findIndex((c) => c.src === card.src) ===
                                index,
                        )
                        .map((card) => (
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
                <Marquee
                    pauseOnHover
                    gap={MARQUEE_GAP_REM}
                    duration={marqueeDurationForCards(cards.length)}
                    className="p-0 *:items-center"
                >
                    {cardNodes}
                </Marquee>
            )}

            <SolutionProductPreview
                product={selected}
                open={open}
                onOpenChange={setOpen}
            />
        </div>
    );
}
