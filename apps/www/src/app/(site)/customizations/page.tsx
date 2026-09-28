import type {Metadata} from 'next';
import {Suspense} from 'react';

import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {
    CustomizationCatalogPageChrome,
    CustomizationCatalogPanelLoading,
} from '@/components/customization/customization-catalog-page-loading';
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

async function CustomizationsCatalogBody() {
    const [library, page] = await Promise.all([
        listCustomizations(),
        getCustomizationCatalogPage(),
    ]);
    const sections = (page?.sections ?? null) as PageSection[] | null;

    return (
        <>
            <CustomizationCatalogView
                library={library}
                urlSync
                showPageChrome={false}
            />
            <SectionRenderer sections={sections} />
        </>
    );
}

export default function CustomizationsIndexPage() {
    return (
        <>
            <CustomizationCatalogPageChrome />
            <Suspense fallback={<CustomizationCatalogPanelLoading />}>
                <CustomizationsCatalogBody />
            </Suspense>
        </>
    );
}
