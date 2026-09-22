'use client';

import {useCallback, useEffect, useState, type ReactNode} from 'react';
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

type SectionCarouselProps = {
    header?: ReactNode;
    /** Prefer `CarouselItem` children with {@link SECTION_CAROUSEL_ITEM_CLASS}. */
    children: ReactNode;
    footerStart?: ReactNode;
    prevLabel?: string;
    nextLabel?: string;
    className?: string;
    /** Optional Embla API callback (e.g. reInit after slide size changes). */
    setApi?: (api: CarouselApi) => void;
};

/**
 * Full-bleed Embla track + bottom nav for marketing section carousels.
 * Parent owns section chrome (`PageDielineSection`, theme band, ids).
 */
export function SectionCarousel({
    header,
    children,
    footerStart,
    prevLabel,
    nextLabel,
    className,
    setApi: setApiProp,
}: SectionCarouselProps) {
    const [api, setApiState] = useState<CarouselApi>();
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);

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
            opts={{align: 'start', slidesToScroll: 1}}
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
                        'flex items-center gap-4',
                        footerStart ? 'justify-between' : 'justify-end',
                    )}
                >
                    {footerStart ? (
                        <div className="min-w-0">{footerStart}</div>
                    ) : null}
                    <CarouselNavButtons
                        onPrev={() => api?.scrollPrev()}
                        onNext={() => api?.scrollNext()}
                        canPrev={canPrev}
                        canNext={canNext}
                        prevLabel={prevLabel}
                        nextLabel={nextLabel}
                    />
                </div>
            </div>
        </Carousel>
    );
}
