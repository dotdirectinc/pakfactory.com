import type {Metadata} from 'next';

import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {CustomizationCatalogView} from '@/components/customization/customization-catalog-view';
import {
    getCustomizationCatalogPage,
    listCustomizations,
} from '@/lib/catalog/catalog';

/** ISR floor — keep literal for Next.js (PROD-2456). */
export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Customizations',
};

export default async function CustomizationsIndexPage() {
    const [library, page] = await Promise.all([
        listCustomizations(),
        getCustomizationCatalogPage(),
    ]);
    const sections = (page?.sections ?? null) as PageSection[] | null;

    return (
        <>
            <CustomizationCatalogView library={library} urlSync />
            <SectionRenderer sections={sections} />
        </>
    );
}
