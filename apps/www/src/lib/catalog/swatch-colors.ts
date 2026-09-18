/**
 * Maps Sanity propertyValue.slug → design-system CSS var.
 * Hex lives in @pakfactory/ui/globals.css (--swatch-*). Image still wins in the mapper.
 */
export const SWATCH_COLORS: Record<string, string> = {
    'color-white': 'var(--swatch-white)',
    'color-black': 'var(--swatch-black)',
    'color-brown': 'var(--swatch-brown)',
    'color-gold': 'var(--swatch-gold)',
    'color-silver': 'var(--swatch-silver)',
    'color-copper': 'var(--swatch-copper)',
    'color-blue': 'var(--swatch-blue)',
    'color-pink': 'var(--swatch-pink)',
};

export function swatchColorForSlug(slug: string): string | undefined {
    return SWATCH_COLORS[slug];
}
