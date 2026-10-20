'use client';

import type {PageSectionCustomizationDetailDoc} from '@pakfactory/sanity/queries';
import {CustomizationComparison} from '@/components/customization/customization-comparison';
import {useCustomizationDetailHostOptional} from '@/components/customization/customization-detail-host';
import {CustomizationOverviewLearnFirst} from '@/components/customization/customization-overview-learn-first';
import {CustomizationOverviewStandard} from '@/components/customization/customization-overview-standard';
import {CustomizationReferenceBenefitsSpecs} from '@/components/customization/customization-reference-benefits-specs';
import {CustomizationReferenceWorksWith} from '@/components/customization/customization-reference-works-with';
import {CustomizationShowcase} from '@/components/customization/customization-showcase';
import {
    getLearnFirstSectionCopy,
    getReferenceCopy,
} from '@/lib/catalog/reference-copy';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';

/**
 * CDP template section wrappers (PROD-3112). Require
 * {@link CustomizationDetailHostProvider}; return null when used off-host.
 */

function useHost() {
    return useCustomizationDetailHostOptional();
}

export function CustomizationOverviewStandardFromSanity(
    section: PageSectionCustomizationDetailDoc,
) {
    const host = useHost();
    if (!host) return null;
    const chrome = mapSectionChrome(section);
    return (
        <CustomizationOverviewStandard
            paddingBlock={chrome.paddingBlock}
            borderTop={chrome.borderTop}
            borderBottom={chrome.borderBottom}
        />
    );
}

export function CustomizationOverviewLearnFirstFromSanity(
    section: PageSectionCustomizationDetailDoc,
) {
    const host = useHost();
    if (!host) return null;
    const chrome = mapSectionChrome(section);
    return (
        <CustomizationOverviewLearnFirst
            paddingBlock={chrome.paddingBlock}
            borderTop={chrome.borderTop}
            borderBottom={chrome.borderBottom}
        />
    );
}

export function CustomizationBenefitsSpecsFromSanity(
    section: PageSectionCustomizationDetailDoc,
) {
    const host = useHost();
    if (!host) return null;
    const {detail, isLearnFirstTemplate} = host;
    const categoryLabel = detail.categoryLabel || detail.categoryValue;
    const reference = getReferenceCopy(detail.categoryValue, categoryLabel);
    void section;
    return (
        <CustomizationReferenceBenefitsSpecs
            detail={detail}
            compareLabel={reference.compareLabel}
            copyVariant={isLearnFirstTemplate ? 'learnFirst' : 'standard'}
        />
    );
}

export function CustomizationWorksWithFromSanity(
    section: PageSectionCustomizationDetailDoc,
) {
    const host = useHost();
    if (!host) return null;
    const {detail, worksWith, isLearnFirstTemplate} = host;
    const defaults = isLearnFirstTemplate
        ? getLearnFirstSectionCopy(detail).worksWith
        : null;
    const heading = {
        eyebrow: section.eyebrow?.trim() || defaults?.eyebrow,
        title: section.heading?.trim() || defaults?.title,
        description: section.intro?.trim() || defaults?.description,
    };
    return (
        <CustomizationReferenceWorksWith
            option={worksWith.option}
            lines={worksWith.lines}
            products={worksWith.products}
            heading={
                heading.eyebrow || heading.title || heading.description
                    ? {
                          ...(heading.eyebrow
                              ? {eyebrow: heading.eyebrow}
                              : {}),
                          ...(heading.title ? {title: heading.title} : {}),
                          ...(heading.description
                              ? {description: heading.description}
                              : {}),
                      }
                    : undefined
            }
        />
    );
}

export function CustomizationCompareFromSanity(
    section: PageSectionCustomizationDetailDoc,
) {
    const host = useHost();
    if (!host) return null;
    const {detail, peers, isLearnFirstTemplate} = host;
    const defaults = isLearnFirstTemplate
        ? getLearnFirstSectionCopy(detail).compare
        : null;
    const heading = {
        eyebrow: section.eyebrow?.trim() || defaults?.eyebrow,
        title: section.heading?.trim() || defaults?.title,
        description: section.intro?.trim() || defaults?.description,
    };
    return (
        <CustomizationComparison
            detail={detail}
            peers={peers}
            heading={
                heading.eyebrow || heading.title || heading.description
                    ? {
                          ...(heading.eyebrow
                              ? {eyebrow: heading.eyebrow}
                              : {}),
                          ...(heading.title ? {title: heading.title} : {}),
                          ...(heading.description
                              ? {description: heading.description}
                              : {}),
                      }
                    : undefined
            }
        />
    );
}

export function CustomizationShowcaseFromSanity(
    section: PageSectionCustomizationDetailDoc,
) {
    const host = useHost();
    if (!host) return null;
    const {detail, isLearnFirstTemplate} = host;
    const defaults = isLearnFirstTemplate
        ? getLearnFirstSectionCopy(detail).showcase
        : null;
    const heading = {
        eyebrow: section.eyebrow?.trim() || defaults?.eyebrow,
        title: section.heading?.trim() || defaults?.title,
        description: section.intro?.trim() || defaults?.description,
    };
    return (
        <CustomizationShowcase
            detail={detail}
            heading={
                heading.eyebrow || heading.title || heading.description
                    ? {
                          ...(heading.eyebrow
                              ? {eyebrow: heading.eyebrow}
                              : {}),
                          ...(heading.title ? {title: heading.title} : {}),
                          ...(heading.description
                              ? {description: heading.description}
                              : {}),
                      }
                    : undefined
            }
        />
    );
}
