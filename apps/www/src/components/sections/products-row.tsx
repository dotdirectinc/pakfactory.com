'use client';

import {useCallback, useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from '@pakfactory/ui/components/carousel';
import {cn} from '@pakfactory/ui/lib/utils';

import {CatalogCard} from '@/components/ui/catalog-card';
import {Icon} from '@/components/ui/icon';
import {SectionHeading} from '@/components/ui/section-heading';
import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

export type ProductsRowItem = {
    href: string;
    title: string;
    sku?: string;
    imageSrc?: string | null;
    imageAlt?: string;
};

type ProductsRowProps = {
    heading?: string;
    description?: string;
    products: ProductsRowItem[];
    className?: string;
    /**
     * Section color band (not app dark/light mode).
     * `muted` = recessed `bg-muted` with elevated white cards.
     */
    theme?: SectionTheme;
};

const DEFAULT_DESCRIPTION =
    'Other rigid styles with a similar industry fit, use, or structure — compare side by side before you add to a request.';

/**
 * Related products strip — SectionHeading + carousel of general CatalogCards.
 * Maps to Studio `productsRow` later.
 */
export function ProductsRow({
    heading = 'People also like',
    description = DEFAULT_DESCRIPTION,
    products,
    className,
    theme = 'default',
}: ProductsRowProps) {
    const [api, setApi] = useState<CarouselApi>();
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);
    const shell = sectionThemeShell(theme);

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

    if (products.length === 0) return null;

    const navButtonClass = (enabled: boolean) =>
        cn(
            'rounded-full bg-foreground text-background',
            'hover:bg-foreground hover:text-background',
            enabled ? 'hover:opacity-90' : 'opacity-40',
        );

    return (
        <section
            id="pdp-related"
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-20 overflow-x-clip', shell.bandClass, className)}
        >
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
                <Carousel
                    setApi={setApi}
                    opts={{align: 'start', slidesToScroll: 1}}
                    className="flex flex-col gap-8"
                >
                    <SectionHeading
                        eyebrow="Browse"
                        title={heading}
                        description={description}
                        descriptionClassName="text-base leading-6"
                    />

                    <div className="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] w-screen max-w-[100vw]">
                        <CarouselContent
                            className={cn(
                                '-ml-6',
                                'pl-[max(calc(var(--layout-gutter-outer)+var(--layout-gutter-inner)),calc((100vw-var(--layout-max))/2+var(--layout-gutter-inner)))]',
                                'pr-[var(--layout-gutter-outer)]',
                            )}
                        >
                            {products.map((product) => (
                                <CarouselItem
                                    key={product.href}
                                    className="h-auto w-[min(var(--container-md),85vw)] shrink-0 grow-0 basis-[min(var(--container-md),85vw)] self-stretch pl-6"
                                >
                                    <CatalogCard
                                        href={product.href}
                                        title={product.title}
                                        eyebrow={product.sku}
                                        align="left"
                                        ctaLabel={null}
                                        imageSrc={product.imageSrc}
                                        imageAlt={product.imageAlt}
                                        surface={shell.cardSurface}
                                    />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            onClick={() => api?.scrollPrev()}
                            disabled={!canPrev}
                            className={navButtonClass(canPrev)}
                            aria-label="Previous products"
                        >
                            <Icon icon={ChevronLeft} size="sm" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            onClick={() => api?.scrollNext()}
                            disabled={!canNext}
                            className={navButtonClass(canNext)}
                            aria-label="Next products"
                        >
                            <Icon icon={ChevronRight} size="sm" />
                        </Button>
                    </div>
                </Carousel>
            </PageDielineSection>
        </section>
    );
}
