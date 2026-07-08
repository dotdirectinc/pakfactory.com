import { PromoBanner as PromoBannerCard } from "@/components/modules/promo-banner";
import type { PromoBannerBlock, BlockProps } from "@/components/blocks/registry";
import { PageDielineFullBleedSection } from "@/components/layout/page-dieline-section";
import {
  PROMO_BANNER_DIELINE_BORDER_DEFAULTS,
  resolveDielineBorders,
} from "@/lib/dieline-borders";

/**
 * `promoBanner` page-builder block — green full-width promo card.
 * Reuses the shared PromoBanner module for consistent rendering.
 */
export function PromoBanner({
  heading,
  body,
  ctaLabel,
  ctaUrl,
  images,
  showTopBorder,
  showBottomBorder,
}: BlockProps<PromoBannerBlock>) {
  const { borderTop, borderBottom } = resolveDielineBorders(
    showTopBorder,
    showBottomBorder,
    PROMO_BANNER_DIELINE_BORDER_DEFAULTS,
  );

  return (
    <PageDielineFullBleedSection
      sectionClassName="bg-background"
      borderTop={borderTop}
      borderBottom={borderBottom}
      innerClassName="py-8"
    >
      <PromoBannerCard
        promo={{ heading, body, ctaLabel, ctaUrl, images }}
      />
    </PageDielineFullBleedSection>
  );
}
