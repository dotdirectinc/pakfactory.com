/**
 * Overview rail chrome on CDP templates (PROD-3126 / PROD-3127 / PROD-3128).
 * Unset CTA / Bookmark read as shown; unset configuration source is properties.
 */

export type ConfigurationSource = 'properties' | 'achieves';

export type OverviewChrome = {
    showCta: boolean;
    showBookmark: boolean;
    configurationSource: ConfigurationSource;
};

export const DEFAULT_OVERVIEW_CHROME: OverviewChrome = {
    showCta: true,
    showBookmark: true,
    configurationSource: 'properties',
};

function readChrome(section: unknown): {
    showCta?: unknown;
    showBookmark?: unknown;
    configurationSource?: unknown;
} {
    if (!section || typeof section !== 'object') return {};
    return section as {
        showCta?: unknown;
        showBookmark?: unknown;
        configurationSource?: unknown;
    };
}

export function resolveOverviewChrome(section: unknown): OverviewChrome {
    const fields = readChrome(section);
    return {
        showCta: fields.showCta !== false,
        showBookmark: fields.showBookmark !== false,
        configurationSource:
            fields.configurationSource === 'achieves'
                ? 'achieves'
                : 'properties',
    };
}
