import type {
    CustomizationDetail,
    CustomizationPropertyValue,
} from '@/lib/catalog/types';

export type PropertyValuesPerItem = 'one' | 'many';

export type PropertyFieldOption = {
    id: string;
    title: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

export type PropertyFieldDescriptor = {
    /** Property slug or id used as selection key. */
    propertyKey: string;
    label: string;
    valuesPerItem: PropertyValuesPerItem;
    kind: 'swatch' | 'chip';
    options: PropertyFieldOption[];
};

function groupKey(value: CustomizationPropertyValue): string | null {
    return value.propertySlug?.trim() || value.propertyId?.trim() || null;
}

/**
 * Map a customization Option detail → selectable Property fields.
 * Stated declared Properties are excluded. Shared ui property controllers only.
 */
export function mapDetailToPropertyFields(
    detail: CustomizationDetail,
): PropertyFieldDescriptor[] {
    const declared = detail.declaredProperties;
    const hasDeclared = declared.length > 0;
    const selectableKeys = new Set(
        declared
            .filter((d) => d.usage === 'selectable')
            .map((d) => d.propertySlug?.trim() || d.propertyId?.trim())
            .filter((k): k is string => Boolean(k)),
    );

    const groups = new Map<string, CustomizationPropertyValue[]>();
    for (const value of detail.properties) {
        const key = groupKey(value);
        if (!key) continue;
        if (hasDeclared && !selectableKeys.has(key)) continue;
        const list = groups.get(key) ?? [];
        list.push(value);
        groups.set(key, list);
    }

    const fields: PropertyFieldDescriptor[] = [];
    for (const [propertyKey, values] of groups) {
        if (values.length === 0) continue;
        const declaredMatch = declared.find(
            (d) =>
                d.propertySlug === propertyKey || d.propertyId === propertyKey,
        );
        const valuesPerItem: PropertyValuesPerItem =
            declaredMatch?.valuesPerItem ??
            values.find((v) => v.valuesPerItem)?.valuesPerItem ??
            'one';
        const label =
            declaredMatch?.propertyTitle?.trim() ||
            values.find((v) => v.propertyTitle)?.propertyTitle?.trim() ||
            propertyKey;
        const options: PropertyFieldOption[] = values.map((v) => ({
            id: v.slug,
            title: v.title,
            ...(v.imageUrl !== undefined ? {imageUrl: v.imageUrl} : {}),
            ...(v.imageAlt ? {imageAlt: v.imageAlt} : {}),
        }));
        const kind = options.some((o) => Boolean(o.imageUrl))
            ? 'swatch'
            : 'chip';
        fields.push({
            propertyKey,
            label,
            valuesPerItem,
            kind,
            options,
        });
    }

    return fields;
}
