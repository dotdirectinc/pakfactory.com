import type {Metadata} from 'next';
import {
    PRODUCT_CATALOG_PAGE_QUERY,
    type CatalogIndexPageDoc,
} from '@pakfactory/sanity/queries';

import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {ProductCatalogView} from '@/components/product/product-catalog-view';
import {listProductLibrary} from '@/lib/catalog/catalog';
import {getSanityClient} from '@/lib/sanity/client';
import {isSanityConfigured} from '@/lib/sanity/env';

/** ISR floor — keep literal for Next.js (PROD-2456). */
export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Products',
    description: 'Browse packaging products and styles.',
};

async function fetchProductCatalogPage(): Promise<CatalogIndexPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        const client = await getSanityClient();
        return await client.fetch<CatalogIndexPageDoc | null>(
            PRODUCT_CATALOG_PAGE_QUERY,
        );
    } catch {
        return null;
    }
}

export default async function ProductsIndexPage() {
    const [library, page] = await Promise.all([
        listProductLibrary(),
        fetchProductCatalogPage(),
    ]);
    const sections = (page?.sections ?? null) as PageSection[] | null;

    return (
        <>
            <ProductCatalogView library={library} urlSync />
            <SectionRenderer sections={sections} />
        </>
    );
}
