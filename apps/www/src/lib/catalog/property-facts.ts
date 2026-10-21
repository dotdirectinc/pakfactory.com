import {
    NUMBER_FACT_LABELS,
    TEXT_FACT_LABELS,
    formatFactValue,
    type FactLabel,
} from '@pakfactory/sanity/fact-labels';

import type {CustomizationPropertyFact} from '@/lib/catalog/types';

const FACT_LABELS: readonly FactLabel[] = [
    ...NUMBER_FACT_LABELS,
    ...TEXT_FACT_LABELS,
];

const FACT_BY_VALUE = new Map(FACT_LABELS.map((label) => [label.value, label]));

const FACT_ORDER = new Map(FACT_LABELS.map((label, index) => [label.value, index]));

/** Human column header for a fact slug. Unknown slugs stay as stored. */
export function factHeading(slug: string): string {
    return FACT_BY_VALUE.get(slug)?.title ?? slug;
}

/**
 * Map one Sanity fact onto a spec-table cell (PROD-3055).
 * `key` stays the slug so two labels titled "Thickness" do not collapse.
 */
export function presentPropertyFact(fact: {
    label?: string | null;
    value?: number | null;
    text?: string | null;
}): CustomizationPropertyFact | null {
    const key = fact.label?.trim();
    if (!key) return null;
    const known = FACT_BY_VALUE.get(key);
    const label = known?.title ?? key;
    if (typeof fact.value === 'number' && Number.isFinite(fact.value)) {
        return {key, label, display: formatFactValue(fact.value, known)};
    }
    const text = fact.text?.trim();
    if (!text) return null;
    return {key, label, display: text};
}

export type SpecTableColumn = {
    key: string;
    heading: string;
};

/**
 * Column order follows the fact-label list, then any unknown slugs in the
 * order they were first seen. Headings that collide (both "Thickness") pick
 * up the unit so the table can tell them apart.
 */
export function specTableColumns(
    facts: Array<Pick<CustomizationPropertyFact, 'label' | 'key'>>,
): SpecTableColumn[] {
    const seen = new Map<string, string>();
    for (const fact of facts) {
        const key = fact.key?.trim() || fact.label;
        if (!key || seen.has(key)) continue;
        seen.set(key, FACT_BY_VALUE.get(key)?.title ?? fact.label);
    }
    const columns = [...seen.entries()]
        .map(([key, heading]) => ({key, heading}))
        .sort((a, b) => {
            const ai = FACT_ORDER.get(a.key) ?? Number.MAX_SAFE_INTEGER;
            const bi = FACT_ORDER.get(b.key) ?? Number.MAX_SAFE_INTEGER;
            return ai - bi;
        });
    const titleCounts = new Map<string, number>();
    for (const column of columns) {
        titleCounts.set(column.heading, (titleCounts.get(column.heading) ?? 0) + 1);
    }
    return columns.map((column) => {
        if ((titleCounts.get(column.heading) ?? 0) < 2) return column;
        const unit = FACT_BY_VALUE.get(column.key)?.unit;
        if (!unit) return column;
        return {...column, heading: `${column.heading} (${unit})`};
    });
}
