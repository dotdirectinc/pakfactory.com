type DielineBorderDefaults = {top: boolean; bottom: boolean};

/**
 * Defaults matching current www section bands (bottom dash on, top off)
 * so unset CMS fields look unchanged.
 */
export const SECTION_DIELINE_BORDER_DEFAULTS: DielineBorderDefaults = {
    top: false,
    bottom: true,
};

export function resolveDielineBorders(
    showTopBorder: boolean | undefined | null,
    showBottomBorder: boolean | undefined | null,
    defaults: DielineBorderDefaults = SECTION_DIELINE_BORDER_DEFAULTS,
) {
    return {
        borderTop: showTopBorder ?? defaults.top,
        borderBottom: showBottomBorder ?? defaults.bottom,
    };
}
