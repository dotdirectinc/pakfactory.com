import type {Metadata} from 'next';

import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
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

export default async function ProductsIndexPage() {
    const [library, page] = await Promise.all([
        listProductLibrary(),
        getProductCatalogPage(),
    ]);
    const sections = (page?.sections ?? null) as PageSection[] | null;

    return (
        <>
            <ProductCatalogView library={library} urlSync />
            <SectionRenderer sections={sections} />
        </>
    );
}
