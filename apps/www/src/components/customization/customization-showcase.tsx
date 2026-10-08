import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';
import {CustomizationShowcaseGallery} from '@/components/customization/customization-showcase-gallery';
import {fillShowcaseBentoSlots} from '@/lib/catalog/showcase-bento';
import type {CustomizationDetail} from '@/lib/catalog/types';

export const CUSTOMIZATION_SHOWCASE_ID = 'customization-showcase';

type CustomizationShowcaseProps = {
    detail: CustomizationDetail;
    className?: string;
};

/** True when the showcase band has at least one tile (nav + render stay in sync). */
export function hasCustomizationShowcase(detail: CustomizationDetail): boolean {
    return (
        fillShowcaseBentoSlots(
            detail.showcaseSolutions,
            detail.showcaseCaseStudies,
        ).length > 0
    );
}

/**
 * Showcase — See it in use (PROD-1299).
 * 3×3 bento with a large right feature tile; solutions then case studies.
 * Hidden when there are no tiles to place.
 */
export function CustomizationShowcase({
    detail,
    className,
}: CustomizationShowcaseProps) {
    if (!hasCustomizationShowcase(detail)) return null;

    return (
        <section
            id={CUSTOMIZATION_SHOWCASE_ID}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection borderBottom innerClassName="py-16 sm:py-20">
                <CustomizationShowcaseGallery
                    kicker="Showcase"
                    title="See it in use"
                    subtitle="Examples and close-ups of this option on real packaging — so you can picture the finish before you configure."
                    solutions={detail.showcaseSolutions}
                    caseStudies={detail.showcaseCaseStudies}
                />
            </PageDielineSection>
        </section>
    );
}
