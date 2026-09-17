import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    CustomizationShowcaseGallery,
    type ShowcaseGalleryImage,
} from '@/components/customization/customization-showcase-gallery';
import type {CustomizationDetail} from '@/lib/catalog/types';

export const CUSTOMIZATION_SHOWCASE_ID = 'customization-showcase';

type CustomizationShowcaseProps = {
    detail: CustomizationDetail;
    className?: string;
};

function mediaToShowcaseImages(
    detail: CustomizationDetail,
): ShowcaseGalleryImage[] {
    return detail.media
        .filter((item) => Boolean(item.src?.trim() || item.alt?.trim()))
        .map((item, index) => ({
            ...(item.src?.trim() ? {src: item.src.trim()} : {}),
            alt: item.alt?.trim() || `${detail.title} showcase ${index + 1}`,
        }));
}

/**
 * Showcase — See it in use (PROD-1299 Slice H).
 * POC MaterialShowcaseGallery bento; pads to 6 muted tiles when media is sparse.
 */
export function CustomizationShowcase({
    detail,
    className,
}: CustomizationShowcaseProps) {
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
                    images={mediaToShowcaseImages(detail)}
                />
            </PageDielineSection>
        </section>
    );
}
