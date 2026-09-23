'use client';

import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {CarouselItem} from '@pakfactory/ui/components/carousel';
import {cn} from '@pakfactory/ui/lib/utils';

import {CatalogCard} from '@/components/ui/catalog-card';
import {
    SECTION_CAROUSEL_ITEM_CLASS,
    SectionCarousel,
} from '@/components/ui/section-carousel';
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
    const shell = sectionThemeShell(theme);

    if (products.length === 0) return null;

    return (
        <section
            id="pdp-related"
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32 overflow-x-clip', shell.bandClass, className)}
        >
            <PageDielineSection
                borderBottom
                innerClassName="py-16 sm:py-20"
            >
                <SectionCarousel
                    prevLabel="Previous products"
                    nextLabel="Next products"
                    header={
                        <SectionHeading
                            eyebrow="Related Products"
                            title={heading}
                            description={description}
                            descriptionClassName="text-base leading-6"
                        />
                    }
                >
                    {products.map((product) => (
                        <CarouselItem
                            key={product.href}
                            className={SECTION_CAROUSEL_ITEM_CLASS}
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
                </SectionCarousel>
            </PageDielineSection>
        </section>
    );
}
