import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CustomizationCompatibleOptionsGrid} from '@/components/customization/customization-compatible-options-grid';
import {CUSTOMIZATION_COMPATIBLE_OPTIONS_ID} from '@/components/customization/customization-compatible-options-id';
import {SectionHeading} from '@/components/ui/section-heading';
import type {CustomizationDetail} from '@/lib/catalog/types';
import {sectionThemeShell} from '@/lib/ui/section-theme';

export {CUSTOMIZATION_COMPATIBLE_OPTIONS_ID, hasCompatibleOptions} from '@/components/customization/customization-compatible-options-id';

type CustomizationCompatibleOptionsHeading = {
    eyebrow?: string;
    title?: string;
    description?: string;
};

type CustomizationCompatibleOptionsProps = {
    detail: CustomizationDetail;
    className?: string;
    heading?: CustomizationCompatibleOptionsHeading;
};

/**
 * Compatible customizations band (PROD-3124).
 * Other options specified together with this one via both-direction
 * `compatibleCustomizations`. Hidden when the list is empty.
 */
export function CustomizationCompatibleOptions({
    detail,
    className,
    heading,
}: CustomizationCompatibleOptionsProps) {
    const options = detail.compatibleOptions ?? [];
    if (options.length === 0) return null;

    const displayName = detail.title.trim() || 'this option';
    const shell = sectionThemeShell('muted');

    return (
        <section
            id={CUSTOMIZATION_COMPATIBLE_OPTIONS_ID}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                borderBottom
                innerClassName="py-16 sm:py-20"
            >
                <SectionHeading
                    eyebrow={heading?.eyebrow ?? 'Compatible customizations'}
                    title={heading?.title ?? 'What it works with'}
                    description={
                        heading?.description ??
                        `Other options specified together with ${displayName}.`
                    }
                />
                <CustomizationCompatibleOptionsGrid options={options} />
            </PageDielineSection>
        </section>
    );
}
