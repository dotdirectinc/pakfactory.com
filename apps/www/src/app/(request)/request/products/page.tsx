import type {Metadata} from 'next';
import {BriefBuilderLazy} from '@/components/request/brief-builder-lazy';
import {RequestHomeV2Entry} from '@/components/request-v2/request-v2-entry';
import {RFQ_V2_ENABLED} from '@/lib/request-v2/flag';
import {REQUEST_FORM_RULES} from '@/lib/request/request-rules';
import {listRequestServiceOptions} from '@/lib/request/service-options';

export const metadata: Metadata = {
    title: 'Product quote',
    robots: {index: false, follow: false},
};

export default async function RequestProductsPage() {
    const serviceOptions = await listRequestServiceOptions();
    // RFQ v2 (flag): the items request page (/request/products?step=…).
    if (RFQ_V2_ENABLED) {
        return <RequestHomeV2Entry kind="product" serviceOptions={serviceOptions} rules={REQUEST_FORM_RULES} />;
    }
    return (
        <BriefBuilderLazy mode="products" serviceOptions={serviceOptions} />
    );
}
