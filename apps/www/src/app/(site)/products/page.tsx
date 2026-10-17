import type {Metadata} from 'next';
import {Suspense} from 'react';

import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {
    ProductCatalogPageChrome,
    ProductCatalogPanelLoading,
} from '@/components/product/product-catalog-page-loading';
import {ProductCatalogView} from '@/components/product/product-catalog-view';
import {
    getProductCatalogPage,
    listProductLibrary,
} from '@/lib/catalog/catalog';
import {
    PRODUCT_CATALOG_COPY_FALLBACKS,
    resolveCatalogPageCopy,
    type ResolvedCatalogPageCopy,
} from '@/lib/catalog/catalog-page-copy';

/** ISR floor — keep literal for Next.js (PROD-2456). */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
    const page = await getProductCatalogPage();
    const copy = resolveCatalogPageCopy(page, PRODUCT_CATALOG_COPY_FALLBACKS);
    return {
        title: copy.metaTitle,
        description: copy.metaDescription,
    };
}

async function ProductCatalogGrid({copy}: {copy: ResolvedCatalogPageCopy}) {
    const library = await listProductLibrary();

    return (
        <ProductCatalogView
            library={library}
            urlSync
            showPageChrome={false}
            searchPlaceholder={copy.searchPlaceholder}
            emptyMessage={copy.emptyMessage}
            resetLabel={copy.resetLabel}
            productLineFacetLabel={copy.productLineFacetLabel}
        />
    );
}

async function ProductCatalogPageSections() {
    const page = await getProductCatalogPage();
    const sections = (page?.sections ?? null) as PageSection[] | null;
    if (!sections?.length) return null;

    return <SectionRenderer sections={sections} />;
}

export default async function ProductsIndexPage() {
    const page = await getProductCatalogPage();
    const copy = resolveCatalogPageCopy(page, PRODUCT_CATALOG_COPY_FALLBACKS);

    return (
        <>
            <ProductCatalogPageChrome heading={copy.h1} intro={copy.intro} />
            <Suspense
                fallback={<ProductCatalogPanelLoading />}
            >
                <ProductCatalogGrid copy={copy} />
            </Suspense>
            <Suspense fallback={null}>
                <ProductCatalogPageSections />
            </Suspense>
        </>
    );
}
