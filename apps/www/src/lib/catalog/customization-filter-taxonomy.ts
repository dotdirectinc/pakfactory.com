/**
 * Customization catalog filter taxonomy — operators + product-line vocabulary.
 *
 * Source of truth for rules: `apps/www/docs/customization-filter-taxonomy.md`
 * (POC / Notion-derived). Option lists still come from Sanity at runtime.
 */

import {CUSTOMIZATION_PRODUCT_LINE_FACET_ID} from '@/lib/catalog/types';

export type CustomizationFacetWithinOp = 'and' | 'or';

/** Across facet groups: always AND (taxonomy §2). */
export const CUSTOMIZATION_FACET_ACROSS_OP = 'and' as const;

/** Canonical Product Line options (taxonomy §3). */
export const CUSTOMIZATION_PRODUCT_LINES = [
    {id: 'rigid-boxes', label: 'Rigid Boxes'},
    {id: 'folding-cartons', label: 'Folding Cartons'},
    {id: 'corrugated-boxes', label: 'Corrugated Boxes'},
    {id: 'cardboard-displays', label: 'Cardboard Displays'},
    {id: 'box-inserts', label: 'Box Inserts'},
    {id: 'retail-promotional-bags', label: 'Retail & Promotional Bags'},
    {id: 'fabric-gift-bags', label: 'Fabric Gift Bags & Pouches'},
    {id: 'mailer-bags', label: 'Mailer Bags'},
    {id: 'pouches', label: 'Pouches'},
    {id: 'tin-packaging', label: 'Tin Packaging'},
    {id: 'stickers', label: 'Stickers'},
    {id: 'packaging-labels', label: 'Packaging Labels'},
    {id: 'packaging-accessories', label: 'Packaging Accessories & Inserts'},
] as const;

export type CustomizationProductLineId =
    (typeof CUSTOMIZATION_PRODUCT_LINES)[number]['id'];

/** Match Sustainability property by slug (canonical) or title. */
export function isSustainabilityProperty(
    slug: string | null | undefined,
    title?: string | null,
): boolean {
    const s = slug?.trim().toLowerCase() ?? '';
    if (s === 'sustainability' || s.includes('sustainab')) return true;
    const t = title?.trim().toLowerCase() ?? '';
    return t === 'sustainability' || t.includes('sustainab');
}

/** Match Performance property by slug or title (taxonomy §2 AND-within). */
export function isPerformanceProperty(
    slug: string | null | undefined,
    title?: string | null,
): boolean {
    const s = slug?.trim().toLowerCase() ?? '';
    if (s === 'performance' || s.includes('performance')) return true;
    const t = title?.trim().toLowerCase() ?? '';
    return t === 'performance' || t.includes('performance');
}

/**
 * Within-group operator for a facet id.
 * Sustainability + Performance → AND; Product Line and all other properties → OR.
 */
export function withinOpForFacet(
    facetId: string,
    title?: string | null,
): CustomizationFacetWithinOp {
    if (facetId === CUSTOMIZATION_PRODUCT_LINE_FACET_ID) return 'or';
    if (facetId === 'product-style') return 'or';
    if (isSustainabilityProperty(facetId, title)) return 'and';
    if (isPerformanceProperty(facetId, title)) return 'and';
    return 'or';
}

export function isCanonicalProductLineId(
    id: string,
): id is CustomizationProductLineId {
    return CUSTOMIZATION_PRODUCT_LINES.some((line) => line.id === id);
}
