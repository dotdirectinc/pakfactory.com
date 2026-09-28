import type {PageSectionDoc} from '@pakfactory/sanity/queries';

/**
 * DOM id each body section renders with on the expertise stage page — the
 * registry's ids, except the ones the page overrides (`engagement-…`, `work-…`).
 * The hero's in-page link resolves its target through this, so the two can
 * never drift apart.
 */
const ANCHOR_PREFIX: Record<string, string> = {
    inspirationsGrid: 'work',
    mediaFeature: 'engagement',
    signatureSystem: 'signature-system',
    steps: 'steps',
    caseStudiesRow: 'case-studies',
    faqSection: 'section-faqs',
};

export function expertiseSectionAnchor(
    type: string,
    key: string,
): string | null {
    const prefix = ANCHOR_PREFIX[type];
    return prefix ? `${prefix}-${key}` : null;
}

/** `#id` of the first body section of `type`, or null when the page has none. */
export function expertiseSectionHref(
    sections: PageSectionDoc[],
    type: string,
): string | null {
    const section = sections.find((s) => s._type === type);
    if (!section?._key) return null;
    const id = expertiseSectionAnchor(type, section._key);
    return id ? `#${id}` : null;
}
