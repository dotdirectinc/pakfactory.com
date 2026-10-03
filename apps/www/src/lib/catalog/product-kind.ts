import type {ProductKind} from '@/lib/catalog/types';

/**
 * Catalog product kind (`standard` | `inspiration`) — not UI eyebrow Kind
 * (`lib/i18n/kind.ts`).
 *
 * Surface defaults: product-line paths → standard; solution paths → inspiration.
 * The global `/products` hub stays dual-kind (product-type facet).
 */
export const PRODUCT_KIND = {
    standard: 'standard',
    inspiration: 'inspiration',
} as const satisfies Record<string, ProductKind>;

/** Kind allowed on product-line LP, styles row, and `/products/[line]/[style]`. */
export const PRODUCT_LINE_PRODUCT_KIND: ProductKind = PRODUCT_KIND.standard;

/** Kind allowed on solution LP / style collections / hero product tiles. */
export const SOLUTION_PRODUCT_KIND: ProductKind = PRODUCT_KIND.inspiration;

export function isProductKind(value: unknown): value is ProductKind {
    return value === PRODUCT_KIND.standard || value === PRODUCT_KIND.inspiration;
}

export function isStandardProduct(product: {kind: ProductKind}): boolean {
    return product.kind === PRODUCT_KIND.standard;
}

export function isInspirationProduct(product: {kind: ProductKind}): boolean {
    return product.kind === PRODUCT_KIND.inspiration;
}

/** Filter catalog items to a single product kind. */
export function productsOfKind<T extends {kind: ProductKind}>(
    items: readonly T[],
    kind: ProductKind,
): T[] {
    return items.filter((item) => item.kind === kind);
}
