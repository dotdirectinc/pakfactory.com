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

/** Defaults for the spotlight CTA (match Studio dielineBorderFields initialValue). */
export const CTA_SPOTLIGHT_DIELINE_BORDER_DEFAULTS: DielineBorderDefaults = {
  top: true,
  bottom: true,
};

/**
 * Defaults for footer CTA — Text and Button (top on, bottom off).
 * Matches the previous hardcoded footer CTA; columns already draw their own top edge.
 */
export const FOOTER_CTA_DIELINE_BORDER_DEFAULTS: DielineBorderDefaults = {
  top: true,
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
