/**
 * Locked PDP UI copy (PROD-3099 / PDP-copy.md, 2026-10-15).
 * Request-wizard strings stay in {@link REQUEST_COPY} — this module is for the
 * product detail page (and the sticky configuration bar on that page).
 */

import {
    AXIS_LABEL,
    type DimensionAxis,
} from '@pakfactory/sanity/dimension-inputs';

export const PRODUCT_DETAIL_COPY = {
    // 1.1 Quantity
    quantityHelper:
        'Add more than one quantity, and your quote will include pricing for each.',
    quantityPlaceholder: 'Select one or more quantities',
    /** `{moq}` = formatted minimum order quantity. */
    quantityHint: 'Minimum {moq} units, in multiples of 100.',
    quantityHintNoMoq: 'Quantities are in multiples of 100.',
    customQuantityPlaceholder: 'Enter a custom quantity',
    /** `{moq}` = formatted minimum order quantity. */
    quantityBelowMoqError: 'Enter {moq} units or more.',
    quantityIncrementError: 'Enter a quantity in multiples of 100.',

    // 1.2 Contents
    contentsLabel: 'What are you packaging?',
    contentsHelp:
        'Size, weight, and count per package help us quote accurately.',
    contentsPlaceholder: 'e.g. 3 glass jars, 8oz each',
    /** Sticky bar chip when contents is missing. */
    contentsChip: 'What you’re packaging',

    // 1.3 Notes / images
    additionalNotesOrImages: 'Add notes or reference images?',
    additionalNotesLabel: 'Notes',
    additionalNotesPlaceholder:
        'Any special requirements? e.g. FSC-certified, freezer or microwave use, rough shipping…',
    addImagesLabel: 'Reference images',
    referenceImagesHelp:
        'Your product, artwork, or packaging references you like.',

    // 1.4 Customization entry
    specialistCanPropose:
        'A specialist will recommend the right specs for your product.',
    /** Summary group title — rendered uppercase as OPTIONS. */
    materialFinishGroup: 'Options',
    revertToSpecialist: 'Clear my choices and let a specialist advise',

    // 1.5 Request button
    addToRequest: 'Add to Quote Request',
    addToRequestDisabledHelp:
        'Select at least one quantity and tell us what you’re packaging to continue.',
    addToRequestEnabledHelp:
        'Adds to your request — keep browsing and create your request later.',

    // Section 2 — Specifications
    specsHeading: 'Built into this design',
    specsDescription:
        'These features are fixed for this packaging. Dimensions, materials, printing, and finishing are yours to customize.',

    // Section 3 — Customization options showcase
    customizationsEyebrow: 'Customization options',
    customizationsHeading: 'What’s possible for this packaging',
    customizationsDescription:
        'Explore every option available for this packaging, and select the ones that suit your product to add them to your customization.',
    selectThisOption: 'Select this option',

    // Section 5 — Reviews aggregate (PDP band only)
    googleRatingLabel: 'Google rating',
} as const;

/** Replace `{moq}` in a PDP quantity string with a formatted number. */
export function withMoq(template: string, moq: number): string {
    return template.replace('{moq}', moq.toLocaleString('en-US'));
}

/**
 * Full-word axis list for the dimensions detail helper, e.g.
 * "length, width, and height" or "diameter and height".
 */
export function formatDimensionInputList(
    axisIds: readonly string[],
): string {
    const words = axisIds
        .filter((id): id is DimensionAxis => id in AXIS_LABEL)
        .map((id) => AXIS_LABEL[id].toLowerCase());
    if (words.length === 0) return '';
    if (words.length === 1) return words[0]!;
    if (words.length === 2) return `${words[0]} and ${words[1]}`;
    return `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`;
}

/** Locked detail-panel helper: “Enter length, width, and height.” */
export function enterDimensionInputCopy(
    axisIds: readonly string[],
): string {
    const list = formatDimensionInputList(axisIds);
    return list ? `Enter ${list}.` : 'Enter measurements.';
}
