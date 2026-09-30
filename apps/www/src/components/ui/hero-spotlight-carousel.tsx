'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';

import {CoverVideo} from '@/components/ui/cover-video';
import {HeroMediaCaption} from '@/components/ui/hero-media-caption';
import {SanityImage} from '@/components/ui/sanity-image';
import type {HeroSlide} from '@/lib/sections/map-hero';
import {usePrefersReducedMotion} from '@/lib/ui/use-prefers-reduced-motion';

/** Dwell per slide — long enough to read a caption and its stat. */
const CYCLE_MS = 7000;

export type HeroSpotlightLayout = 'split' | 'fullBleed';

type HeroSpotlightCarouselProps = {
    slides: HeroSlide[];
    /** Server-rendered fixed copy (H1, CTAs, rating) — never rotates. */
    copy: ReactNode;
    layout: HeroSpotlightLayout;
    /** Base id for tab / panel ids. */
    id: string;
    /** Accessible name for the carousel region. */
    label?: string;
};

/**
 * Home hero spotlight (PROD-2666) — the rotating half of the Spotlight and
 * Full-bleed heroes. Client island; the copy passed in stays an RSC.
 *
 * Autoplay follows the `Steps` contract (WCAG 2.2.2): pointer or focus inside
 * the hero pauses it, choosing a slide stops it for good, and
 * `prefers-reduced-motion` never starts it. Slides share one cell and
 * cross-fade, so nothing reflows. The active pager track fills over one cycle.
 */
export function HeroSpotlightCarousel({
    slides,
    copy,
    layout,
    id,
    label = 'Featured work and products',
}: HeroSpotlightCarouselProps) {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const [stopped, setStopped] = useState(false);
    const reduceMotion = usePrefersReducedMotion();
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const autoplay = slides.length > 1 && !reduceMotion && !stopped;
    const running = autoplay && !paused;

    useEffect(() => {
        if (!running) return undefined;
        const timer = window.setTimeout(
            () => setActive((index) => (index + 1) % slides.length),
            CYCLE_MS,
        );
        return () => window.clearTimeout(timer);
    }, [running, active, slides.length]);

    const select = useCallback((index: number) => {
        setActive(index);
        setStopped(true);
    }, []);

    const onTabKeyDown = (event: KeyboardEvent) => {
        const last = slides.length - 1;
        const next = (
            {
                ArrowRight: active === last ? 0 : active + 1,
                ArrowLeft: active === 0 ? last : active - 1,
                Home: 0,
                End: last,
            } as Record<string, number>
        )[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next);
        tabRefs.current[next]?.focus();
    };

    const pauseHandlers = {
        onPointerEnter: () => setPaused(true),
        onPointerLeave: () => setPaused(false),
        onFocus: () => setPaused(true),
        onBlur: () => setPaused(false),
    };

    const tabId = (index: number) => `${id}-tab-${slides[index]?.id}`;
    const panelId = (index: number) => `${id}-panel-${slides[index]?.id}`;
    const fullBleed = layout === 'fullBleed';

    const pager =
        slides.length > 1 ? (
            <div
                role="tablist"
                aria-label={label}
                onKeyDown={onTabKeyDown}
                className="flex gap-4"
            >
                {slides.map((slide, index) => {
                    const current = index === active;
                    return (
                        <button
                            key={slide.id}
                            ref={(node) => {
                                tabRefs.current[index] = node;
                            }}
                            id={tabId(index)}
                            type="button"
                            role="tab"
                            aria-selected={current}
                            aria-controls={panelId(index)}
                            tabIndex={current ? 0 : -1}
                            onClick={() => select(index)}
                            className={cn(
                                'flex min-w-0 flex-1 cursor-pointer flex-col gap-2 pt-4 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none',
                                fullBleed
                                    ? current
                                        ? 'text-background focus-visible:outline-background'
                                        : 'text-background/60 hover:text-background'
                                    : current
                                      ? 'text-foreground focus-visible:outline-foreground'
                                      : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'relative block h-0.5 overflow-hidden rounded-full',
                                    fullBleed ? 'bg-background/25' : 'bg-border',
                                )}
                            >
                                {current ? (
                                    <span
                                        key={`${slide.id}-${stopped ? 'held' : 'cycle'}`}
                                        style={
                                            autoplay
                                                ? ({
                                                      '--motion-cycle': `${CYCLE_MS}ms`,
                                                      animationPlayState: paused
                                                          ? 'paused'
                                                          : 'running',
                                                  } as CSSProperties)
                                                : undefined
                                        }
                                        className={cn(
                                            'absolute inset-0',
                                            fullBleed ? 'bg-background' : 'bg-foreground',
                                            autoplay && 'motion-tab-progress',
                                        )}
                                    />
                                ) : null}
                            </span>
                            <span className="hidden text-xs font-semibold uppercase tracking-wider sm:block">
                                {slide.kindLabel}
                            </span>
                            <span className="truncate text-sm">{slide.label}</span>
                        </button>
                    );
                })}
            </div>
        ) : null;

    const panels = slides.map((slide, index) => {
        const current = index === active;
        const contain = slide.imageFit === 'contain';
        return (
            <div
                key={slide.id}
                id={panelId(index)}
                role={slides.length > 1 ? 'tabpanel' : undefined}
                aria-labelledby={slides.length > 1 ? tabId(index) : undefined}
                aria-hidden={!current}
                className={cn(
                    'absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none',
                    current ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
            >
                <div
                    className={cn(
                        'absolute inset-y-0 right-0 bg-muted',
                        fullBleed && contain ? 'w-full lg:w-3/5' : 'w-full',
                    )}
                >
                    <SanityImage
                        src={slide.image.src}
                        alt={slide.image.alt}
                        fill
                        priority={index === 0}
                        sizes={
                            fullBleed
                                ? '100vw'
                                : '(max-width: 1024px) 100vw, 60vw'
                        }
                        className={cn(
                            contain
                                ? 'object-contain p-8 sm:p-12'
                                : 'object-cover',
                        )}
                    />
                    {slide.videoSrc ? (
                        <CoverVideo
                            src={slide.videoSrc}
                            poster={slide.image.src}
                            active={current}
                            className="absolute inset-0 size-full object-cover"
                        />
                    ) : null}
                </div>
                {fullBleed ? (
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-linear-to-r from-foreground/80 via-foreground/40 to-transparent"
                    />
                ) : null}
                <HeroMediaCaption
                    kindLabel={slide.kindLabel}
                    title={slide.title}
                    description={slide.description}
                    chips={slide.chips}
                    stat={slide.stat}
                    link={slide.link}
                    tabIndex={current ? undefined : -1}
                    className={cn(
                        'absolute',
                        fullBleed
                            ? 'bottom-40 right-8 hidden w-96 lg:flex'
                            : 'inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-96',
                    )}
                />
            </div>
        );
    });

    if (fullBleed) {
        return (
            <div
                className="relative isolate min-h-160 overflow-hidden bg-foreground"
                {...pauseHandlers}
            >
                <div
                    role="group"
                    aria-roledescription="carousel"
                    aria-label={label}
                    className="absolute inset-0"
                >
                    {panels}
                </div>
                <div className="pointer-events-none relative mx-auto flex min-h-160 w-full max-w-[var(--layout-max)] flex-col justify-between gap-12 px-layout-gutter-inner py-16 sm:py-20 lg:py-24">
                    <div className="pointer-events-auto max-w-2xl">{copy}</div>
                    {pager ? (
                        <div className="pointer-events-auto max-w-3xl">{pager}</div>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div
            className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12"
            {...pauseHandlers}
        >
            <div className="lg:col-span-5">{copy}</div>
            <div className="flex flex-col gap-4 lg:col-span-7">
                <div
                    role="group"
                    aria-roledescription="carousel"
                    aria-label={label}
                    className="relative aspect-4/5 w-full overflow-hidden rounded-xl bg-muted sm:aspect-5/4"
                >
                    {panels}
                </div>
                {pager}
            </div>
        </div>
    );
}
