import type {Metadata} from 'next';
import {ProductCatalogView} from '@/components/product/product-catalog-view';
import {listLines} from '@/lib/catalog/catalog';

export const metadata: Metadata = {
    title: 'Products',
    description: 'Browse packaging product lines and styles.',
};

export default function ProductsIndexPage() {
    return <ProductCatalogView lines={listLines()} />;
}
