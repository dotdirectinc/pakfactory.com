'use client';

import {Button} from '@pakfactory/ui/components/button';

import {parseCompatibilityQuery} from '@/lib/catalog/compatibility-query';
import {
    patchPropertySelections,
    seedFromCustomizations,
    type CustomizationBuilderState,
} from '@/lib/customization-builder';
import {narrowByRules} from '@/lib/customization-builder/rules-narrowing';
import type {Product} from '@/lib/catalog/types';

export type CompatibilityPreselectNotice = {
    applied: string[];
    dropped: string[];
};

export type CompatibilityPreselectResult = {
    state: CustomizationBuilderState;
    notice: CompatibilityPreselectNotice;
};

/**
 * Apply shareable compatibility query onto a PDP builder base state.
 * Pure — callers own when to run (e.g. ProductPdpDraftProvider useEffect).
 * Keeps the query in the address bar (no replaceState strip).
 */
export function applyCompatibilityQuery(
    product: Product,
    baseState: CustomizationBuilderState,
    searchParams: URLSearchParams,
): CompatibilityPreselectResult | null {
    const parsed = parseCompatibilityQuery(searchParams);
    if (parsed.selections.length === 0) return null;

    const byKey = new Map(
        product.availableCustomizations.map((opt) => [
            `${(opt.category ?? '').toLowerCase()}\0${(opt.slug ?? '').toLowerCase()}`,
            opt,
        ]),
    );
    const byId = new Map(
        product.availableCustomizations.map((opt) => [opt.id, opt]),
    );

    const matched = [];
    const dropped: string[] = [];

    for (const sel of parsed.selections) {
        const key = `${sel.category.toLowerCase()}\0${sel.optionSlug.toLowerCase()}`;
        const found = byKey.get(key);
        if (!found) {
            dropped.push(sel.optionSlug);
            continue;
        }
        matched.push(found);
    }

    let invalidOptionIds = new Set<string>();
    let next = baseState;

    if (matched.length) {
        const seeded = seedFromCustomizations(
            matched.map((opt) => ({
                id: opt.id,
                label: opt.label,
                category: opt.category,
                typeId: opt.typeId,
                customerSelects: opt.customerSelects,
                cardinality: opt.cardinality,
                preselected: true,
            })),
        );
        next = {
            ...baseState,
            answers: {...baseState.answers, ...seeded.answers},
            guidedComplete: baseState.guidedComplete || seeded.guidedComplete,
            propertySelections: {
                ...(baseState.propertySelections ?? {}),
                ...(seeded.propertySelections ?? {}),
            },
            propertySelectionSummaries: {
                ...(baseState.propertySelectionSummaries ?? {}),
                ...(seeded.propertySelectionSummaries ?? {}),
            },
        };

        const narrowed = narrowByRules(
            product.availableCustomizations,
            product.customizationRules,
            next,
        );
        invalidOptionIds = narrowed.invalidOptionIds;
        if (invalidOptionIds.size > 0) {
            for (const id of invalidOptionIds) {
                const opt = byId.get(id);
                dropped.push(opt?.label ?? opt?.slug ?? id);
            }
            const kept = matched.filter((opt) => !invalidOptionIds.has(opt.id));
            const reseeded = seedFromCustomizations(
                kept.map((opt) => ({
                    id: opt.id,
                    label: opt.label,
                    category: opt.category,
                    typeId: opt.typeId,
                    customerSelects: opt.customerSelects,
                    cardinality: opt.cardinality,
                    preselected: true,
                })),
            );
            next = {
                ...baseState,
                answers: {...baseState.answers, ...reseeded.answers},
                guidedComplete:
                    baseState.guidedComplete || reseeded.guidedComplete,
                propertySelections: {
                    ...(baseState.propertySelections ?? {}),
                },
                propertySelectionSummaries: {
                    ...(baseState.propertySelectionSummaries ?? {}),
                },
            };
        }

        for (const prop of parsed.properties) {
            const option =
                (prop.optionSlug
                    ? byKey.get(
                          `${prop.category.toLowerCase()}\0${prop.optionSlug.toLowerCase()}`,
                      )
                    : undefined) ??
                matched.find((opt) => opt.category === prop.category);
            if (!option || invalidOptionIds.has(option.id)) continue;
            next = patchPropertySelections(
                next,
                option.id,
                {
                    ...(next.propertySelections?.[option.id] ?? {}),
                    [prop.propertyKey]: prop.valueSlugs,
                },
                next.propertySelectionSummaries?.[option.id] ?? [],
            );
        }
    }

    const appliedOptions = matched.filter(
        (opt) => !invalidOptionIds.has(opt.id),
    );

    return {
        state: next,
        notice: {
            applied: appliedOptions.map((opt) => opt.label),
            dropped: [...new Set(dropped)],
        },
    };
}

export function CompatibilityPreselectBanner({
    notice,
    onClear,
}: {
    notice: CompatibilityPreselectNotice | null;
    onClear: () => void;
}) {
    if (!notice) return null;
    if (notice.applied.length === 0 && notice.dropped.length === 0) {
        return null;
    }

    return (
        <div
            role="status"
            className="mb-4 rounded-lg border border-border bg-muted/40 p-4"
        >
            {notice.applied.length > 0 ? (
                <p className="text-sm text-foreground">
                    Preselected from your selection:{' '}
                    <span className="font-medium">
                        {notice.applied.join(', ')}
                    </span>
                    .
                </p>
            ) : null}
            {notice.dropped.length > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                    Not available on this product:{' '}
                    <span className="font-medium">
                        {notice.dropped.join(', ')}
                    </span>
                    .
                </p>
            ) : null}
            <Button
                type="button"
                variant="link"
                className="mt-2 h-auto px-0 text-sm"
                onClick={onClear}
            >
                Clear preselection
            </Button>
        </div>
    );
}
