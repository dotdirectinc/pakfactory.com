/**
 * Plain-word definitions for compare rows (vault prd-website-compare.md §5.3, CMP-10, Guided).
 * Interim text in code — to move to one Sanity glossary shared with the spec pages (spec §5.3).
 * Matched by row label, lower-case, by prefix ("structural feature" covers "Structural features").
 */
const GLOSSARY: [string, string][] = [
    ['best for', 'What buyers usually use it for'],
    ['style', 'How the box is built'],
    ['shape', 'The box’s footprint'],
    ['closure', 'How the box stays shut'],
    ['how it opens', 'What your customer does to open it'],
    ['ships flat', 'Folds flat for shipping and storage, which lowers freight'],
    ['structural feature', 'The detail that sets this style apart'],
    ['performance', 'How well it protects what’s inside'],
    ['sustainability', 'Board certification or recycled content'],
    ['pre-selected customizations', 'Options this design already has picked'],
];

export function defineRow(label: string): string | undefined {
    const l = label.trim().toLowerCase();
    return GLOSSARY.find(([k]) => l === k || l.startsWith(k))?.[1];
}

/** Product rows shown in Guided's Essentials view (CMP-10); the rest are in All specs. */
const PRODUCT_ESSENTIALS = ['best for', 'style', 'closure', 'how it opens', 'ships flat', 'sustainability'];

export function isEssentialRow(type: 'products' | 'customizations', label: string, index: number): boolean {
    if (type === 'customizations') return index < 3;
    const l = label.trim().toLowerCase();
    return PRODUCT_ESSENTIALS.some((k) => l === k || l.startsWith(k));
}
