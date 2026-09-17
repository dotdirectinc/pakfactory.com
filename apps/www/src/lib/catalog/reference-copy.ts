/**
 * Category-method copy for the Material Reference band (PROD-1299).
 */

export type ReferenceCopy = {
    eyebrow: string;
    title: string;
    description: string;
    noun: string;
    compareLabel: string;
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

function singularLabel(label: string): string {
    const trimmed = label.trim();
    if (!trimmed) return 'option';
    if (/ies$/i.test(trimmed)) return trimmed.replace(/ies$/i, 'y').toLowerCase();
    if (/s$/i.test(trimmed) && !/ss$/i.test(trimmed)) {
        return trimmed.slice(0, -1).toLowerCase();
    }
    return trimmed.toLowerCase();
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
