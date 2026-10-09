import type {
    CustomizationDetail,
    CustomizationPropertyFact,
    CustomizationPropertyValue,
    PropertyControlKind,
} from '@/lib/catalog/types';
import {
    isCustomColorSlug,
    swatchColorForSlug,
} from '@/lib/catalog/swatch-colors';

export type PropertyValuesPerItem = 'one' | 'many';

export type PropertyFieldOption = {
    id: string;
    title: string;
    imageUrl?: string | null;
    imageAlt?: string;
    /** Design-system CSS var when no image (e.g. var(--swatch-gold)). */
    color?: string;
    /** Custom Color wheel / consultation treatment. */
    appearance?: 'customColor';
    /** Heading slug this shade points at (kindOf). */
    kindOfSlug?: string;
    kindOfTitle?: string;
    facts?: CustomizationPropertyFact[];
};

/** Customer control kinds rendered by OptionPropertyControllers. */
export type PropertyFieldKind = PropertyControlKind;

export type PropertyFieldDescriptor = {
    /** Property slug or id used as selection key. */
    propertyKey: string;
    label: string;
    valuesPerItem: PropertyValuesPerItem;
    kind: PropertyFieldKind;
    options: PropertyFieldOption[];
};

const MULTI_VALUE_KINDS = new Set<PropertyFieldKind>([
    'chip',
    'listbox',
    'toggles',
]);

function groupKey(value: CustomizationPropertyValue): string | null {
    return value.propertySlug?.trim() || value.propertyId?.trim() || null;
}

function inferControl(options: PropertyFieldOption[]): 'swatch' | 'chip' {
    return options.some(
        (o) =>
            Boolean(o.imageUrl) ||
            Boolean(o.color) ||
            o.appearance === 'customColor',
    )
        ? 'swatch'
        : 'chip';
}

function resolveValuesPerItem(
    kind: PropertyFieldKind,
    declared: PropertyValuesPerItem | undefined,
): PropertyValuesPerItem {
    if (!MULTI_VALUE_KINDS.has(kind)) return 'one';
    return declared ?? 'one';
}

/**
 * Map a customization Option detail → selectable Property fields.
 * Stated declared Properties are excluded. Control comes from the type’s
 * declared row when set; otherwise image/color still infer swatch vs chip.
 * Skips a field when its only value title matches the option title (echo).
 */
export function mapDetailToPropertyFields(
    detail: CustomizationDetail,
): PropertyFieldDescriptor[] {
    const optionTitle = detail.title.trim().toLowerCase();
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
        const label =
            declaredMatch?.propertyTitle?.trim() ||
            values.find((v) => v.propertyTitle)?.propertyTitle?.trim() ||
            propertyKey;
        const options: PropertyFieldOption[] = values.map((v) => {
            const imageUrl = v.imageUrl;
            const hasImage = Boolean(imageUrl);
            const isCustom = isCustomColorSlug(v.slug);
            const color =
                hasImage || isCustom
                    ? undefined
                    : swatchColorForSlug(v.slug);
            return {
                id: v.slug,
                title: v.title,
                ...(imageUrl !== undefined ? {imageUrl} : {}),
                ...(v.imageAlt ? {imageAlt: v.imageAlt} : {}),
                ...(color ? {color} : {}),
                ...(isCustom ? {appearance: 'customColor' as const} : {}),
                ...(v.kindOfSlug ? {kindOfSlug: v.kindOfSlug} : {}),
                ...(v.kindOfTitle ? {kindOfTitle: v.kindOfTitle} : {}),
                ...(v.facts.length > 0 ? {facts: v.facts} : {}),
            };
        });
        // Sole value that only restates the option name — hide from Configuration.
        if (
            options.length === 1 &&
            options[0]!.title.trim().toLowerCase() === optionTitle
        ) {
            continue;
        }

        const kind: PropertyFieldKind =
            declaredMatch?.control ?? inferControl(options);
        const valuesPerItem = resolveValuesPerItem(
            kind,
            declaredMatch?.valuesPerItem,
        );

        fields.push({
            propertyKey,
            label,
            valuesPerItem,
            kind,
            options,
        });
    }

    // Dimension / Pantone do not need authored Property Values — emit from the
    // declaration alone when the option has no values for that property.
    const emitted = new Set(fields.map((f) => f.propertyKey));
    for (const row of declared) {
        if (row.usage !== 'selectable') continue;
        if (row.control !== 'dimension' && row.control !== 'pantone') continue;
        const propertyKey =
            row.propertySlug?.trim() || row.propertyId?.trim();
        if (!propertyKey || emitted.has(propertyKey)) continue;
        fields.push({
            propertyKey,
            label: row.propertyTitle?.trim() || propertyKey,
            valuesPerItem: 'one',
            kind: row.control,
            options: [],
        });
        emitted.add(propertyKey);
    }

    return fields;
}

/** Summary display kind: swatches keep swatch; everything else is a chip. */
export function summaryKindForField(
    kind: PropertyFieldKind,
): 'swatch' | 'chip' {
    return kind === 'swatch' || kind === 'swatchShades' ? 'swatch' : 'chip';
}
