import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CustomizationWorksWithBrowser} from '@/components/customization/customization-works-with-browser';
import {SectionHeading} from '@/components/ui/section-heading';
import {serializeCompatibilityQuery} from '@/lib/catalog/compatibility-query';
import type {
    WorksWithOptionRef,
    WorksWithProductCard,
} from '@/lib/catalog/build-works-with-products';
import type {ProductLineRef} from '@/lib/catalog/types';
import {customizationCompatibilityHref} from '@/lib/www-routes';

export const CUSTOMIZATION_REFERENCE_WORKS_WITH_ID =
    'customization-reference-works-with';

type CustomizationReferenceWorksWithProps = {
    option: WorksWithOptionRef;
    lines: ProductLineRef[];
    products: WorksWithProductCard[];
    className?: string;
};

/**
 * Works with page section (PROD-1299 / PROD-2921).
 * SectionHeading + browser; engine Show more lives on the heading CTA.
 */
export function CustomizationReferenceWorksWith({
    option,
    lines,
    products,
    className,
}: CustomizationReferenceWorksWithProps) {
    const engineHref = customizationCompatibilityHref(
        serializeCompatibilityQuery({
            selections: [
                {
                    category: option.category,
                    optionSlug: option.slug,
                },
            ],
            properties: [],
        }),
    );

    return (
        <section
            id={CUSTOMIZATION_REFERENCE_WORKS_WITH_ID}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection
                borderBottom
                innerClassName="py-16 sm:py-20"
            >
                <SectionHeading
                    eyebrow="Works with"
                    title="Works with"
                    description="Choose a compatible product to apply this option to your request."
                    cta={{label: 'Browse all compatible products', href: engineHref}}
                    ctaPlacement="end"
                />
                <CustomizationWorksWithBrowser
                    option={option}
                    lines={lines}
                    products={products}
                />
            </PageDielineSection>
        </section>
    );
}

/** Always present so the page-level nav can include Works with. */
export function hasReferenceWorksWith(): boolean {
    return true;
}
