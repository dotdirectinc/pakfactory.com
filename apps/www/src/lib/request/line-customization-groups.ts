import {
    PRINTING_CATEGORY_SLUG,
    formatPrintedSideSummary,
    isPrintedSideComplete,
    shouldShowPrintedSideGate,
    visiblePropertySummaries,
} from '@/lib/customization-builder';
import type {RequestLine} from '@/lib/request/request.storage';

export type LineCustomizationSwatch = {label: string; color?: string; imageUrl?: string};

export type LineCustomizationPick = {
    label: string;
    properties?: string[];
    /** Owner Nov 3 (R42): the option's catalog image, when it has one. */
    imageUrl?: string;
    /** Owner Nov 3 (R42): colour / image property values (shown on product cards only). */
    swatches?: LineCustomizationSwatch[];
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

function swatchesForOption(optionId: string, line: RequestLine): LineCustomizationSwatch[] | undefined {
    const summaries = line.customizationBuilder?.propertySelectionSummaries?.[optionId];
    const swatches = visiblePropertySummaries(summaries)
        .filter((item) => item.kind === 'swatch' && item.label.trim())
        .map((item) => ({
            label: item.label.trim(),
            ...(item.color ? {color: item.color} : {}),
            ...(item.imageUrl ? {imageUrl: item.imageUrl} : {}),
        }));
    return swatches.length > 0 ? swatches : undefined;
}

function imageForOption(optionId: string, line: RequestLine): string | undefined {
    const url = line.availableCustomizations?.find((o) => o.id === optionId)?.imageUrl;
    return typeof url === 'string' && url.trim() ? url : undefined;
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
    const printableSides = line.printableSides ?? [];
    const printingAnswer = builder?.answers?.[PRINTING_CATEGORY_SLUG];
    const printedSideReady = builder
        ? shouldShowPrintedSideGate(printableSides)
            ? isPrintedSideComplete(builder, printableSides)
            : printingAnswer?.status === 'set' &&
              isPrintedSideComplete(builder, printableSides)
        : false;
    const printingConsultation = printingAnswer?.status === 'not-sure';
    const printedSideLabel = printedSideReady
        ? formatPrintedSideSummary(builder!, printableSides)
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
        const imageUrl = imageForOption(customization.id, line);
        const swatches = swatchesForOption(customization.id, line);
        byCategory.get(key)!.push({
            label: customization.label,
            ...(properties ? {properties} : {}),
            ...(imageUrl ? {imageUrl} : {}),
            ...(swatches ? {swatches} : {}),
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

/**
 * Product cards (owner Nov 3): every customization category the product offers, even when
 * nothing is picked, so the card shows each one with "Specialist to advise". The review paper
 * keeps lineCustomizationGroups (one specialist line when nothing is picked).
 */
export function lineCustomizationGroupsForCard(line: RequestLine): LineCustomizationGroup[] {
    const groups = lineCustomizationGroups(line);
    if (groups.length > 0) return groups;
    const order: string[] = [];
    for (const option of line.availableCustomizations ?? []) {
        const key = option.category?.trim();
        if (key && !order.includes(key)) order.push(key);
    }
    return order.map((key) => ({categoryTitle: categoryTitleFor(key, line), picks: []}));
}
