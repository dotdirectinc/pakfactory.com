import type {
    CustomizationDetail,
    CustomizationPropertyValue,
} from '@/lib/catalog/types';

export const COMPARE_EMPTY_CELL = '—';
export const COMPARE_EMPTY_CELL_LABEL = 'Not stated';

/** Scroll / anchor target for the detail compare band. */
export const CUSTOMIZATION_COMPARISON_ID = 'customization-comparison';

export type ReferenceSpecRow = {
    label: string;
    value: string;
};

export type CompareMatrixColumn = {
    id: string;
    title: string;
    /** Category + slug path segment for href builders. */
    categoryValue: string;
    slug: string;
};

export type CompareMatrixRow = {
    /** Stable key: property slug or id. */
    key: string;
    label: string;
    /** Cell text keyed by option id. Missing → empty treatment. */
    valuesById: Record<string, string>;
};

export type CompareMatrix = {
    columns: CompareMatrixColumn[];
    rows: CompareMatrixRow[];
};

function groupKey(value: CustomizationPropertyValue): string | null {
    return value.propertySlug?.trim() || value.propertyId?.trim() || null;
}

/**
 * Spec rows from stated declared Properties on the Option's Type (Sanity only).
 * Shared by Specs & performance and the compare matrix.
 */
export function buildReferenceSpecRows(
    detail: CustomizationDetail,
): ReferenceSpecRow[] {
    const statedKeys = new Set(
        detail.declaredProperties
            .filter((d) => d.usage === 'stated')
            .map((d) => d.propertySlug?.trim() || d.propertyId?.trim())
            .filter((k): k is string => Boolean(k)),
    );

    if (statedKeys.size === 0) return [];

    const groups = new Map<string, CustomizationPropertyValue[]>();
    for (const value of detail.properties) {
        const key = groupKey(value);
        if (!key || !statedKeys.has(key)) continue;
        const list = groups.get(key) ?? [];
        list.push(value);
        groups.set(key, list);
    }

    const rows: ReferenceSpecRow[] = [];
    for (const [key, values] of groups) {
        if (values.length === 0) continue;
        const declared = detail.declaredProperties.find(
            (d) => d.propertySlug === key || d.propertyId === key,
        );
        const label =
            declared?.propertyTitle?.trim() ||
            values.find((v) => v.propertyTitle)?.propertyTitle?.trim() ||
            key;
        const factDisplays = values.flatMap((v) =>
            v.facts.map((f) => f.display).filter(Boolean),
        );
        const titles = values.map((v) => v.title).filter(Boolean);
        const value =
            factDisplays.length > 0
                ? factDisplays.join(' · ')
                : titles.join(' · ');
        if (!value) continue;
        rows.push({label, value});
    }
    return rows;
}

function statedRowsByKey(
    detail: CustomizationDetail,
): Map<string, {label: string; value: string}> {
    const statedOrder = detail.declaredProperties
        .filter((d) => d.usage === 'stated')
        .map((d) => d.propertySlug?.trim() || d.propertyId?.trim())
        .filter((k): k is string => Boolean(k));

    const groups = new Map<string, CustomizationPropertyValue[]>();
    const statedKeys = new Set(statedOrder);
    for (const value of detail.properties) {
        const key = groupKey(value);
        if (!key || !statedKeys.has(key)) continue;
        const list = groups.get(key) ?? [];
        list.push(value);
        groups.set(key, list);
    }

    const out = new Map<string, {label: string; value: string}>();
    for (const key of statedOrder) {
        const values = groups.get(key);
        if (!values || values.length === 0) continue;
        const declared = detail.declaredProperties.find(
            (d) => d.propertySlug === key || d.propertyId === key,
        );
        const label =
            declared?.propertyTitle?.trim() ||
            values.find((v) => v.propertyTitle)?.propertyTitle?.trim() ||
            key;
        const factDisplays = values.flatMap((v) =>
            v.facts.map((f) => f.display).filter(Boolean),
        );
        const titles = values.map((v) => v.title).filter(Boolean);
        const value =
            factDisplays.length > 0
                ? factDisplays.join(' · ')
                : titles.join(' · ');
        if (!value) continue;
        out.set(key, {label, value});
    }
    return out;
}

/**
 * Side-by-side matrix for filled compare slots (nulls omitted as columns).
 * Row order: current (first) option’s stated properties, then peer-only keys.
 */
export function buildCompareMatrix(
    slots: Array<CustomizationDetail | null>,
): CompareMatrix {
    const filled = slots.filter(
        (s): s is CustomizationDetail => s != null,
    );
    const columns: CompareMatrixColumn[] = filled.map((item) => ({
        id: item.id,
        title: item.title,
        categoryValue: item.categoryValue,
        slug: item.slug,
    }));

    if (filled.length === 0) {
        return {columns: [], rows: []};
    }

    const perItem = filled.map((item) => ({
        id: item.id,
        byKey: statedRowsByKey(item),
    }));

    const current = perItem[0];
    if (!current) {
        return {columns: [], rows: []};
    }
    const rowKeys: string[] = [...current.byKey.keys()];
    const seen = new Set(rowKeys);

    for (const item of perItem.slice(1)) {
        for (const key of item.byKey.keys()) {
            if (seen.has(key)) continue;
            seen.add(key);
            rowKeys.push(key);
        }
    }

    const rows: CompareMatrixRow[] = rowKeys.map((key) => {
        const label =
            perItem.find((p) => p.byKey.has(key))?.byKey.get(key)?.label ??
            key;
        const valuesById: Record<string, string> = {};
        for (const item of perItem) {
            const cell = item.byKey.get(key)?.value;
            if (cell) valuesById[item.id] = cell;
        }
        return {key, label, valuesById};
    });

    return {columns, rows};
}

export function compareCellDisplay(
    valuesById: Record<string, string>,
    optionId: string | null,
): string {
    if (!optionId) return COMPARE_EMPTY_CELL;
    return valuesById[optionId] ?? COMPARE_EMPTY_CELL;
}
