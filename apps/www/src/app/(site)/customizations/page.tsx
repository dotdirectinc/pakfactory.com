import type {Metadata} from 'next';

import {
    CustomizationCatalogView,
    type CustomizationCatalogTab,
} from '@/components/customization/customization-catalog-view';
import {listCustomizationCategories} from '@/lib/catalog/catalog';

export const metadata: Metadata = {
    title: 'Customization',
};

const TABS: CustomizationCatalogTab[] = [
    {label: 'Material', value: 'material'},
    {label: 'Finish', value: 'finish'},
];

export default function CustomizationsIndexPage() {
    return (
        <CustomizationCatalogView
            tabs={TABS}
            items={listCustomizationCategories()}
        />
    );
}
