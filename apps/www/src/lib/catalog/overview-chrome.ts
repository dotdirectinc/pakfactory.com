/**
 * Overview rail chrome on CDP templates (PROD-3126 / PROD-3127 / PROD-3128).
 * Unset CTA / Bookmark read as shown; unset configuration source is properties.
 * Studio Show CTA / Bookmark / Configuration are the source of truth.
 */

export type ConfigurationSource = 'properties' | 'achieves' | 'none';

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

function resolveConfigurationSource(
    value: unknown,
): ConfigurationSource {
    if (value === 'achieves') return 'achieves';
    if (value === 'none') return 'none';
    return 'properties';
}

export function resolveOverviewChrome(section: unknown): OverviewChrome {
    const fields = readChrome(section);
    return {
        showCta: fields.showCta !== false,
        showBookmark: fields.showBookmark !== false,
        configurationSource: resolveConfigurationSource(
            fields.configurationSource,
        ),
    };
}
