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
 * Left column stacks both blocks (separate scroll anchors); right column
 * sticky lifestyle video (else lifestyle primary image).
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

    return (
        <div className={cn(className)}>
            <PageDielineSection
                borderBottom
                innerClassName="py-16 sm:py-20"
            >
                <div
                    className={cn(
                        'grid gap-10 lg:items-start',
                        hasLifestyleMedia
                            ? 'lg:grid-cols-2'
                            : 'lg:grid-cols-1',
                    )}
                >
                    <div className="flex min-w-0 flex-col gap-16">
                        {showOverview ? (
                            <CustomizationReferenceBenefitsContent
                                detail={detail}
                            />
                        ) : null}
                        {showSpecs ? (
                            <CustomizationReferenceSpecsContent
                                detail={detail}
                                compareLabel={compareLabel}
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
                </div>
            </PageDielineSection>
        </div>
    );
}
