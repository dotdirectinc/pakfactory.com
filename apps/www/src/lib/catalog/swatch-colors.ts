/**
 * Maps Sanity propertyValue.slug → design-system CSS var.
 * Hex lives in @pakfactory/ui/globals.css (--swatch-*). Image still wins in the mapper.
 * Short slugs (e.g. `black`) alias the `color-*` keys used in older content.
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
    white: 'var(--swatch-white)',
    black: 'var(--swatch-black)',
    brown: 'var(--swatch-brown)',
    gold: 'var(--swatch-gold)',
    silver: 'var(--swatch-silver)',
    copper: 'var(--swatch-copper)',
    blue: 'var(--swatch-blue)',
    pink: 'var(--swatch-pink)',
};

/** Sanity propertyValue slug for the Custom Color wheel swatch. */
export const CUSTOM_COLOR_SLUG = 'custom-color';

export function swatchColorForSlug(slug: string): string | undefined {
    return SWATCH_COLORS[slug];
}

export function isCustomColorSlug(slug: string): boolean {
    return slug === CUSTOM_COLOR_SLUG;
}
