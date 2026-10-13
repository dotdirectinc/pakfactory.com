import type {Product} from '@/lib/catalog/types';

export const RELATED_PRODUCTS_CAP = 6;

/**
 * Build Related Products: same kind; style-first, then same-industry fill
 * (PROD-2780). Hosts without an industry fall back to same-line fill after style.
 */
/**
 * What the picker reads. A full `Product` qualifies, and so does the slim
 * related index (PROD-3004), so the PDP never has to load every product card.
 */
export type RelatedProductCandidate = Pick<Product, 'slug' | 'kind' | 'industry'> & {
    productLine: Pick<Product['productLine'], 'slug'>;
    productStyle: Pick<Product['productStyle'], 'slug'>;
};

export function pickRelatedProducts<T extends RelatedProductCandidate>(
    host: RelatedProductCandidate,
    candidates: T[],
    cap: number = RELATED_PRODUCTS_CAP,
): T[] {
    const styleSlug = host.productStyle.slug;
    const lineSlug = host.productLine.slug;
    const industrySlug = host.industry?.slug;

    const pool = candidates.filter(
        (item) => item.slug !== host.slug && item.kind === host.kind,
    );

    const sameIndustry = (item: RelatedProductCandidate) =>
        !industrySlug || item.industry?.slug === industrySlug;

    const styleFirst = pool.filter(
        (item) =>
            item.productStyle.slug === styleSlug && sameIndustry(item),
    );

    const fill = industrySlug
        ? pool.filter((item) => item.industry?.slug === industrySlug)
        : pool.filter((item) => item.productLine.slug === lineSlug);

    const seen = new Set<string>();
    const out: T[] = [];
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
