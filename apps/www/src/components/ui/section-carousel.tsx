'use client';

import {
    Children,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import Autoplay from 'embla-carousel-autoplay';
import {Pause, Play} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Carousel,
    CarouselContent,
    type CarouselApi,
} from '@pakfactory/ui/components/carousel';
import {cn} from '@pakfactory/ui/lib/utils';

import {CarouselNavButtons} from '@/components/ui/carousel-nav-buttons';

/** Shared slide width for ProductsRow / TestimonialsRow cards. */
export const SECTION_CAROUSEL_ITEM_CLASS =
    'h-auto w-[min(var(--container-md),85vw)] shrink-0 grow-0 basis-[min(var(--container-md),85vw)] self-stretch pl-6';

/**
 * Finder hero rail — peek neighbors on small screens (center-aligned),
 * ~2 cards on `md+`. Same Airy `pl-6` gutter as section rails.
 * Mobile ~68vw so ~16vw peeks left/right. Unprefixed `basis-*` wins over
 * CarouselItem’s default `basis-full` via tailwind-merge.
 */
export const FINDER_CAROUSEL_ITEM_CLASS =
    'h-auto w-[68vw] shrink-0 grow-0 basis-[68vw] self-stretch pl-6 md:w-auto md:basis-1/2';
const AUTOPLAY_DELAY_MS = 4000;
const FINDER_MD_MQ = '(min-width: 768px)';

type SectionCarouselControls = 'arrows' | 'playPause';

/** Slide gutter + matching content cancel margin. */
type SectionCarouselSlideGap = 'section' | 'finder';

type SectionCarouselProps = {
    header?: ReactNode;
    /** Prefer `CarouselItem` children with {@link SECTION_CAROUSEL_ITEM_CLASS}. */
    children: ReactNode;
    footerStart?: ReactNode;
    /** Optional controls after footerStart (e.g. View all CTA); sits before nav. */
    footerEnd?: ReactNode;
    prevLabel?: string;
    nextLabel?: string;
    className?: string;
    /** Optional Embla API callback (e.g. reInit after slide size changes). */
    setApi?: (api: CarouselApi) => void;
    /** Infinite wrap (Embla loop). Default false. */
    loop?: boolean;
    /**
     * Auto-advance every 4s; skipped when prefers-reduced-motion.
     * Forced on when `controls="playPause"`. Default false.
     */
    autoplay?: boolean;
    /**
     * Footer chrome: prev/next arrows (default) or Google-reviews-style
     * pause/play for Finder.
     */
    controls?: SectionCarouselControls;
    /**
     * Gutter between slides. Both variants use Airy pl-6/-ml-6;
     * `finder` uses center align below `md` (peek) and start align on `md+`.
     */
    slideGap?: SectionCarouselSlideGap;
};

function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Full-bleed Embla track + bottom nav for marketing section carousels.
 * Parent owns section chrome (`PageDielineSection`, theme band, ids).
 */
export function SectionCarousel({
    header,
    children,
    footerStart,
    footerEnd,
    prevLabel,
    nextLabel,
    className,
    setApi: setApiProp,
    loop = false,
    autoplay = false,
    controls = 'arrows',
    slideGap = 'section',
}: SectionCarouselProps) {
    const [api, setApiState] = useState<CarouselApi>();
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [paused, setPaused] = useState(false);
    const [finderMdUp, setFinderMdUp] = useState(() =>
        typeof window !== 'undefined'
            ? window.matchMedia(FINDER_MD_MQ).matches
            : true,
    );

    const slideCount = Children.count(children);
    const playPause = controls === 'playPause';
    const showPlayPause = playPause && !reduceMotion && slideCount > 1;
    // playPause Finder rail: always loop when more than one slide so the
    // two-up track never leaves an empty viewport beside first/last.
    const effectiveLoop = playPause && slideCount > 1 ? true : loop;
    const finderAlign =
        slideGap === 'finder' && !finderMdUp ? 'center' : 'start';

    useEffect(() => {
        setReduceMotion(prefersReducedMotion());
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setReduceMotion(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        if (slideGap !== 'finder') return;
        const mq = window.matchMedia(FINDER_MD_MQ);
        const sync = () => setFinderMdUp(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, [slideGap]);

    useEffect(() => {
        if (!api || slideGap !== 'finder') return;
        api.reInit();
    }, [api, finderAlign, slideGap]);

    const enableAutoplay =
        (autoplay || playPause) && !reduceMotion && slideCount > 1;

    const plugins = useMemo(() => {
        if (!enableAutoplay) return undefined;
        return [
            Autoplay({
                delay: AUTOPLAY_DELAY_MS,
                // playPause: Pause button owns WCAG stop. Native mouseenter /
                // focus-in pause without syncing React `paused` (stuck rail).
                stopOnInteraction: !playPause,
                stopOnMouseEnter: !playPause,
                stopOnFocusIn: !playPause,
            }),
        ];
    }, [enableAutoplay, playPause]);

    const setApi = useCallback(
        (carouselApi: CarouselApi) => {
            setApiState(carouselApi);
            setApiProp?.(carouselApi);
        },
        [setApiProp],
    );

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

    // Keep Embla autoplay plugin in sync with the pause toggle.
    useEffect(() => {
        if (!api || !playPause || !enableAutoplay) return;
        const autoplayPlugin = api.plugins()?.autoplay;
        if (!autoplayPlugin) return;
        if (paused) autoplayPlugin.stop();
        else autoplayPlugin.play();
    }, [api, paused, playPause, enableAutoplay]);

    const togglePaused = useCallback(() => {
        setPaused((value) => !value);
    }, []);

    const hasFooterChrome =
        Boolean(footerStart || footerEnd) ||
        controls === 'arrows' ||
        showPlayPause;

    return (
        <Carousel
            setApi={setApi}
            opts={{
                align: finderAlign,
                slidesToScroll: 1,
                loop: effectiveLoop,
                // Higher duration = slower ease (Embla default ~25).
                ...(playPause ? {duration: 40} : {}),
            }}
            plugins={plugins}
            className={cn(
                'flex flex-col',
                header ? 'gap-16' : undefined,
                className,
            )}
        >
            {header}

            <div className="flex flex-col gap-8">
                <div className="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] w-screen max-w-[100vw]">
                    <CarouselContent
                        className={cn(
                            '-ml-6',
                            slideGap === 'finder'
                                ? // Mobile: center-aligned peek (no side pad).
                                  // `md+`: same full-bleed start padding as section rails.
                                  'md:pl-[max(calc(var(--layout-gutter-outer)+var(--layout-gutter-inner)),calc((100vw-var(--layout-max))/2+var(--layout-gutter-inner)))] md:pr-(--layout-gutter-outer)'
                                : [
                                      'pl-[max(calc(var(--layout-gutter-outer)+var(--layout-gutter-inner)),calc((100vw-var(--layout-max))/2+var(--layout-gutter-inner)))]',
                                      'pr-(--layout-gutter-outer)',
                                  ],
                        )}
                    >
                        {children}
                    </CarouselContent>
                </div>

                {hasFooterChrome ? (
                    <div
                        className={cn(
                            'flex flex-wrap items-center gap-4',
                            footerStart || footerEnd
                                ? 'justify-between'
                                : 'justify-end',
                        )}
                    >
                        {footerStart ? (
                            <div className="min-w-0">{footerStart}</div>
                        ) : null}
                        <div className="ml-auto flex flex-wrap items-center gap-4">
                            {footerEnd}
                            {controls === 'arrows' ? (
                                <CarouselNavButtons
                                    onPrev={() => api?.scrollPrev()}
                                    onNext={() => api?.scrollNext()}
                                    canPrev={effectiveLoop || canPrev}
                                    canNext={effectiveLoop || canNext}
                                    prevLabel={prevLabel}
                                    nextLabel={nextLabel}
                                />
                            ) : null}
                            {showPlayPause ? (
                                <Button
                                    type="button"
                                    variant="default"
                                    size="icon"
                                    className="rounded-full bg-foreground text-background hover:bg-foreground/90"
                                    aria-pressed={paused}
                                    aria-label={
                                        paused
                                            ? 'Play results'
                                            : 'Pause results'
                                    }
                                    onClick={togglePaused}
                                >
                                    {paused ? (
                                        <Play
                                            className="size-4"
                                            fill="currentColor"
                                            aria-hidden
                                        />
                                    ) : (
                                        <Pause
                                            className="size-4"
                                            fill="currentColor"
                                            aria-hidden
                                        />
                                    )}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        </Carousel>
    );
}
