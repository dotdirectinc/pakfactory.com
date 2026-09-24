'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import Autoplay from 'embla-carousel-autoplay';
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

const AUTOPLAY_DELAY_MS = 4000;

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
    /** Auto-advance every 4s; skipped when prefers-reduced-motion. Default false. */
    autoplay?: boolean;
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
}: SectionCarouselProps) {
    const [api, setApiState] = useState<CarouselApi>();
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        setReduceMotion(prefersReducedMotion());
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setReduceMotion(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const enableAutoplay = autoplay && !reduceMotion;

    const plugins = useMemo(() => {
        if (!enableAutoplay) return undefined;
        return [
            Autoplay({
                delay: AUTOPLAY_DELAY_MS,
                stopOnInteraction: true,
                stopOnMouseEnter: true,
            }),
        ];
    }, [enableAutoplay]);

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

    return (
        <Carousel
            setApi={setApi}
            opts={{align: 'start', slidesToScroll: 1, loop}}
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
                            'pl-[max(calc(var(--layout-gutter-outer)+var(--layout-gutter-inner)),calc((100vw-var(--layout-max))/2+var(--layout-gutter-inner)))]',
                            'pr-[var(--layout-gutter-outer)]',
                        )}
                    >
                        {children}
                    </CarouselContent>
                </div>

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
                        <CarouselNavButtons
                            onPrev={() => api?.scrollPrev()}
                            onNext={() => api?.scrollNext()}
                            canPrev={loop || canPrev}
                            canNext={loop || canNext}
                            prevLabel={prevLabel}
                            nextLabel={nextLabel}
                        />
                    </div>
                </div>
            </div>
        </Carousel>
    );
}
