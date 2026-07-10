type DielineBorderDefaults = { top: boolean; bottom: boolean };

/** Legacy defaults for post-row full-bleed blocks (bottom border only). */
export const POST_ROW_DIELINE_BORDER_DEFAULTS: DielineBorderDefaults = {
  top: false,
  bottom: true,
};

/** Legacy defaults for newsletter CTA (top border only). */
export const NEWSLETTER_DIELINE_BORDER_DEFAULTS: DielineBorderDefaults = {
  top: true,
  bottom: false,
};

/** Defaults for the RFQ CTA (no dashed edges unless explicitly enabled). */
export const CTA_RFQ_DIELINE_BORDER_DEFAULTS: DielineBorderDefaults = {
  top: false,
  bottom: false,
};

/** Defaults for the promo banner (both edges on; matches Studio initialValue). */
export const PROMO_BANNER_DIELINE_BORDER_DEFAULTS: DielineBorderDefaults = {
  top: true,
  bottom: true,
};


/** Defaults for the spotlight CTA (no dashed edges unless explicitly enabled). */
export const CTA_SPOTLIGHT_DIELINE_BORDER_DEFAULTS: DielineBorderDefaults = {
  top: false,
  bottom: false,
};

export function resolveDielineBorders(
  showTopBorder: boolean | undefined,
  showBottomBorder: boolean | undefined,
  defaults: DielineBorderDefaults,
) {
  return {
    borderTop: showTopBorder ?? defaults.top,
    borderBottom: showBottomBorder ?? defaults.bottom,
  };
}
