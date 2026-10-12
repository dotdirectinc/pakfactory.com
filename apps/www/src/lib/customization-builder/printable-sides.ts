import type {ProductProperty} from '@/lib/catalog/types';

/** Sanity `property.slug` for product Printable Sides facts. */
export const PRINTABLE_SIDES_PROPERTY_SLUG = 'printable-sides';

export type PrintableSide = {
    slug: string;
    title: string;
};

/**
 * Product Printable Sides values that drive the Printing No|Yes gate.
 * Empty when the property is missing or has no slugged values.
 */
export function resolvePrintableSides(
    properties: ProductProperty[] | undefined | null,
): PrintableSide[] {
    const row = (properties ?? []).find(
        (p) => p.propertySlug === PRINTABLE_SIDES_PROPERTY_SLUG,
    );
    if (!row?.values?.length) return [];
    return row.values
        .filter((v) => Boolean(v.slug?.trim()) && Boolean(v.title?.trim()))
        .map((v) => ({slug: v.slug.trim(), title: v.title.trim()}));
}

/**
 * Gate UI when the product states at least one printable side.
 * Missing / empty → hide (print treated as on). One+ values → one
 * “Print {side}” row each.
 */
export function shouldShowPrintedSideGate(sides: PrintableSide[]): boolean {
    return sides.length >= 1;
}
