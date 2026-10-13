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
import {
    CUSTOMIZATION_CATALOG_COPY_FALLBACKS,
    resolveCatalogPageCopy,
    type ResolvedCatalogPageCopy,
} from '@/lib/catalog/catalog-page-copy';

/** ISR floor — keep literal for Next.js (PROD-2456). */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
    const page = await getCustomizationCatalogPage();
    const copy = resolveCatalogPageCopy(
        page,
        CUSTOMIZATION_CATALOG_COPY_FALLBACKS,
    );
    return {
        title: copy.metaTitle,
        description: copy.metaDescription,
    };
}

async function CustomizationCatalogGrid({
    copy,
}: {
    copy: ResolvedCatalogPageCopy;
}) {
    const library = await listCustomizations();

    return (
        <CustomizationCatalogView
            library={library}
            urlSync
            showPageChrome={false}
            searchPlaceholder={copy.searchPlaceholder}
            emptyMessage={copy.emptyMessage}
            resetLabel={copy.resetLabel}
            productLineFacetLabel={copy.productLineFacetLabel}
            categoryHint={copy.categoryHint}
        />
    );
}

async function CustomizationCatalogPageSections() {
    const page = await getCustomizationCatalogPage();
    const sections = (page?.sections ?? null) as PageSection[] | null;
    if (!sections?.length) return null;

    return <SectionRenderer sections={sections} />;
}

export default async function CustomizationsIndexPage() {
    const page = await getCustomizationCatalogPage();
    const copy = resolveCatalogPageCopy(
        page,
        CUSTOMIZATION_CATALOG_COPY_FALLBACKS,
    );

    return (
        <>
            <CustomizationCatalogPageChrome
                heading={copy.h1}
                intro={copy.intro}
            />
            <Suspense fallback={<CustomizationCatalogPanelLoading />}>
                <CustomizationCatalogGrid copy={copy} />
            </Suspense>
            <Suspense fallback={null}>
                <CustomizationCatalogPageSections />
            </Suspense>
        </>
    );
}
