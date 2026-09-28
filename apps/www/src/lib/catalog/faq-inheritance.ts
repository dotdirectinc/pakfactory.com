import type {ProductFaq, ProductLine, ProductStyleRef} from './types';

/**
 * FAQs flow down the catalog: line → style → product (Richard, 2026-09-28). A page shows the
 * nearest level that has ANY FAQ, and that list replaces everything above it — one curated FAQ
 * on a style means the style page shows that one FAQ only. Nothing merges.
 *
 * A product's chain is resolved in GROQ (`PRODUCT_FAQS_INHERITED`, packages/sanity catalog
 * queries); this is the style page's half, where the style and its line are already loaded.
 */
export function resolveStyleFaqs(
    style: Pick<ProductStyleRef, 'faqs'>,
    line: Pick<ProductLine, 'faqs'>,
): ProductFaq[] {
    if (style.faqs?.length) return style.faqs;
    return line.faqs ?? [];
}
