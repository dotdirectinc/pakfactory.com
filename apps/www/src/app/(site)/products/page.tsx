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

/** ISR floor — keep literal for Next.js (PROD-2456). */
export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Products',
    description: 'Browse packaging products and styles.',
};

async function ProductsCatalogBody() {
    const [library, page] = await Promise.all([
        listProductLibrary(),
        getProductCatalogPage(),
    ]);
    const sections = (page?.sections ?? null) as PageSection[] | null;

    return (
        <>
            <ProductCatalogView library={library} urlSync showPageChrome={false} />
            <SectionRenderer sections={sections} />
        </>
    );
}

export default function ProductsIndexPage() {
    return (
        <>
            <ProductCatalogPageChrome />
            <Suspense fallback={<ProductCatalogPanelLoading />}>
                <ProductsCatalogBody />
            </Suspense>
        </>
    );
}
