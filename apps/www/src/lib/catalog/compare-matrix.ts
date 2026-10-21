import {isSustainabilityProperty} from '@/lib/catalog/customization-filter-taxonomy';
import type {
    CustomizationDeclaredProperty,
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

/**
 * A stated property the detail page prints. A hidden one (showOnDetailPage false — the content
 * team's "Stated (hidden)" columns: Material Source, Coverage…) is a filter only: it still
 * narrows a listing, but a spec row or compare row would show a customer an internal facet.
 */
function printsOnDetailPage(d: CustomizationDeclaredProperty): boolean {
    return d.usage === 'stated' && d.showOnDetailPage !== false;
}

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
            .filter(printsOnDetailPage)
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

/**
 * Stated spec rows that are the Sustainability property (PROD-3120 hero strip).
 * Reuses {@link buildReferenceSpecRows} so hidden stated rows stay out.
 */
export function buildSustainabilitySpecRows(
    detail: CustomizationDetail,
): ReferenceSpecRow[] {
    return buildReferenceSpecRows(detail).filter((row) => {
        const declared = detail.declaredProperties.find(
            (d) =>
                d.propertyTitle?.trim() === row.label ||
                d.propertySlug === row.label,
        );
        return isSustainabilityProperty(
            declared?.propertySlug,
            declared?.propertyTitle ?? row.label,
        );
    });
}

/** Chip / icon labels for a joined spec cell (` · ` separator). */
export function specRowValues(row: ReferenceSpecRow): string[] {
    return row.value
        .split(' · ')
        .map((part) => part.trim())
        .filter(Boolean);
}

function statedRowsByKey(
    detail: CustomizationDetail,
): Map<string, {label: string; value: string}> {
    const statedOrder = detail.declaredProperties
        .filter(printsOnDetailPage)
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

function statedKeySet(detail: CustomizationDetail): Set<string> {
    return new Set(statedRowsByKey(detail).keys());
}

function sharedAxisCount(
    currentKeys: Set<string>,
    peer: CustomizationDetail,
): number {
    let n = 0;
    for (const key of statedKeySet(peer)) {
        if (currentKeys.has(key)) n += 1;
    }
    return n;
}

function rankByOverlapThenTitle(
    current: CustomizationDetail,
    peers: CustomizationDetail[],
): CustomizationDetail[] {
    const currentKeys = statedKeySet(current);
    return [...peers].sort((a, b) => {
        const overlap =
            sharedAxisCount(currentKeys, b) - sharedAxisCount(currentKeys, a);
        if (overlap !== 0) return overlap;
        return a.title.localeCompare(b.title);
    });
}

/**
 * Default compare columns: same customization type first, then nearest
 * same-category neighbours ranked by shared stated-property axes.
 */
export function selectDefaultComparePeers(
    current: CustomizationDetail,
    peers: CustomizationDetail[],
    count = 2,
): CustomizationDetail[] {
    const unique = peers.filter((peer) => peer.id !== current.id);
    const typeSlug = current.typeSlug?.trim();
    if (!typeSlug) {
        return rankByOverlapThenTitle(current, unique).slice(0, count);
    }

    const sameType: CustomizationDetail[] = [];
    const neighbours: CustomizationDetail[] = [];
    for (const peer of unique) {
        if (peer.typeSlug?.trim() === typeSlug) {
            sameType.push(peer);
        } else {
            neighbours.push(peer);
        }
    }

    const selected: CustomizationDetail[] = [];
    for (const peer of rankByOverlapThenTitle(current, sameType)) {
        if (selected.length >= count) return selected;
        selected.push(peer);
    }
    for (const peer of rankByOverlapThenTitle(current, neighbours)) {
        if (selected.length >= count) return selected;
        selected.push(peer);
    }
    return selected;
}

/**
 * Side-by-side matrix for filled compare slots (nulls omitted as columns).
 * Row order: current (first) option’s stated properties, then peer-only keys.
 * With two or more columns, only rows that have a value in at least two
 * columns stay — a lone dash column is not a comparison.
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

    const minFilledCells = filled.length >= 2 ? 2 : 1;
    const denseRows = rows.filter(
        (row) => Object.keys(row.valuesById).length >= minFilledCells,
    );

    return {columns, rows: denseRows};
}

export function compareCellDisplay(
    valuesById: Record<string, string>,
    optionId: string | null,
): string {
    if (!optionId) return COMPARE_EMPTY_CELL;
    return valuesById[optionId] ?? COMPARE_EMPTY_CELL;
}
