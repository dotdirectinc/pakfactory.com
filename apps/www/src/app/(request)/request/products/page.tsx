import type {Metadata} from 'next';
import {BriefBuilderLazy} from '@/components/request/brief-builder-lazy';

export const metadata: Metadata = {
    title: 'Product quote',
    robots: {index: false, follow: false},
};

export default function RequestProductsPage() {
    return <BriefBuilderLazy mode="products" />;
}
