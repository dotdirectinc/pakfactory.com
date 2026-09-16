/**
 * Section color bands (Shopify-like schemes) — not app dark/light mode.
 *
 * Roles inside a themed section:
 * - **band** — full-bleed section background
 * - **elevated** — cards/tiles above the band (white chrome, no hover→muted
 *   washout; media placeholders use `bg-background` via card `surface`)
 * - **text** / **chrome** — stay on semantic tokens until an inverse band exists
 *
 * Extend with `'cream'` when www needs brand-cream bands.
 */

export type SectionTheme = 'default' | 'muted';

/** Card / tile surface relative to the section band. */
export type SectionCardSurface = 'default' | 'elevated';

const BAND_CLASS: Record<SectionTheme, string> = {
    default: 'bg-background',
    muted: 'bg-muted',
};

/** Elevated surface on muted: stay white; suppress hover→muted washout. */
const ELEVATED_ON_MUTED =
    'bg-background hover:bg-background focus-within:bg-background';

export function sectionThemeBandClass(theme: SectionTheme): string {
    return BAND_CLASS[theme];
}

export function sectionThemeElevatedClass(
    theme: SectionTheme,
): string | undefined {
    return theme === 'muted' ? ELEVATED_ON_MUTED : undefined;
}

export function sectionThemeDataAttr(theme: SectionTheme): {
    'data-section-theme': SectionTheme;
} {
    return {'data-section-theme': theme};
}

export function sectionThemeShell(theme: SectionTheme) {
    return {
        ...sectionThemeDataAttr(theme),
        bandClass: sectionThemeBandClass(theme),
        elevatedClass: sectionThemeElevatedClass(theme),
        /** Pass to cards: elevated when muted */
        cardSurface: (theme === 'muted'
            ? 'elevated'
            : 'default') as SectionCardSurface,
    };
}
