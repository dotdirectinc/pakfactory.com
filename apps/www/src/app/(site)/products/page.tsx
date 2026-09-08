import type {Metadata} from 'next';
import {ProductCatalogView} from '@/components/product/product-catalog-view';
import {listLines} from '@/lib/catalog/catalog';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Products',
    description: 'Browse packaging product lines and styles.',
};

export default async function ProductsIndexPage() {
    const lines = await listLines();
    return <ProductCatalogView lines={lines} />;
}
