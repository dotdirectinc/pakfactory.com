import type {Metadata} from 'next';
import {ExpressEntry} from '@/components/request/express-entry';
import {RequestHomeV2Entry} from '@/components/request-v2/request-v2-entry';
import {RFQ_V2_ENABLED} from '@/lib/request-v2/flag';
import {REQUEST_FORM_RULES} from '@/lib/request/request-rules';
import {listRequestServiceOptions} from '@/lib/request/service-options';

export const metadata: Metadata = {
    title: 'Get a quote',
    robots: {index: false, follow: false},
};

export default async function RequestExpressPage() {
    const serviceOptions = await listRequestServiceOptions();
    // RFQ v2 (flag): the general request page (/request/general?step=…); door hints are read from the URL.
    if (RFQ_V2_ENABLED) {
        return <RequestHomeV2Entry kind="general" serviceOptions={serviceOptions} rules={REQUEST_FORM_RULES} />;
    }
    return <ExpressEntry serviceOptions={serviceOptions} />;
}
