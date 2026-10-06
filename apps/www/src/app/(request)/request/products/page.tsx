import type {Metadata} from 'next';
import {BriefBuilderLazy} from '@/components/request/brief-builder-lazy';
import {listRequestServiceOptions} from '@/lib/request/service-options';

export const metadata: Metadata = {
    title: 'Product quote',
    robots: {index: false, follow: false},
};

export default async function RequestProductsPage() {
    const serviceOptions = await listRequestServiceOptions();
    return (
        <BriefBuilderLazy mode="products" serviceOptions={serviceOptions} />
    );
}
