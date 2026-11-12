import type {Metadata} from 'next';
import {RequestHomeEntry} from '@/components/request-sections/request-entry';
import {REQUEST_FORM_RULES} from '@/lib/request/request-rules';
import {listRequestServiceOptions} from '@/lib/request/service-options';

export const metadata: Metadata = {
    title: 'Get a quote',
    robots: {index: false, follow: false},
};

export default async function RequestExpressPage() {
    const serviceOptions = await listRequestServiceOptions();
    // Door hints are read from the URL on the general request page (/request/general?from=…).
    return <RequestHomeEntry kind="general" serviceOptions={serviceOptions} rules={REQUEST_FORM_RULES} />;
}
