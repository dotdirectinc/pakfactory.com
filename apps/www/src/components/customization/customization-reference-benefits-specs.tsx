import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CustomizationReferenceLifestyleMedia} from '@/components/customization/customization-reference-lifestyle-media';
import {
    CustomizationReferenceBenefitsContent,
    hasReferenceOverview,
} from '@/components/customization/customization-reference-overview';
import {
    CustomizationReferenceSpecsContent,
    hasReferenceSpecs,
} from '@/components/customization/customization-reference-specs';
import {firstLifestyleStill} from '@/lib/catalog/map-sanity';
import type {CustomizationDetail} from '@/lib/catalog/types';

type CustomizationReferenceBenefitsSpecsProps = {
    detail: CustomizationDetail;
    compareLabel: string;
    className?: string;
};

/**
 * Shared Benefits + Specs band (PROD-1299).
 * Benefits heads the story. The spec table keeps its Specs & performance
 * label. The right column is the lifestyle image when one exists; otherwise
 * the spec table takes that column.
 */
export function CustomizationReferenceBenefitsSpecs({
    detail,
    compareLabel,
    className,
}: CustomizationReferenceBenefitsSpecsProps) {
    const showOverview = hasReferenceOverview(detail);
    const showSpecs = hasReferenceSpecs(detail);
    if (!showOverview && !showSpecs) return null;

    const lifestyleStill = firstLifestyleStill(detail.media);
    const lifestyleVideoUrl = detail.lifestyleVideoUrl?.trim() || null;
    const hasLifestyleMedia = Boolean(
        lifestyleVideoUrl || lifestyleStill?.src,
    );
    const specsInRightColumn =
        !hasLifestyleMedia && showOverview && showSpecs;
    const twoColumns = hasLifestyleMedia || specsInRightColumn;

    return (
        <div className={cn(className)}>
            <PageDielineSection
                borderBottom
                innerClassName="py-16 sm:py-20"
            >
                <div
                    className={cn(
                        'grid gap-10 lg:items-start',
                        twoColumns ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
                    )}
                >
                    <div
                        className={cn(
                            'flex min-w-0 flex-col gap-10',
                            !twoColumns && 'lg:max-w-[calc(50%-1.25rem)]',
                        )}
                    >
                        {showOverview ? (
                            <CustomizationReferenceBenefitsContent
                                detail={detail}
                            />
                        ) : null}
                        {showSpecs && !specsInRightColumn ? (
                            <CustomizationReferenceSpecsContent
                                detail={detail}
                                compareLabel={compareLabel}
                                heading={showOverview ? 'label' : 'section'}
                            />
                        ) : null}
                    </div>

                    {hasLifestyleMedia ? (
                        <CustomizationReferenceLifestyleMedia
                            videoUrl={lifestyleVideoUrl}
                            imageSrc={lifestyleStill?.src}
                            imageAlt={
                                lifestyleStill?.alt || detail.title
                            }
                        />
                    ) : null}
                    {specsInRightColumn ? (
                        <CustomizationReferenceSpecsContent
                            detail={detail}
                            compareLabel={compareLabel}
                            heading="label"
                            // Clears the Benefits title so this label lines up with the why line.
                            className="lg:mt-[calc(42px*1.12+3rem)]"
                        />
                    ) : null}
                </div>
            </PageDielineSection>
        </div>
    );
}
