import type {Product} from '@/lib/catalog/types';

export const RELATED_PRODUCTS_CAP = 6;

/**
 * Build Related Products: same kind; style-first, then same-industry fill
 * (PROD-2780). Hosts without an industry fall back to same-line fill after style.
 */
export function pickRelatedProducts(
    host: Product,
    candidates: Product[],
    cap: number = RELATED_PRODUCTS_CAP,
): Product[] {
    const styleSlug = host.productStyle.slug;
    const lineSlug = host.productLine.slug;
    const industrySlug = host.industry?.slug;

    const pool = candidates.filter(
        (item) => item.slug !== host.slug && item.kind === host.kind,
    );

    const sameIndustry = (item: Product) =>
        !industrySlug || item.industry?.slug === industrySlug;

    const styleFirst = pool.filter(
        (item) =>
            item.productStyle.slug === styleSlug && sameIndustry(item),
    );

    const fill = industrySlug
        ? pool.filter((item) => item.industry?.slug === industrySlug)
        : pool.filter((item) => item.productLine.slug === lineSlug);

    const seen = new Set<string>();
    const out: Product[] = [];
    for (const item of [...styleFirst, ...fill]) {
        if (seen.has(item.slug)) continue;
        seen.add(item.slug);
        out.push(item);
        if (out.length >= cap) break;
    }
    return out;
}

/**
 * Curated related list: same kind + same industry when host has one.
 */
export function filterCuratedRelatedProducts(
    host: Product,
    curated: Product[],
    cap: number = RELATED_PRODUCTS_CAP,
): Product[] {
    const industrySlug = host.industry?.slug;
    return curated
        .filter(
            (item) =>
                item.kind === host.kind &&
                (!industrySlug || item.industry?.slug === industrySlug),
        )
        .slice(0, cap);
}
