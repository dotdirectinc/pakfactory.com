import {t} from '@/lib/i18n/messages';

/**
 * Stable content-kind ids for eyebrows / CTAs across www (Finder, catalogs, …).
 * Display strings live in `messages/en.json` — never hardcode labels here.
 */
export const KIND = {
    productLine: 'productLine',
    inspiration: 'inspiration',
    productStyle: 'productStyle',
    industry: 'industry',
    customization: 'customization',
    expertise: 'expertise',
    caseStudy: 'caseStudy',
    related: 'related',
} as const;

export type Kind = (typeof KIND)[keyof typeof KIND];

const KIND_SET = new Set<string>(Object.values(KIND));

function isKind(value: string): value is Kind {
    return KIND_SET.has(value);
}

/**
 * Resolve a Kind from Sanity `_type`, optional product `kind`, or a known bucket.
 * Product docs with `kind === 'inspiration'` win over a product-line bucket.
 */
export function resolveKind(input: {
    docType?: string | null;
    productKind?: string | null;
    bucket?: Kind;
}): Kind {
    const productKind = input.productKind?.trim().toLowerCase();
    if (productKind === 'inspiration') return KIND.inspiration;

    const docType = input.docType?.trim();
    switch (docType) {
        case 'product':
            return KIND.productLine;
        case 'productLine':
            return KIND.productLine;
        case 'productStyle':
            return KIND.productStyle;
        case 'solution':
            return KIND.industry;
        case 'customizationType':
            return KIND.customization;
        case 'expertiseStage':
            return KIND.expertise;
        case 'caseStudy':
            return KIND.caseStudy;
        default:
            break;
    }

    if (input.bucket && isKind(input.bucket)) return input.bucket;
    return KIND.productLine;
}

export function kindLabel(kind: Kind): string {
    return t(`kind.${kind}`);
}

export function kindCta(kind: Kind): string {
    return t(`cta.${kind}`);
}
