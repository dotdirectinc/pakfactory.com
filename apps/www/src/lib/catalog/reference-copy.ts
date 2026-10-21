/**
 * Category-method copy for the Material Reference band (PROD-1299).
 * Learn-first CDP section label defaults (PROD-3112) when Studio chrome is empty.
 */

import type {CustomizationDetail} from '@/lib/catalog/types';

export type ReferenceCopy = {
    eyebrow: string;
    title: string;
    description: string;
    noun: string;
    compareLabel: string;
};

/** Section heading props shared by compare / works-with / showcase. */
export type LearnFirstSectionCopy = {
    eyebrow: string;
    title: string;
    description: string;
    /** Anchor-nav label (shorter than the section title when needed). */
    navLabel: string;
};

const CATEGORY_NOUN: Record<string, string> = {
    materials: 'material',
    finishing: 'finish',
    printing: 'print method',
    'additional-customization': 'customization',
};

const CATEGORY_EYEBROW: Record<string, string> = {
    materials: 'Material Reference',
    finishing: 'Finish Reference',
    printing: 'Print Reference',
    'additional-customization': 'Customization Reference',
};

/** Plural peer noun when the option has no type title. */
const COMPARE_PEER_NOUN: Record<string, string> = {
    materials: 'materials',
    finishing: 'finishes',
};

function singularLabel(label: string): string {
    const trimmed = label.trim();
    if (!trimmed) return 'option';
    if (/ies$/i.test(trimmed)) return trimmed.replace(/ies$/i, 'y').toLowerCase();
    if (/s$/i.test(trimmed) && !/ss$/i.test(trimmed)) {
        return trimmed.slice(0, -1).toLowerCase();
    }
    return trimmed.toLowerCase();
}

function pluralizeLabel(label: string): string {
    const trimmed = label.trim().toLowerCase();
    if (!trimmed) return 'options';
    if (/s$/i.test(trimmed)) return trimmed;
    return `${trimmed}s`;
}

function comparePeerNoun(categoryValue: string, typeTitle?: string): string {
    const type = typeTitle?.trim();
    if (type) return pluralizeLabel(type);
    const key = categoryValue.trim().toLowerCase();
    return COMPARE_PEER_NOUN[key] ?? 'options';
}

export function getReferenceCopy(
    categoryValue: string,
    categoryLabel: string,
): ReferenceCopy {
    const key = categoryValue.trim().toLowerCase();
    const noun =
        CATEGORY_NOUN[key] ?? singularLabel(categoryLabel || categoryValue);
    const eyebrow =
        CATEGORY_EYEBROW[key] ??
        `${categoryLabel.trim() || categoryValue} Reference`;

    return {
        eyebrow,
        title: `Understand this ${noun}`,
        description: `What this ${noun} is made of and how it rates for the jobs it's used for — so you can judge fit before you configure.`,
        noun,
        compareLabel: `Compare with other ${
            key === 'materials'
                ? 'materials'
                : key === 'finishing'
                  ? 'finishes'
                  : `${noun}s`
        }`,
    };
}

/**
 * Default labels for learn-first CDP bands when the template section leaves
 * eyebrow / heading / intro empty (PROD-3112).
 */
export function getLearnFirstSectionCopy(
    detail: Pick<
        CustomizationDetail,
        'title' | 'categoryValue' | 'categoryLabel' | 'typeTitle'
    >,
): {
    overview: LearnFirstSectionCopy;
    specsLabel: string;
    compare: LearnFirstSectionCopy;
    worksWith: LearnFirstSectionCopy;
    compatibleOptions: LearnFirstSectionCopy;
    showcase: LearnFirstSectionCopy;
} {
    const categoryLabel =
        detail.categoryLabel.trim() || detail.categoryValue.trim() || 'options';
    const title = detail.title.trim() || 'this option';
    const peers = comparePeerNoun(detail.categoryValue, detail.typeTitle);
    const selectionHint =
        'Apply carries your selection straight into the product.';

    return {
        overview: {
            eyebrow: 'Overview',
            title: `Get to know ${title}`,
            description: '',
            navLabel: 'Overview',
        },
        specsLabel: 'Key properties',
        compare: {
            eyebrow: `Same category · ${categoryLabel}`,
            title: `Compare with other ${categoryLabel} options`,
            description: `How ${title} stacks up against the other ${peers} in this category — so you can choose the right option, not just this one.`,
            navLabel: 'Compare',
        },
        worksWith: {
            eyebrow: 'Works on these product styles',
            title: 'Apply it on different product styles',
            description: `The styles this option works on. ${selectionHint}`,
            navLabel: 'Product styles',
        },
        compatibleOptions: {
            eyebrow: 'Compatible customizations',
            title: 'What it works with',
            description: `Other options specified together with ${title}.`,
            navLabel: 'Compatible options',
        },
        showcase: {
            eyebrow: 'Get inspired',
            title: 'See it in action',
            description: `Real packaging using ${title} — so you can picture the finish on a finished product before you apply it.`,
            navLabel: 'Inspiration',
        },
    };
}
