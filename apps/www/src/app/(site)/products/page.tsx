import type {Metadata} from 'next';
import {ProductCatalogView} from '@/components/product/product-catalog-view';
import {listProductLibrary} from '@/lib/catalog/catalog';

/** ISR floor — keep literal for Next.js (PROD-2456). */
export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Products',
    description: 'Browse packaging products and styles.',
};

export default async function ProductsIndexPage() {
    const library = await listProductLibrary();
    return <ProductCatalogView library={library} urlSync />;
}
