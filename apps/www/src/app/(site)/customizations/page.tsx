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

async function CustomizationCatalogGrid() {
    const library = await listCustomizations();

    return (
        <CustomizationCatalogView
            library={library}
            urlSync
            showPageChrome={false}
        />
    );
}

async function CustomizationCatalogPageSections() {
    const page = await getCustomizationCatalogPage();
    const sections = (page?.sections ?? null) as PageSection[] | null;
    if (!sections?.length) return null;

    return <SectionRenderer sections={sections} />;
}

export default function CustomizationsIndexPage() {
    return (
        <>
            <CustomizationCatalogPageChrome />
            <Suspense fallback={<CustomizationCatalogPanelLoading />}>
                <CustomizationCatalogGrid />
            </Suspense>
            <Suspense fallback={null}>
                <CustomizationCatalogPageSections />
            </Suspense>
        </>
    );
}
