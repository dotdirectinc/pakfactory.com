/**
 * Resolve compatibility URL selections to option ids + type ids (PROD-2921).
 * Slugs come from the customization library; typeId from the rules option docs.
 */

import type {PreparedRules} from '@/lib/catalog/customization-rules';
import type {
    CompatibilityPropertySelection,
    CompatibilityQuery,
} from '@/lib/catalog/compatibility-query';
import type {CompatibilitySelectedOption} from '@/lib/catalog/compatibility';
import type {CustomizationLibraryItem} from '@/lib/catalog/types';

export type CompatibilityLibraryOption = Pick<
    CustomizationLibraryItem,
    '_id' | 'title' | 'slug' | 'categoryValue' | 'attrs' | 'valueTitles'
>;

export type ResolvedCompatibilitySelection = CompatibilitySelectedOption & {
    title: string;
};

export type ResolvedCompatibilityProperty = CompatibilityPropertySelection & {
    optionId: string;
    keptValueSlugs: string[];
    droppedValueSlugs: string[];
};

export type ResolveCompatibilitySelectionsResult = {
    selected: ResolvedCompatibilitySelection[];
    unknownSelections: CompatibilitySelectedOption[];
    properties: ResolvedCompatibilityProperty[];
    /** Property rows that could not be tied to a known option. */
    unknownProperties: CompatibilityPropertySelection[];
};

function published(id: string): string {
    return id.replace(/^drafts\./, '');
}

function libraryKey(category: string, slug: string): string {
    return `${category.trim().toLowerCase()}\0${slug.trim().toLowerCase()}`;
}

function findLibraryOption(
    byKey: Map<string, CompatibilityLibraryOption>,
    category: string,
    optionSlug: string,
): CompatibilityLibraryOption | undefined {
    return byKey.get(libraryKey(category, optionSlug));
}

/**
 * Map parsed URL selections onto library options and rules type ids.
 */
export function resolveCompatibilitySelections(
    query: CompatibilityQuery,
    libraryItems: CompatibilityLibraryOption[],
    rules: PreparedRules | null,
): ResolveCompatibilitySelectionsResult {
    const byKey = new Map<string, CompatibilityLibraryOption>();
    for (const item of libraryItems) {
        byKey.set(libraryKey(item.categoryValue, item.slug), item);
    }

    const selected: ResolvedCompatibilitySelection[] = [];
    const unknownSelections: CompatibilitySelectedOption[] = [];

    for (const sel of query.selections) {
        const item = findLibraryOption(byKey, sel.category, sel.optionSlug);
        if (!item) {
            unknownSelections.push({
                optionId: '',
                typeId: '',
                category: sel.category,
                optionSlug: sel.optionSlug,
            });
            continue;
        }
        const optionId = published(item._id);
        const typeId =
            rules?.optionDocs.get(optionId)?.typeId?.trim() ||
            rules?.optionDocs.get(item._id)?.typeId?.trim() ||
            '';
        selected.push({
            optionId,
            typeId,
            category: item.categoryValue,
            optionSlug: item.slug,
            title: item.title,
        });
    }

    const properties: ResolvedCompatibilityProperty[] = [];
    const unknownProperties: CompatibilityPropertySelection[] = [];

    for (const prop of query.properties) {
        let lib: CompatibilityLibraryOption | undefined;
        if (prop.optionSlug) {
            lib = findLibraryOption(byKey, prop.category, prop.optionSlug);
        } else {
            const inCategory = selected.filter(
                (s) => s.category === prop.category,
            );
            if (inCategory.length === 1) {
                lib = findLibraryOption(
                    byKey,
                    inCategory[0]!.category,
                    inCategory[0]!.optionSlug,
                );
            }
        }

        if (!lib) {
            unknownProperties.push(prop);
            continue;
        }

        const allowed = new Set(
            (lib.attrs[prop.propertyKey] ?? []).map((v) => v.trim()),
        );
        const keptValueSlugs =
            allowed.size === 0
                ? [...prop.valueSlugs]
                : prop.valueSlugs.filter((v) => allowed.has(v));
        const droppedValueSlugs =
            allowed.size === 0
                ? []
                : prop.valueSlugs.filter((v) => !allowed.has(v));

        properties.push({
            category: lib.categoryValue,
            optionSlug: lib.slug,
            propertyKey: prop.propertyKey,
            valueSlugs: prop.valueSlugs,
            optionId: published(lib._id),
            keptValueSlugs,
            droppedValueSlugs,
        });
    }

    return {selected, unknownSelections, properties, unknownProperties};
}
