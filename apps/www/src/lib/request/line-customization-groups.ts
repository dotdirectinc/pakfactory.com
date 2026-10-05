import {visiblePropertySummaries} from '@/lib/customization-builder';
import type {RequestLine} from '@/lib/request/request.storage';

export type LineCustomizationPick = {
    label: string;
    properties?: string[];
};

export type LineCustomizationGroup = {
    categoryTitle: string;
    picks: LineCustomizationPick[];
};

function humanizeCategorySlug(slug: string): string {
    return slug
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function categoryTitleFor(category: string, line: RequestLine): string {
    const fromCatalog = line.availableCustomizations?.find(
        (option) =>
            option.category === category && option.categoryTitle?.trim(),
    )?.categoryTitle?.trim();
    if (fromCatalog) return fromCatalog;
    return humanizeCategorySlug(category) || category;
}

function propertiesForOption(
    optionId: string,
    line: RequestLine,
): string[] | undefined {
    const summaries =
        line.customizationBuilder?.propertySelectionSummaries?.[optionId];
    const chips = visiblePropertySummaries(summaries)
        .filter((item) => item.kind === 'chip')
        .map((item) => item.label.trim())
        .filter(Boolean);
    return chips.length > 0 ? chips : undefined;
}

/**
 * Selection categories for the review paper Customization column.
 * No selected picks → empty list so the cell shows a single specialist line.
 * With picks → every available category (empty ones → specialist under heading).
 */
export function lineCustomizationGroups(
    line: RequestLine,
): LineCustomizationGroup[] {
    if (line.customizations.length === 0) return [];

    const order: string[] = [];
    const byCategory = new Map<string, LineCustomizationPick[]>();

    function ensureCategory(key: string) {
        if (byCategory.has(key)) return;
        order.push(key);
        byCategory.set(key, []);
    }

    for (const option of line.availableCustomizations ?? []) {
        const key = option.category?.trim();
        if (!key) continue;
        ensureCategory(key);
    }

    for (const customization of line.customizations) {
        const key = customization.category?.trim() || 'other';
        ensureCategory(key);
        const properties = propertiesForOption(customization.id, line);
        byCategory.get(key)!.push({
            label: customization.label,
            ...(properties ? {properties} : {}),
        });
    }

    return order.map((key) => ({
        categoryTitle: categoryTitleFor(key, line),
        picks: byCategory.get(key) ?? [],
    }));
}
