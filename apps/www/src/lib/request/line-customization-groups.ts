import {
    PRINTING_CATEGORY_SLUG,
    formatPrintedSideSummary,
    isPrintedSideComplete,
    visiblePropertySummaries,
} from '@/lib/customization-builder';
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
 * Printing Outside/Inside (builder state) surfaces even when methods are None.
 */
export function lineCustomizationGroups(
    line: RequestLine,
): LineCustomizationGroup[] {
    const builder = line.customizationBuilder;
    const printedSideReady = builder
        ? isPrintedSideComplete(builder)
        : false;
    const printingConsultation =
        builder?.answers?.[PRINTING_CATEGORY_SLUG]?.status === 'not-sure';
    const printedSideLabel = printedSideReady
        ? formatPrintedSideSummary(builder!)
        : printingConsultation
          ? 'Specialist to advise'
          : null;

    if (line.customizations.length === 0 && !printedSideLabel) return [];

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

    if (printedSideLabel) {
        ensureCategory(PRINTING_CATEGORY_SLUG);
    }

    for (const customization of line.customizations) {
        const key = customization.category?.trim() || 'other';
        ensureCategory(key);
        // Side / gate-consultation summary is owned by builder state.
        if (
            customization.id === `${PRINTING_CATEGORY_SLUG}-side` ||
            (customization.id === `${PRINTING_CATEGORY_SLUG}-not-sure` &&
                !printedSideReady) ||
            (key === PRINTING_CATEGORY_SLUG &&
                printedSideLabel &&
                customization.label === printedSideLabel)
        ) {
            continue;
        }
        const properties = propertiesForOption(customization.id, line);
        byCategory.get(key)!.push({
            label: customization.label,
            ...(properties ? {properties} : {}),
        });
    }

    if (printedSideLabel) {
        const picks = byCategory.get(PRINTING_CATEGORY_SLUG) ?? [];
        byCategory.set(PRINTING_CATEGORY_SLUG, [
            {label: printedSideLabel},
            ...picks,
        ]);
    }

    return order.map((key) => ({
        categoryTitle: categoryTitleFor(key, line),
        picks: byCategory.get(key) ?? [],
    }));
}
