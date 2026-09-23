import type {
    PageSectionCaseStudiesRowDoc,
    PageSectionCaseStudyItemDoc,
    PageSectionDoc,
    PageSectionFaqDoc,
    PageSectionFaqSectionDoc,
    PageSectionInspirationsCardDoc,
    PageSectionInspirationsGridDoc,
    PageSectionVideoCaseStudiesRowDoc,
    PageSectionVideoCaseStudyCardDoc,
} from '@pakfactory/sanity/queries';

/** Section chrome owned by the template (order + defaults). */
const TEMPLATE_CHROME_KEYS = new Set([
    'heading',
    'intro',
    'align',
    'showTopBorder',
    'showBottomBorder',
    'link',
]);

function isNonEmptyContent(value: unknown): boolean {
    if (value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

/**
 * Merge template section order/chrome with per-solution band content.
 * Template wins on chrome; solution wins on content fields when non-empty.
 * Match by `_key`, else first unused section of the same `_type`.
 *
 * After merge: empty case studies / video case studies / FAQs / inspirations
 * inherit from document defaults (section override wins). ADR-020 §8.
 */
export function mergeSolutionSections(
    templateSections: PageSectionDoc[] | null | undefined,
    contentSections: PageSectionDoc[] | null | undefined,
    relatedCaseStudies?: PageSectionCaseStudyItemDoc[] | null,
    documentFaqs?: PageSectionFaqDoc[] | null,
    relatedSolutionStyles?: PageSectionInspirationsCardDoc[] | null,
    relatedVideoCaseStudies?: PageSectionVideoCaseStudyCardDoc[] | null,
): PageSectionDoc[] {
    const template = (templateSections ?? []).filter(
        (section): section is PageSectionDoc =>
            Boolean(section?._key && section?._type),
    );
    if (template.length === 0) return [];

    const content = (contentSections ?? []).filter(
        (section): section is PageSectionDoc =>
            Boolean(section?._key && section?._type),
    );
    const usedContentKeys = new Set<string>();

    const merged = template.map((slot) => {
        const byKey = content.find(
            (section) =>
                section._key === slot._key && !usedContentKeys.has(section._key),
        );
        const byType =
            byKey ??
            content.find(
                (section) =>
                    section._type === slot._type &&
                    !usedContentKeys.has(section._key),
            );
        if (byType) usedContentKeys.add(byType._key);

        return mergeOneSection(slot, byType ?? null);
    });

    return applyVideoCaseStudiesInherit(
        applyInspirationsInherit(
            applyFaqInherit(
                applyCaseStudyInherit(merged, relatedCaseStudies),
                documentFaqs,
            ),
            relatedSolutionStyles,
        ),
        relatedVideoCaseStudies,
    );
}

function mergeOneSection(
    template: PageSectionDoc,
    content: PageSectionDoc | null,
): PageSectionDoc {
    if (!content) return template;

    const next: Record<string, unknown> = {...template};
    for (const [key, value] of Object.entries(content)) {
        if (key === '_key' || key === '_type') continue;
        if (TEMPLATE_CHROME_KEYS.has(key)) continue;
        if (!isNonEmptyContent(value)) continue;
        next[key] = value;
    }
    next._key = template._key;
    next._type = template._type;
    return next as PageSectionDoc;
}

function applyCaseStudyInherit(
    sections: PageSectionDoc[],
    relatedCaseStudies?: PageSectionCaseStudyItemDoc[] | null,
): PageSectionDoc[] {
    const fallback = (relatedCaseStudies ?? []).filter(
        (item): item is PageSectionCaseStudyItemDoc =>
            Boolean(item?.title?.trim() && item?.slug?.trim()),
    );
    if (fallback.length === 0) return sections;

    return sections.map((section) => {
        if (section._type !== 'caseStudiesRow') return section;
        const row = section as PageSectionCaseStudiesRowDoc;
        const items = row.items ?? [];
        if (items.length > 0) return section;
        return {...row, items: fallback};
    });
}

/**
 * Fill empty `faqSection.faqs` from document-level `solution.faqs`.
 * Section refs win when non-empty (override).
 */
export function applyFaqInherit(
    sections: PageSectionDoc[],
    documentFaqs?: PageSectionFaqDoc[] | null,
): PageSectionDoc[] {
    const fallback = (documentFaqs ?? []).filter(
        (item): item is PageSectionFaqDoc =>
            Boolean(item?.question?.trim() && item?.answerPlain?.trim()),
    );
    if (fallback.length === 0) return sections;

    return sections.map((section) => {
        if (section._type !== 'faqSection') return section;
        const row = section as PageSectionFaqSectionDoc;
        const faqs = row.faqs ?? [];
        if (faqs.length > 0) return section;
        return {...row, faqs: fallback};
    });
}

/**
 * Fill empty `inspirationsGrid.cards` from related `solutionStyle` children.
 * Section cards win when non-empty (override). ADR-020 §8.
 */
export function applyInspirationsInherit(
    sections: PageSectionDoc[],
    relatedSolutionStyles?: PageSectionInspirationsCardDoc[] | null,
): PageSectionDoc[] {
    const fallback = (relatedSolutionStyles ?? []).filter(
        (item): item is PageSectionInspirationsCardDoc =>
            Boolean(
                item?.title?.trim() &&
                    item?.imageSrc?.trim() &&
                    item?.slug?.trim() &&
                    item?.solutionSlug?.trim(),
            ),
    );
    if (fallback.length === 0) return sections;

    return sections.map((section) => {
        if (section._type !== 'inspirationsGrid') return section;
        const row = section as PageSectionInspirationsGridDoc;
        const cards = row.cards ?? [];
        if (cards.length > 0) return section;
        return {...row, cards: fallback};
    });
}

/**
 * Fill empty `videoCaseStudiesRow.cards` from document `relatedCaseStudies`
 * (video-shaped projection). Section cards win when non-empty. ADR-020 §8.
 */
export function applyVideoCaseStudiesInherit(
    sections: PageSectionDoc[],
    relatedVideoCaseStudies?: PageSectionVideoCaseStudyCardDoc[] | null,
): PageSectionDoc[] {
    const fallback = (relatedVideoCaseStudies ?? []).filter(
        (item): item is PageSectionVideoCaseStudyCardDoc =>
            Boolean(
                item?.title?.trim() &&
                    (item?.brand?.trim() || item?.title?.trim()) &&
                    item?.imageSrc?.trim() &&
                    item?.slug?.trim(),
            ),
    );
    if (fallback.length === 0) return sections;

    return sections.map((section) => {
        if (section._type !== 'videoCaseStudiesRow') return section;
        const row = section as PageSectionVideoCaseStudiesRowDoc;
        const cards = row.cards ?? [];
        if (cards.length > 0) return section;
        return {...row, cards: fallback};
    });
}
