import type {Metadata} from 'next';
import {RequestHomeEntry} from '@/components/request-sections/request-entry';
import {REQUEST_FORM_RULES} from '@/lib/request/request-rules';
import {listRequestServiceOptions} from '@/lib/request/service-options';

export const metadata: Metadata = {
    title: 'Product quote',
    robots: {index: false, follow: false},
};

export default async function RequestProductsPage() {
    const serviceOptions = await listRequestServiceOptions();
    return <RequestHomeEntry kind="product" serviceOptions={serviceOptions} rules={REQUEST_FORM_RULES} />;
}
