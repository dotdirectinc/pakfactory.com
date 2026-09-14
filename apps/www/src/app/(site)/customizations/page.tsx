import type {Metadata} from 'next';

import {CustomizationCatalogView} from '@/components/customization/customization-catalog-view';
import {listCustomizations} from '@/lib/catalog/catalog';

/** ISR floor — keep literal for Next.js (PROD-2456). */
export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Customizations',
};

export default async function CustomizationsIndexPage() {
    const library = await listCustomizations();
    return <CustomizationCatalogView library={library} urlSync />;
}
