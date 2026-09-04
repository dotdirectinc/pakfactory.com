import type {Metadata} from 'next';

import {
    CustomizationCatalogView,
    type CustomizationCatalogTab,
} from '@/components/customization/customization-catalog-view';
import {listCustomizationCategories} from '@/lib/catalog/catalog';

export const metadata: Metadata = {
    title: 'Customization',
};

function tabsFromItems(
    items: {categoryValue: string; categoryLabel?: string}[],
): CustomizationCatalogTab[] {
    const seen = new Map<string, string>();
    for (const item of items) {
        if (!seen.has(item.categoryValue)) {
            seen.set(
                item.categoryValue,
                item.categoryLabel ?? item.categoryValue,
            );
        }
    }
    const tabs = [...seen.entries()].map(([value, label]) => ({
        label,
        value,
    }));
    if (tabs.length > 0) return tabs;
    return [
        {label: 'Material', value: 'material'},
        {label: 'Finish', value: 'finish'},
    ];
}

export default async function CustomizationsIndexPage() {
    const items = await listCustomizationCategories();
    return (
        <CustomizationCatalogView tabs={tabsFromItems(items)} items={items} />
    );
}
