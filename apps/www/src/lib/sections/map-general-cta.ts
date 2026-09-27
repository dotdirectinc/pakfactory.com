import type {PageSectionGeneralCtaDoc} from '@pakfactory/sanity/queries';
import type {PageDielinePaddingBlock} from '@pakfactory/ui/components/page-dieline-section';

import {
    resolveDielineBorders,
    SECTION_DIELINE_BORDER_DEFAULTS,
} from '@/lib/dieline-borders';
import {
    mapSectionCta,
    mapSectionPaddingBlock,
} from '@/lib/sections/map-section-chrome';
import type {SectionTheme} from '@/lib/ui/section-theme';
import {FOOTER_CTA} from '@/lib/www-nav';
import {WWW_ROUTES} from '@/lib/www-routes';

/** Default headline — former SiteFooter collaborate band / FOOTER_CTA defaults. */
export const GENERAL_CTA_DEFAULT_HEADING =
    "Let's collaborate and craft your vision";

/** Hero / request-flow label fallback (not from generalCta link). */
export const GENERAL_CTA_REQUEST_LABEL = 'Get a quote';

export type GeneralCtaMapped = {
    heading: string;
    body?: string;
    ctaLabel: string;
    href: string;
    theme: SectionTheme;
    align: 'left' | 'center';
    paddingBlock: PageDielinePaddingBlock;
    borderTop: boolean;
    borderBottom: boolean;
};

function mapTheme(value: string | null | undefined): SectionTheme {
    return value === 'inverse' ? 'inverse' : 'muted';
}

function mapAlign(value: string | null | undefined): 'left' | 'center' {
    return value === 'left' ? 'left' : 'center';
}

/**
 * Map Sanity `generalCta` → GeneralCta props.
 * Button from design-system `link`; incomplete/empty → FOOTER_CTA (/contact).
 * Defaults: muted + center + md padding + dieline borders on.
 */
export function mapGeneralCta(
    section: PageSectionGeneralCtaDoc,
): GeneralCtaMapped {
    const body = section.body?.trim();
    const cta = mapSectionCta(section.link);
    const {borderTop, borderBottom} = resolveDielineBorders(
        section.showTopBorder,
        section.showBottomBorder,
        SECTION_DIELINE_BORDER_DEFAULTS,
    );
    return {
        heading: section.heading?.trim() || GENERAL_CTA_DEFAULT_HEADING,
        ...(body ? {body} : {}),
        ctaLabel: cta?.label || FOOTER_CTA.label,
        href: cta?.href || FOOTER_CTA.href || WWW_ROUTES.contact,
        theme: mapTheme(section.theme),
        align: mapAlign(section.align),
        paddingBlock: mapSectionPaddingBlock(section.paddingBlock),
        borderTop,
        borderBottom,
    };
}
