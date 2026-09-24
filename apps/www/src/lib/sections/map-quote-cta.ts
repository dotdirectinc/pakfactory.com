import type {PageSectionQuoteCtaDoc} from '@pakfactory/sanity/queries';

import {WWW_ROUTES} from '@/lib/www-routes';

/** Site-wide quote label — Studio `quoteCta.ctaLabel` falls back to this. */
export const QUOTE_CTA_DEFAULT_LABEL = 'Get a quote';

export type QuoteCtaMapped = {
    heading?: string;
    body?: string;
    ctaLabel: string;
    href: string;
};

/**
 * Map Sanity `quoteCta` → QuoteCta props (PROD-2577). The button always opens
 * the quote request flow; the section `link` chrome is not used by this band.
 */
export function mapQuoteCta(section: PageSectionQuoteCtaDoc): QuoteCtaMapped {
    const heading = section.heading?.trim();
    const body = section.body?.trim();
    return {
        ...(heading ? {heading} : {}),
        ...(body ? {body} : {}),
        ctaLabel: section.ctaLabel?.trim() || QUOTE_CTA_DEFAULT_LABEL,
        href: WWW_ROUTES.request,
    };
}
