import type {PageSectionLinkDoc} from '@pakfactory/sanity/queries';
import type {PageDielinePaddingBlock} from '@pakfactory/ui/components/page-dieline-section';
import {stegaClean} from 'next-sanity';

import {
    resolveDielineBorders,
    SECTION_DIELINE_BORDER_DEFAULTS,
} from '@/lib/dieline-borders';
import {resolveSectionLinkHref} from '@/lib/resolve-www-nav-href';

export type SectionAlign = 'left' | 'center';

export type SectionChromeMapped = {
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    paddingBlock: PageDielinePaddingBlock;
    eyebrow?: string;
    cta?: {label: string; href: string};
};

/*
 * Enum-like Studio strings are compared after `stegaClean`: in draft mode they
 * arrive stega-encoded, and a raw `=== 'center'` would silently fall back.
 */
export function mapSectionAlign(
    align: string | null | undefined,
): SectionAlign {
    return stegaClean(align) === 'center' ? 'center' : 'left';
}

export function mapSectionPaddingBlock(
    rawPaddingBlock: string | null | undefined,
): PageDielinePaddingBlock {
    const paddingBlock = stegaClean(rawPaddingBlock);
    if (
        paddingBlock === 'xs' ||
        paddingBlock === 'sm' ||
        paddingBlock === 'lg'
    ) {
        return paddingBlock;
    }
    return 'md';
}

export function mapSectionCta(
    link: PageSectionLinkDoc | null | undefined,
): {label: string; href: string} | undefined {
    const label = link?.label?.trim();
    if (!label) return undefined;
    const resolved = resolveSectionLinkHref(link);
    if (!resolved) return undefined;
    const href = appendQuery(resolved.href, link?.query);
    return {label, href};
}

/** Append a query string (no leading `?`) to an href; use `&` when href already has `?`. */
function appendQuery(
    href: string,
    query: string | null | undefined,
): string {
    const q = query?.replace(/^\?/, '').trim();
    if (!q) return href;
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}${q}`;
}

/**
 * Map shared Sanity section chrome → React SectionHeading + PageDielineSection props.
 */
export function mapSectionChrome(
    section: {
        eyebrow?: string | null;
        align?: string | null;
        paddingBlock?: string | null;
        link?: PageSectionLinkDoc | null;
        showTopBorder?: boolean | null;
        showBottomBorder?: boolean | null;
    },
): SectionChromeMapped {
    const {borderTop, borderBottom} = resolveDielineBorders(
        section.showTopBorder,
        section.showBottomBorder,
        SECTION_DIELINE_BORDER_DEFAULTS,
    );
    const cta = mapSectionCta(section.link);
    const eyebrow = section.eyebrow?.trim();

    return {
        align: mapSectionAlign(section.align),
        borderTop,
        borderBottom,
        paddingBlock: mapSectionPaddingBlock(section.paddingBlock),
        ...(eyebrow ? {eyebrow} : {}),
        ...(cta ? {cta} : {}),
    };
}
