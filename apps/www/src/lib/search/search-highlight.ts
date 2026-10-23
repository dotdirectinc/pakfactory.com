/**
 * Which parts of a result title to bold for the typed query (client-side; the
 * API returns no highlights). Pure, so it is unit-tested directly.
 *
 * Words of 2+ characters match anywhere, as a prefix or inside a word. A
 * 1-character word (`1`, `&`, `x`) matches only where it stands alone, so
 * "box 1" bolds the "1" in "1 Color Print" but not in "COR-010", and a single
 * letter doesn't light up every word (PROD-3149).
 */

export type HighlightPart = {text: string; match: boolean};

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const standalone = (word: string) => `(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`;

export function highlightParts(text: string, query: string | undefined): HighlightPart[] {
    const words = [...new Set((query ?? '').split(' ').filter(Boolean))]
        // Longest first, so "10" wins over a standalone "1" at the same spot.
        .sort((a, b) => b.length - a.length)
        .map((w) => (w.length === 1 ? standalone(escapeRegExp(w)) : escapeRegExp(w)));
    if (!words.length) return [{text, match: false}];
    // One capturing group: split() puts the matches at the odd indexes.
    const parts = text.split(new RegExp(`(${words.join('|')})`, 'giu'));
    return parts
        .map((part, i) => ({text: part, match: i % 2 === 1}))
        .filter((part) => part.text);
}
