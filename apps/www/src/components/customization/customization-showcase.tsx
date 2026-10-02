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

/**
 * Showcase — See it in use (PROD-1299).
 * 3×3 bento with a large right feature tile; solutions then case studies.
 * Hidden when there are no tiles to place.
 */
export function CustomizationShowcase({
    detail,
    className,
}: CustomizationShowcaseProps) {
    const tiles = fillShowcaseBentoSlots(
        detail.showcaseSolutions,
        detail.showcaseCaseStudies,
    );
    if (tiles.length === 0) return null;

    return (
        <section
            id={CUSTOMIZATION_SHOWCASE_ID}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
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
