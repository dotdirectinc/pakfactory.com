/**
 * /compare page data (Website PRD v4.6 R27, R46): server-built columns for one comparison,
 * serialisable for the client view.
 */
import {buildCompareMatrix} from '@/lib/catalog/compare-matrix';
import type {
    CustomizationDetail,
    CustomizationLibraryItem,
    Product,
} from '@/lib/catalog/types';
import {customizationCategoryHref, productHref} from '@/lib/www-routes';

export type CompareRow = {key: string; label: string; values: Record<string, string>};
export type CompareColumn = {
    id: string;
    title: string;
    href: string;
    imageUrl?: string | null;
    /** Product: style; customization: type. */
    eyebrow?: string;
    inspiration?: boolean;
    groupKey: string;
    groupLabel: string;
    /** Works with — products: customization ids it supports; customizations: product line slugs. */
    compatIds: string[];
    /** Works with — general line: per option type counts (products) or product line titles (customizations). */
    compatSummary: string;
    /** Customizations: for Apply. */
    category?: string;
    slug?: string;
};
export type CompareData = {
    type: 'products' | 'customizations';
    columns: CompareColumn[];
    rows: CompareRow[];
};

/** PLP filter properties used as product matrix rows (PRD R27). */
const FILTER_PROPS = ['shape', 'closure', 'structural feature', 'performance', 'sustainability'];

export function productCompareData(products: Product[]): CompareData {
    const cols: CompareColumn[] = products.map((p) => {
        const byCat = new Map<string, number>();
        for (const o of p.availableCustomizations ?? []) {
            const k = o.categoryTitle?.trim() || String(o.category);
            byCat.set(k, (byCat.get(k) ?? 0) + 1);
        }
        return {
            id: p.slug,
            title: p.title,
            href: productHref(p.slug),
            imageUrl: p.media?.[0]?.src ?? null,
            eyebrow: p.productStyle?.title,
            inspiration: p.kind === 'inspiration',
            groupKey: p.productLine.slug,
            groupLabel: p.productLine.title,
            compatIds: (p.availableCustomizations ?? []).filter((o) => o.slug).map((o) => `${o.category}/${o.slug}`),
            compatSummary: [...byCat.entries()].map(([k, n]) => `${k} ${n}`).join(' · '),
        };
    });
    const rows: CompareRow[] = [];
    rows.push({key: 'style', label: 'Style', values: Object.fromEntries(products.map((p) => [p.slug, p.productStyle?.title ?? '']))});
    const allProps = new Map<string, string>();
    for (const p of products) for (const pr of p.properties ?? []) allProps.set(pr.label.trim().toLowerCase(), pr.label.trim());
    const filterKeys = FILTER_PROPS.flatMap((f) => [...allProps.keys()].filter((k) => k === f || k.startsWith(f)));
    // No filter properties on these products yet: show all their stated properties instead.
    const keys = filterKeys.length ? filterKeys : [...allProps.keys()];
    for (const k of keys) {
        rows.push({
            key: `prop-${k}`,
            label: allProps.get(k) ?? k,
            values: Object.fromEntries(products.map((p) => [p.slug, p.properties?.find((pr) => pr.label.trim().toLowerCase() === k)?.value ?? ''])),
        });
    }
    rows.push({
        key: 'available',
        label: 'Available customizations',
        values: Object.fromEntries(products.map((p) => [p.slug, (p.availableCustomizations ?? []).length ? `${(p.availableCustomizations ?? []).length} options` : ''])),
    });
    if (products.some((p) => p.kind === 'inspiration')) {
        rows.push({
            key: 'preselected',
            label: 'Pre-selected customizations',
            values: Object.fromEntries(
                products.map((p) => [p.slug, p.kind === 'inspiration' ? (p.availableCustomizations ?? []).filter((o) => o.preselected).map((o) => o.label).join(', ') : '']),
            ),
        });
    }
    return {type: 'products', columns: cols, rows: rows.filter((r) => Object.values(r.values).some((v) => v.trim()))};
}

export function customizationCompareData(details: CustomizationDetail[]): CompareData {
    const matrix = buildCompareMatrix(details);
    const cols: CompareColumn[] = details.map((d) => ({
        id: `${d.categoryValue}/${d.slug}`,
        title: d.shortName?.trim() || d.title,
        href: customizationCategoryHref(d.categoryValue, d.slug),
        imageUrl: d.media?.[0]?.src ?? null,
        eyebrow: d.typeTitle,
        groupKey: d.categoryValue,
        groupLabel: d.categoryLabel?.trim() || d.categoryValue,
        compatIds: (d.productLines ?? []).map((l) => l.slug),
        compatSummary: (d.productLines ?? []).map((l) => l.title).join(' · '),
        category: d.categoryValue,
        slug: d.slug,
    }));
    const idOf = new Map(matrix.columns.map((c, i) => [c.id, cols[i]?.id ?? c.id]));
    const rows: CompareRow[] = matrix.rows.map((r) => ({
        key: r.key,
        label: r.label,
        values: Object.fromEntries(Object.entries(r.valuesById).map(([k, v]) => [idOf.get(k) ?? k, v])),
    }));
    return {type: 'customizations', columns: cols, rows};
}

/**
 * Slim customization compare from library cards (no CDP peers / showcase).
 * Attribute rows come from each option's attrs + value titles.
 */
export function customizationLibraryCompareData(items: CustomizationLibraryItem[]): CompareData {
    const cols: CompareColumn[] = items.map((item) => ({
        id: `${item.categoryValue}/${item.slug}`,
        title: item.shortName?.trim() || item.title,
        href: customizationCategoryHref(item.categoryValue, item.slug),
        imageUrl: item.featuredImageUrl ?? item.imageUrl ?? null,
        eyebrow: item.typeTitle,
        groupKey: item.categoryValue,
        groupLabel: item.categoryLabel?.trim() || item.categoryValue,
        compatIds: item.productLines.map((l) => l.slug),
        compatSummary: item.productLines.map((l) => l.title).join(' · '),
        category: item.categoryValue,
        slug: item.slug,
    }));

    const propKeys: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
        for (const key of Object.keys(item.attrs)) {
            if (seen.has(key)) continue;
            seen.add(key);
            propKeys.push(key);
        }
    }

    const rows: CompareRow[] = propKeys
        .map((key) => {
            const label =
                items.find((item) => item.propertyTitles[key])?.propertyTitles[key] ?? key;
            const values = Object.fromEntries(
                items.map((item) => {
                    const id = `${item.categoryValue}/${item.slug}`;
                    const slugs = item.attrs[key] ?? [];
                    const text = slugs
                        .map((slug) => item.valueTitles[slug] ?? slug)
                        .filter(Boolean)
                        .join(', ');
                    return [id, text];
                }),
            );
            return {key: `attr-${key}`, label, values};
        })
        .filter((row) => Object.values(row.values).some((v) => v.trim()));

    return {type: 'customizations', columns: cols, rows};
}
