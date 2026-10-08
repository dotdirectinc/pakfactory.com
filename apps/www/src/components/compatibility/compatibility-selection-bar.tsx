'use client';

import {useMemo} from 'react';
import {Check, ChevronDown} from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@pakfactory/ui/components/dropdown-menu';
import {cn} from '@pakfactory/ui/lib/utils';

import type {CompatibilityQuery} from '@/lib/catalog/compatibility-query';
import {compareCategorySlugs} from '@/lib/catalog/customization-category-order';
import type {CustomizationLibraryItem} from '@/lib/catalog/types';

type CompatibilitySelectionBarProps = {
    query: CompatibilityQuery;
    pickerItems: CustomizationLibraryItem[];
    onQueryChange: (next: CompatibilityQuery) => void;
};

type CategoryGroup = {
    value: string;
    label: string;
    items: CustomizationLibraryItem[];
};

function CategoryTagDropdown({
    label,
    options,
    values,
    onChange,
}: {
    label: string;
    options: CustomizationLibraryItem[];
    values: string[];
    onChange: (next: string[]) => void;
}) {
    const toggle = (slug: string, checked: boolean) => {
        onChange(checked ? [...values, slug] : values.filter((v) => v !== slug));
    };

    const active = values.length;

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                    <span className="flex items-center gap-1.5">
                        {label}
                        {active > 0 ? (
                            <span
                                aria-hidden
                                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium leading-none text-primary-foreground"
                            >
                                {active}
                            </span>
                        ) : null}
                    </span>
                    <ChevronDown
                        className="size-4 shrink-0 opacity-60"
                        aria-hidden
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="max-h-72 min-w-[200px] overflow-y-auto"
            >
                {options.map((opt) => {
                    const isChecked = values.includes(opt.slug);
                    return (
                        <DropdownMenuItem
                            key={opt._id}
                            onSelect={(event) => {
                                event.preventDefault();
                                toggle(opt.slug, !isChecked);
                            }}
                            className="flex cursor-pointer items-center justify-between gap-4 pr-2"
                        >
                            <span>{opt.title}</span>
                            {isChecked ? (
                                <span
                                    aria-hidden
                                    className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground"
                                >
                                    <Check
                                        className="size-2.5 text-background"
                                        strokeWidth={3}
                                    />
                                </span>
                            ) : null}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Compatibility selection chrome — Category TagDropdowns + Clear Selection
 * (replaces chips / Add customization; PROD-2921).
 */
export function CompatibilitySelectionBar({
    query,
    pickerItems,
    onQueryChange,
}: CompatibilitySelectionBarProps) {
    const categories = useMemo(() => {
        const byCategory = new Map<string, CategoryGroup>();
        for (const item of pickerItems) {
            const entry = byCategory.get(item.categoryValue) ?? {
                value: item.categoryValue,
                label: item.categoryLabel || item.categoryValue,
                items: [],
            };
            entry.items.push(item);
            byCategory.set(item.categoryValue, entry);
        }
        return [...byCategory.values()].sort((a, b) =>
            compareCategorySlugs(a.value, b.value),
        );
    }, [pickerItems]);

    const selectedByCategory = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const sel of query.selections) {
            const list = map.get(sel.category) ?? [];
            list.push(sel.optionSlug);
            map.set(sel.category, list);
        }
        return map;
    }, [query.selections]);

    const setCategoryValues = (category: string, nextSlugs: string[]) => {
        const otherSelections = query.selections.filter(
            (s) => s.category !== category,
        );
        const nextSelections = [
            ...otherSelections,
            ...nextSlugs.map((optionSlug) => ({category, optionSlug})),
        ];
        const nextProperties = query.properties.filter((p) => {
            if (p.category !== category) return true;
            if (!p.optionSlug) return nextSlugs.length > 0;
            return nextSlugs.includes(p.optionSlug);
        });
        onQueryChange({
            ...query,
            selections: nextSelections,
            properties: nextProperties,
        });
    };

    const clearSelection = () => {
        onQueryChange({selections: [], properties: []});
    };

    const hasSelection = query.selections.length > 0;

    if (categories.length === 0) return null;

    return (
        <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="text-base font-medium text-foreground">
                Category
            </span>
            {categories.map((group) => (
                <CategoryTagDropdown
                    key={group.value}
                    label={group.label}
                    options={group.items}
                    values={selectedByCategory.get(group.value) ?? []}
                    onChange={(next) => setCategoryValues(group.value, next)}
                />
            ))}
            {hasSelection ? (
                <button
                    type="button"
                    onClick={clearSelection}
                    className={cn(
                        'text-xs font-medium text-foreground/80 underline underline-offset-4 transition-colors',
                        'hover:text-foreground',
                    )}
                >
                    Clear Selection
                </button>
            ) : null}
        </div>
    );
}
