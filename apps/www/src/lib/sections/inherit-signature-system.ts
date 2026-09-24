import type {
    ExpertiseServiceDimensionDoc,
    PageSectionDoc,
    PageSectionSignatureSystemDoc,
} from '@pakfactory/sanity/queries';

import {shouldInheritSectionList} from '@/lib/sections/merge-solution-sections';

/**
 * Fill empty `signatureSystem.services` from the host's services (e.g.
 * `expertiseStage.services`) when listSource allows — ADR-020 §8, same rule as
 * {@link applyFaqInherit}. Custom + empty stays empty.
 */
export function applySignatureSystemInherit(
    sections: PageSectionDoc[],
    hostServices?: ExpertiseServiceDimensionDoc[] | null,
): PageSectionDoc[] {
    const fallback = (hostServices ?? []).filter((item) =>
        Boolean(item?.title?.trim()),
    );
    if (fallback.length === 0) return sections;

    return sections.map((section) => {
        if (section._type !== 'signatureSystem') return section;
        const row = section as PageSectionSignatureSystemDoc;
        const services = row.services ?? [];
        if (!shouldInheritSectionList(row.listSource, services)) return section;
        return {...row, services: fallback};
    });
}
