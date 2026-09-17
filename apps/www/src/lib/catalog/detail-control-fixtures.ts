import type {
    CustomizationDeclaredProperty,
    CustomizationDetail,
    CustomizationPropertyValue,
} from '@/lib/catalog/types';

/**
 * Temporary selectable property values for configurator rail QA (PROD-1299).
 * White Lined Corrugated Board has `hasPage` but empty `properties` in Sanity
 * until Type declarations + Option values are authored.
 * TODO(PROD-1299): remove once Corrugated Board declares selectable properties
 * and this option states values in Studio.
 */
const WHITE_LINED_SLUG = 'white-lined-corrugated-board';

function solidSwatch(hex: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${hex}"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const DECLARED: CustomizationDeclaredProperty[] = [
    {
        usage: 'selectable',
        propertyId: 'ag-color-r2304',
        propertySlug: 'color',
        propertyTitle: 'Color',
        valuesPerItem: 'one',
    },
    {
        usage: 'selectable',
        propertyId: 'ag-finish-r2304',
        propertySlug: 'finish-type',
        propertyTitle: 'Finish Type',
        valuesPerItem: 'one',
    },
];

const PROPERTIES: CustomizationPropertyValue[] = [
    {
        id: 'attr-col-white-r2304',
        title: 'White',
        slug: 'color-white',
        propertyId: 'ag-color-r2304',
        propertySlug: 'color',
        propertyTitle: 'Color',
        valuesPerItem: 'one',
        imageUrl: solidSwatch('#F5F5F0'),
        imageAlt: 'White',
        facts: [],
    },
    {
        id: 'attr-col-brown-r2304',
        title: 'Natural Brown',
        slug: 'color-brown',
        propertyId: 'ag-color-r2304',
        propertySlug: 'color',
        propertyTitle: 'Color',
        valuesPerItem: 'one',
        imageUrl: solidSwatch('#C4A574'),
        imageAlt: 'Natural Brown',
        facts: [],
    },
    {
        id: 'attr-col-black-r2304',
        title: 'Black',
        slug: 'color-black',
        propertyId: 'ag-color-r2304',
        propertySlug: 'color',
        propertyTitle: 'Color',
        valuesPerItem: 'one',
        imageUrl: solidSwatch('#1A1A1A'),
        imageAlt: 'Black',
        facts: [],
    },
    {
        id: 'attr-ft-gloss-r2304',
        title: 'Gloss',
        slug: 'finish-gloss',
        propertyId: 'ag-finish-r2304',
        propertySlug: 'finish-type',
        propertyTitle: 'Finish Type',
        valuesPerItem: 'one',
        facts: [],
    },
    {
        id: 'attr-ft-matte-r2304',
        title: 'Matte',
        slug: 'finish-matte',
        propertyId: 'ag-finish-r2304',
        propertySlug: 'finish-type',
        propertyTitle: 'Finish Type',
        valuesPerItem: 'one',
        facts: [],
    },
    {
        id: 'attr-ft-soft-r2304',
        title: 'Soft Touch',
        slug: 'finish-soft-touch',
        propertyId: 'ag-finish-r2304',
        propertySlug: 'finish-type',
        propertyTitle: 'Finish Type',
        valuesPerItem: 'one',
        facts: [],
    },
];

/**
 * Merge fixture selectable fields when Sanity has none yet.
 * Real CMS properties always win.
 */
export function applyDetailControlFixtures(
    detail: CustomizationDetail,
): CustomizationDetail {
    if (detail.slug !== WHITE_LINED_SLUG) return detail;
    if (detail.properties.length > 0) return detail;

    return {
        ...detail,
        declaredProperties: DECLARED,
        properties: PROPERTIES,
    };
}
